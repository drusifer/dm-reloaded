/** Validate complete source containers and publish only owned local export artifacts. */
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rmdir, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type { SpriteExport, SpriteManifestEntry } from './spriteExport';

/** The runtime parser may return a partial map; reject incomplete record tables first. */
export function validateGraphicsContainer(bytes:Uint8Array):number[] {
  if(bytes.length<2) throw new Error('Invalid graphics.dat header: source is too short.');
  const raw=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength),count=raw.readUInt16BE(0),header=2+count*4;
  if(count===0||header>bytes.length) throw new Error('Invalid graphics.dat header: record table is incomplete.');
  if(count<=562)throw new Error('Missing original palette record 562; provide the complete extracted graphics.dat archive instead of fallback colors.');
  const expected:number[]=[];let offset=header;
  for(let index=0;index<count;index++) {
    const size=raw.readUInt16BE(2+index*2);
    if(offset+size>bytes.length) throw new Error(`Truncated graphics.dat record ${index}; provide the complete extracted archive.`);
    if(index===562&&size<1470)throw new Error('Incomplete original palette record 562; provide the complete extracted graphics.dat archive instead of fallback colors.');
    if(index<=532||index===538||index===548) expected.push(index);
    offset+=size;
  }
  if(offset!==bytes.length) throw new Error('Unexpected trailing graphics.dat data; provide the normalized extracted archive.');
  return expected;
}
export function assertDecodedSpriteCompleteness(expected:readonly number[],sprites:ReadonlyMap<number,unknown>):void {
  for(const index of expected) if(!sprites.has(index)) throw new Error(`Invalid sprite record ${index}; refusing a partial graphics.dat export.`);
}
const hash=(bytes:Uint8Array):string=>createHash('sha256').update(bytes).digest('hex');
const inside=(root:string,path:string):boolean=>{const rel=relative(root,path);return rel===''||(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith(`..${process.platform==='win32'?'\\':'/'}`));};
async function info(path:string):Promise<Awaited<ReturnType<typeof lstat>>|null> {
  try{return await lstat(path);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
}
async function directory(path:string,buildRoot:string):Promise<string> {
  if(!inside(buildRoot,resolve(path)))throw new Error(`Output directory escapes its owned build subtree: ${path}`);
  const current=await info(path);
  if(current&&!current.isDirectory()&&!current.isSymbolicLink())throw new Error(`Output path is not a directory: ${path}`);
  if(!current)await mkdir(path);
  const canonical=await realpath(path);
  if(!inside(buildRoot,canonical))throw new Error(`Output symlink escapes the ignored build tree: ${path}`);
  return canonical;
}
async function exportDirectory(projectRoot:string,requested:string):Promise<string> {
  const project=await realpath(projectRoot),buildRoot=join(project,'build'),absolute=resolve(project,requested);
  if(absolute===buildRoot||!inside(buildRoot,absolute))throw new Error('Export output must be a dedicated directory inside the ignored build tree.');
  const buildInfo=await info(buildRoot);
  if(buildInfo?.isSymbolicLink())throw new Error('The build directory must not be a symlink.');
  if(!buildInfo)await mkdir(buildRoot);
  if(!((await lstat(buildRoot)).isDirectory()))throw new Error('The build output root is not a directory.');
  let current=buildRoot;
  for(const part of relative(buildRoot,absolute).split(/[\\/]/))current=await directory(join(current,part),buildRoot);
  if(current===buildRoot)throw new Error('Export output must resolve to a dedicated directory below the build root.');
  return current;
}
function ownedEntries(value:unknown):readonly SpriteManifestEntry[] {
  const manifest=value as {schemaVersion?:number;source?:{sha256?:string};transparency?:{policy?:string};sprites?:SpriteManifestEntry[]};
  if(!manifest||manifest.schemaVersion!==1||!manifest.source||!/^[a-f0-9]{64}$/.test(manifest.source.sha256??'')||manifest.transparency?.policy!=='raw-index-0'||!Array.isArray(manifest.sprites))throw new Error('Unowned or invalid manifest.json; choose a new output directory.');
  const seen=new Set<string>(),indices=new Set<number>();
  for(const entry of manifest.sprites) {
    if(!entry||!Number.isSafeInteger(entry.index)||entry.index<0||!Number.isInteger(entry.width)||entry.width<=0||!Number.isInteger(entry.height)||entry.height<=0||!['ui','items','dungeon','unclassified'].includes(entry.category)||entry.path!==`${entry.category}/${entry.index}_${entry.width}x${entry.height}.png`||!/^[a-f0-9]{64}$/.test(entry.sha256)||seen.has(entry.path)||indices.has(entry.index))throw new Error('Unowned or unsafe export manifest paths; choose a new output directory.');
    seen.add(entry.path);indices.add(entry.index);
  }
  return manifest.sprites;
}

/** Stage artifacts, preserve unrelated files, and publish the manifest only after its PNGs. */
export async function publishSpriteExport(result:SpriteExport,options:{projectRoot:string;outputDirectory:string}):Promise<string> {
  const output=await exportDirectory(options.projectRoot,options.outputDirectory),manifestPath=join(output,'manifest.json');
  const oldManifestInfo=await info(manifestPath);
  if(oldManifestInfo&&(oldManifestInfo.isSymbolicLink()||!oldManifestInfo.isFile()))throw new Error('Unowned or symlink manifest.json cannot be replaced.');
  let previous:readonly SpriteManifestEntry[]=[];
  if(oldManifestInfo) {
    try{previous=ownedEntries(JSON.parse(await readFile(manifestPath,'utf8')));}catch(error){throw new Error(`Unowned export manifest: ${(error as Error).message}`);}
  }
  const owned=new Map(previous.map(entry=>[entry.path,entry]));
  const paths=new Map<string,string>();
  for(const entry of [...previous,...result.manifest.sprites]) {
    const categoryPath=join(output,entry.category);
    if((await info(categoryPath))?.isSymbolicLink())throw new Error(`Export category directories must not be symlinks: ${entry.category}`);
    const folder=await directory(categoryPath,output);
    const path=join(folder,`${entry.index}_${entry.width}x${entry.height}.png`);
    const current=await info(path);
    if(current) {
      if(current.isSymbolicLink()||!current.isFile())throw new Error(`Unowned or symlink export collision: ${entry.path}`);
      const old=owned.get(entry.path);
      if(!old)throw new Error(`Unowned file would be overwritten: ${entry.path}`);
      if(hash(await readFile(path))!==old.sha256)throw new Error(`Modified exported file would be overwritten: ${entry.path}`);
    }
    paths.set(entry.path,path);
  }
  const stage=await mkdtemp(join(output,'.export-sprites-')),staged:string[]=[];
  try {
    for(const [path,bytes] of result.pngFiles) {
      const temporary=join(stage,randomUUID());staged.push(temporary);await writeFile(temporary,bytes,{flag:'wx'});
      // Final destinations were preflighted before any publication.
      paths.set(`stage:${path}`,temporary);
    }
    const manifestStage=join(stage,'manifest.json');staged.push(manifestStage);await writeFile(manifestStage,result.manifestJson,{flag:'wx'});
    for(const entry of result.manifest.sprites)await rename(paths.get(`stage:${entry.path}`)!,paths.get(entry.path)!);
    await rename(manifestStage,manifestPath);
    for(const entry of previous) if(!result.pngFiles.has(entry.path)&&await info(paths.get(entry.path)!))await unlink(paths.get(entry.path)!);
  } finally {
    for(const path of staged)if(await info(path))await unlink(path);
    await rmdir(stage);
  }
  return output;
}
