/** Independent AE5/6 regression evidence: real failed CLI calls and owned-path boundaries. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle, parseGraphicsDat } from '../../src/data/graphicsDatParser';
import { createSpriteExport } from '../../src/tools/spriteExport';
import { publishSpriteExport } from '../../src/tools/spriteExportWriter';
import { createGraphicsExportFixture, withDeclaredRecordSize } from './graphicsExportFixture';

const repo=process.cwd(),roots:string[]=[];
const archive=createGraphicsExportFixture();
async function fixture():Promise<string> {
  await mkdir(join(repo,'build'),{recursive:true});
  const root=await mkdtemp(join(repo,'build','qa-export-safety-'));roots.push(root);return root;
}
afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
function plan() {
  return createSpriteExport({...createCleanRoomGraphicsBundle(),source:'AMIGA_GRAPHICS_DAT',
    sprites:new Map([[17,{index:17,width:2,height:1,pixels:new Uint8Array([0,1])}]])},
  {fileName:'graphics.dat',bytes:archive});
}
function cli(input:string,output:string) {
  return spawnSync(process.execPath,[resolve(repo,'scripts/export-sprites.mjs'),'--input',input,'--output',output],
    {cwd:repo,encoding:'utf8',timeout:20000});
}
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
describe('independent exporter safety acceptance',()=>{
  it('rejects a later record overrun even though the reused parser returns an earlier sprite',async()=>{
    const root=await fixture(),input=join(root,'valid.dat'),output=join(root,'published');await writeFile(input,archive);
    expect(cli(input,output).status).toBe(0);
    const manifest=await readFile(join(output,'manifest.json'));
    const entry=JSON.parse(manifest.toString()).sprites[0] as {path:string};
    const png=await readFile(join(output,entry.path));
    // A full table and valid record0 survive, but record1 declares data beyond the archive.
    const partial=withDeclaredRecordSize(archive,1,65535);
    expect(parseGraphicsDat(partial).sprites.size).toBe(1);
    const bad=join(root,'late-overrun.dat');await writeFile(bad,partial);const before=hash(await readFile(bad));
    const failed=cli(bad,output);
    expect(failed.status).toBe(1);expect(failed.stderr).toMatch(/truncated.*record 1/i);
    expect(await readFile(join(output,'manifest.json'))).toEqual(manifest);
    expect(await readFile(join(output,entry.path))).toEqual(png);
    expect(hash(await readFile(bad))).toBe(before);
    expect(await readFile(input)).toEqual(Buffer.from(archive));
  });
  it('rejects a complete container with corrupt sprite opcodes instead of reporting partial success',async()=>{
    const root=await fixture(),input=join(root,'bad-rle.dat'),output=join(root,'not-published');
    await writeFile(input,createGraphicsExportFixture({0:Uint8Array.from([0,2,0,1,0xa0,0])}));
    const failed=cli(input,output);
    expect(failed.status).toBe(1);expect(failed.stderr).toMatch(/invalid sprite record 0/i);
    await expect(readFile(join(output,'manifest.json'))).rejects.toMatchObject({code:'ENOENT'});
  });
  it('fails an unreadable source path actionably without creating a false manifest',async()=>{
    const root=await fixture(),output=join(root,'not-published');
    const failed=cli(root,output);
    expect(failed.status).toBe(1);expect(failed.stderr).toContain('Cannot read graphics source');
    expect(failed.stderr).toContain('extract-assets');
    await expect(readFile(join(output,'manifest.json'))).rejects.toMatchObject({code:'ENOENT'});
  });
  it('rejects a category symlink into a sibling directory even when both live inside build',async()=>{
    const root=await fixture(),output=join(root,'build','sprites'),other=join(root,'build','unrelated');
    await mkdir(output,{recursive:true});await mkdir(other);await writeFile(join(other,'keep.txt'),'unrelated');
    await symlink(other,join(output,'ui'));
    await expect(publishSpriteExport(plan(),{projectRoot:root,outputDirectory:output})).rejects.toThrow(/symlink|owned/i);
    expect(await readdir(other)).toEqual(['keep.txt']);expect(await readFile(join(other,'keep.txt'),'utf8')).toBe('unrelated');
  });
  it('rejects an output alias resolving to the whole build root',async()=>{
    const root=await fixture(),build=join(root,'build');await mkdir(build);await writeFile(join(build,'keep.txt'),'keep');
    await symlink(build,join(build,'alias'));
    await expect(publishSpriteExport(plan(),{projectRoot:root,outputDirectory:join(build,'alias')})).rejects.toThrow(/dedicated|build/i);
    await expect(readFile(join(build,'manifest.json'))).rejects.toMatchObject({code:'ENOENT'});
    expect(await readFile(join(build,'keep.txt'),'utf8')).toBe('keep');
  });
  it.each(['../keep.txt','/tmp/outside-sprite.png','ui/../../keep.txt'])('rejects forged old-manifest path %s before writes or pruning',async unsafePath=>{
    const root=await fixture(),output=join(root,'build','sprites'),result=plan();
    await publishSpriteExport(result,{projectRoot:root,outputDirectory:output});
    const entry=result.manifest.sprites[0]!;const png=await readFile(join(output,entry.path));
    await writeFile(join(root,'keep.txt'),'outside');
    const forged=JSON.stringify({...result.manifest,sprites:[{...entry,path:unsafePath}]});
    await writeFile(join(output,'manifest.json'),forged);
    await expect(publishSpriteExport(result,{projectRoot:root,outputDirectory:output})).rejects.toThrow(/unowned|unsafe/i);
    expect(await readFile(join(output,'manifest.json'),'utf8')).toBe(forged);
    expect(await readFile(join(output,entry.path))).toEqual(png);
    expect(await readFile(join(root,'keep.txt'),'utf8')).toBe('outside');
  });
  it.skipIf(!existsSync(join(repo,'public/assets/extracted/dm1/graphics.dat')))('rejects a missing declared original palette instead of silently exporting default colors',async()=>{
    const root=await fixture(),good=join(root,'valid.dat'),output=join(root,'published');
    await writeFile(good,archive);expect(cli(good,output).status).toBe(0);
    const beforeManifest=await readFile(join(output,'manifest.json'));
    const entry=JSON.parse(beforeManifest.toString()).sprites[0] as {path:string};
    const beforePng=await readFile(join(output,entry.path));
    const source=join(repo,'public/assets/extracted/dm1/graphics.dat'),original=await readFile(source),sourceHash=hash(original);
    const count=original.readUInt16BE(0);expect(count).toBeGreaterThan(562);
    let offset=2+count*4;for(let index=0;index<562;index++)offset+=original.readUInt16BE(2+index*2);
    const paletteSize=original.readUInt16BE(2+562*2);expect(paletteSize).toBeGreaterThanOrEqual(1470);
    // Remove only palette record562, updating both size tables so every remaining record still fits.
    const corrupt=Buffer.concat([original.subarray(0,offset),original.subarray(offset+paletteSize)]);
    corrupt.writeUInt16BE(0,2+562*2);corrupt.writeUInt16BE(0,2+count*2+562*2);
    expect(parseGraphicsDat(corrupt).sprites.size).toBe(535);
    const input=join(root,'missing-palette.dat');await writeFile(input,corrupt);const inputHash=hash(corrupt);
    const failed=cli(input,output);
    expect(failed.status).toBe(1);expect(failed.stderr).toMatch(/palette.*562|562.*palette|original palette/i);
    expect(await readFile(join(output,'manifest.json'))).toEqual(beforeManifest);
    expect(await readFile(join(output,entry.path))).toEqual(beforePng);
    expect(hash(await readFile(input))).toBe(inputHash);expect(hash(await readFile(source))).toBe(sourceHash);
  },20000);

  it.skipIf(!existsSync(join(repo,'public/assets/extracted/dm1/graphics.dat')))('rejects a table truncated before original palette562 even with all535 decoded sprites',async()=>{
    const root=await fixture(),source=join(repo,'public/assets/extracted/dm1/graphics.dat'),output=join(root,'published');
    const original=await readFile(source),sourceHash=hash(original);
    expect(cli(source,output).status).toBe(0);
    const beforeManifest=await readFile(join(output,'manifest.json'));
    const entries=JSON.parse(beforeManifest.toString()).sprites as {path:string}[];
    expect(entries).toHaveLength(535);
    const beforeHashes=await Promise.all(entries.map(async entry=>hash(await readFile(join(output,entry.path)))));
    const originalCount=original.readUInt16BE(0),count=562,oldHeader=2+originalCount*4;
    let end=oldHeader;for(let index=0;index<count;index++)end+=original.readUInt16BE(2+index*2);
    const truncated=Buffer.concat([Buffer.from([count>>>8,count&255]),
      original.subarray(2,2+count*2),original.subarray(2+originalCount*2,2+originalCount*2+count*2),
      original.subarray(oldHeader,end)]);
    expect(parseGraphicsDat(truncated).sprites.size).toBe(535);
    const input=join(root,'no-palette-record.dat');await writeFile(input,truncated);const inputHash=hash(truncated);
    const failed=cli(input,output);
    expect(failed.status).toBe(1);expect(failed.stderr).toMatch(/palette.*562|562.*palette|original palette/i);
    expect(await readFile(join(output,'manifest.json'))).toEqual(beforeManifest);
    expect(await Promise.all(entries.map(async entry=>hash(await readFile(join(output,entry.path)))))).toEqual(beforeHashes);
    expect(hash(await readFile(input))).toBe(inputHash);expect(hash(await readFile(source))).toBe(sourceHash);
  },20000);

});
