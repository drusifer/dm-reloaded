/** Filesystem/input boundaries for local-only sprite export. */
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createGraphicsExportFixture } from './graphicsExportFixture';
import { createCleanRoomGraphicsBundle } from '../../src/data/graphicsDatParser';
import { createSpriteExport } from '../../src/tools/spriteExport';
import { publishSpriteExport, validateGraphicsContainer, assertDecodedSpriteCompleteness } from '../../src/tools/spriteExportWriter';
const roots:string[]=[];
async function project():Promise<string> {const root=await mkdtemp(join(tmpdir(),'sprite-export-'));roots.push(root);return root;}
afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
function plan(index=17) {
 const graphics={...createCleanRoomGraphicsBundle(),source:'AMIGA_GRAPHICS_DAT' as const,
  sprites:new Map([[index,{index,width:2,height:1,pixels:new Uint8Array([0,1])}]])};
 return createSpriteExport(graphics,{fileName:'graphics.dat',bytes:new Uint8Array([1,2,3])});
}
function archive():Uint8Array {return createGraphicsExportFixture();}
describe('export input completeness',()=>{
 it('accepts a complete normalized archive and rejects late record overrun/trailing data',()=>{
  expect(validateGraphicsContainer(archive())).toHaveLength(535);
  expect(()=>validateGraphicsContainer(archive().subarray(0,archive().length-1))).toThrow(/truncated.*562/i);
  expect(()=>validateGraphicsContainer(new Uint8Array([...archive(),0]))).toThrow(/trailing/i);
  expect(()=>validateGraphicsContainer(new Uint8Array([0,2,0,1]))).toThrow(/header/i);
 });
 it('rejects a declared short palette record instead of accepting runtime fallback colors',()=>{
  const count=563,raw=Buffer.alloc(2+count*4);raw.writeUInt16BE(count,0);
  expect(()=>validateGraphicsContainer(raw)).toThrow(/incomplete original palette record 562/i);
  expect(validateGraphicsContainer(archive())).toHaveLength(535);
 });
 it('rejects archives omitting record562 instead of accepting fallback palettes',()=>{
  const omitted=new Uint8Array([0,1,0,6,0,6,0,2,0,1,0,1]);
  expect(()=>validateGraphicsContainer(omitted)).toThrow(/missing original palette record 562/i);
 });
 it('rejects a parser map missing a declared raw sprite rather than publishing partial success',()=>{
  expect(()=>assertDecodedSpriteCompleteness([0],new Map())).toThrow(/sprite.*0/i);
 });
});
describe('owned local export publication',()=>{
 it('writes portable files and deterministic manifests while preserving unrelated sentinels',async()=>{
  const root=await project(),out=join(root,'build','sprites'),result=plan();
  await mkdir(out,{recursive:true});await writeFile(join(out,'notes.txt'),'keep');
  await publishSpriteExport(result,{projectRoot:root,outputDirectory:out});
  const first=await readFile(join(out,'manifest.json'));
  expect(first.toString()).toBe(result.manifestJson);
  expect(await readFile(join(out,result.manifest.sprites[0]!.path))).toEqual(Buffer.from(result.pngFiles.values().next().value!));
  await publishSpriteExport(result,{projectRoot:root,outputDirectory:out});
  expect(await readFile(join(out,'manifest.json'))).toEqual(first);
  expect(await readFile(join(out,'notes.txt'),'utf8')).toBe('keep');
 });
 it('rejects output outside build and symlink escapes without changing their files',async()=>{
  const root=await project(),outside=join(root,'outside');await mkdir(outside);await writeFile(join(outside,'sentinel'),'keep');
  await expect(publishSpriteExport(plan(),{projectRoot:root,outputDirectory:outside})).rejects.toThrow(/build/i);
  await mkdir(join(root,'build'));await symlink(outside,join(root,'build','escape'));
  await expect(publishSpriteExport(plan(),{projectRoot:root,outputDirectory:join(root,'build','escape')})).rejects.toThrow(/build|symlink/i);
  expect(await readFile(join(outside,'sentinel'),'utf8')).toBe('keep');
 });
 it('rejects an output alias resolving to the build root itself',async()=>{
  const root=await project(),build=join(root,'build');await mkdir(build);await writeFile(join(build,'sentinel'),'keep');
  await symlink(build,join(build,'alias'));
  await expect(publishSpriteExport(plan(),{projectRoot:root,outputDirectory:join(build,'alias')})).rejects.toThrow(/dedicated.*below.*build/i);
  expect(await readFile(join(build,'sentinel'),'utf8')).toBe('keep');
  await expect(readFile(join(build,'manifest.json'))).rejects.toMatchObject({code:'ENOENT'});
 });
 it('rejects a category symlink into another build subtree',async()=>{
  const root=await project(),out=join(root,'build','sprites'),other=join(root,'build','other');
  await mkdir(out,{recursive:true});await mkdir(other);await symlink(other,join(out,'ui'));
  await expect(publishSpriteExport(plan(),{projectRoot:root,outputDirectory:out})).rejects.toThrow(/symlink|subtree/i);
  await expect(readFile(join(other,'17_2x1.png'))).rejects.toMatchObject({code:'ENOENT'});
 });
 it('rejects category aliases even inside output and duplicate legacy indices',async()=>{
  const root=await project(),out=join(root,'build','sprites');await mkdir(join(out,'alias'),{recursive:true});await symlink(join(out,'alias'),join(out,'ui'));
  await expect(publishSpriteExport(plan(),{projectRoot:root,outputDirectory:out})).rejects.toThrow(/symlink/i);
  const clean=join(root,'build','clean');const result=plan();await publishSpriteExport(result,{projectRoot:root,outputDirectory:clean});
  const duplicate={...result.manifest,sprites:[...result.manifest.sprites,{...result.manifest.sprites[0]!,width:3,path:'ui/17_3x1.png'}]};
  await writeFile(join(clean,'manifest.json'),JSON.stringify(duplicate));
  await expect(publishSpriteExport(result,{projectRoot:root,outputDirectory:clean})).rejects.toThrow(/manifest/i);
 });
 it('rejects unowned collisions and modified previously exported art',async()=>{
  const root=await project(),out=join(root,'build','sprites'),result=plan();
  await mkdir(join(out,'ui'),{recursive:true});await writeFile(join(out,'ui/17_2x1.png'),'handmade');
  await expect(publishSpriteExport(result,{projectRoot:root,outputDirectory:out})).rejects.toThrow(/unowned/i);
  expect(await readFile(join(out,'ui/17_2x1.png'),'utf8')).toBe('handmade');
  const clean=join(root,'build','owned');await publishSpriteExport(result,{projectRoot:root,outputDirectory:clean});
  await writeFile(join(clean,'ui/17_2x1.png'),'edited');
  await expect(publishSpriteExport(result,{projectRoot:root,outputDirectory:clean})).rejects.toThrow(/modified/i);
  expect(await readFile(join(clean,'ui/17_2x1.png'),'utf8')).toBe('edited');
 });
 it('rejects category file symlinks and removes only unchanged stale manifest-owned PNGs',async()=>{
  const root=await project(),out=join(root,'build','sprites');
  await publishSpriteExport(plan(),{projectRoot:root,outputDirectory:out});
  await publishSpriteExport(plan(25),{projectRoot:root,outputDirectory:out});
  await expect(readFile(join(out,'ui/17_2x1.png'))).rejects.toMatchObject({code:'ENOENT'});
  const bad=join(root,'build','bad');await mkdir(join(bad,'ui'),{recursive:true});
  const sentinel=join(root,'sentinel');await writeFile(sentinel,'keep');await symlink(sentinel,join(bad,'ui/17_2x1.png'));
  await expect(publishSpriteExport(plan(),{projectRoot:root,outputDirectory:bad})).rejects.toThrow(/symlink|unowned/i);
  expect(await readFile(sentinel,'utf8')).toBe('keep');
 });
});
