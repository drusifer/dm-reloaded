/** Exercise real process argv, source failure and publication without a mocked CLI. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createGraphicsExportFixture } from './graphicsExportFixture';
const repo=process.cwd(),script=resolve(repo,'scripts/export-sprites.mjs'),fixtures:string[]=[];
const archive=createGraphicsExportFixture();
async function fixture():Promise<{dir:string;input:string;output:string}> {
 await mkdir(join(repo,'build'),{recursive:true});const dir=await mkdtemp(join(repo,'build','export-cli-test-'));fixtures.push(dir);
 const input=join(dir,'source with spaces.dat');await writeFile(input,archive);return {dir,input,output:join(dir,'sprites with spaces')};
}
function cli(args:string[]) {return spawnSync(process.execPath,[script,...args],{cwd:repo,encoding:'utf8',timeout:20000});}
const hash=(bytes:Uint8Array):string=>createHash('sha256').update(bytes).digest('hex');
afterEach(async()=>{for(const dir of fixtures.splice(0))await rm(dir,{recursive:true,force:true});});
describe('actual sprite export CLI',()=>{
 it('shows help without opening the supplied nonexistent source and rejects malformed argv',()=>{
  const help=cli(['--input','does-not-exist.dat','--help']);expect(help.status).toBe(0);expect(help.stdout).toContain('index0 alpha0');
  const bad=cli(['--input']);expect(bad.status).toBe(1);expect(bad.stderr).toContain('--input needs a path');
 });
 it('exports a minimal complete archive, handles spaces and reruns deterministically without touching source or sentinels',async()=>{
  const f=await fixture(),args=['--input',f.input,'--output',f.output];
  const first=cli(args);expect(first.status,first.stderr).toBe(0);expect(first.stdout).toContain('Exported 535 indexed PNG');
  const manifest=await readFile(join(f.output,'manifest.json')),parsed=JSON.parse(manifest.toString());
  expect(parsed.sprites).toHaveLength(535);expect(parsed.source.sha256).toBe(hash(archive));
  await writeFile(join(f.output,'keep.txt'),'keep');
  const again=cli(args);expect(again.status,again.stderr).toBe(0);
  expect(await readFile(join(f.output,'manifest.json'))).toEqual(manifest);
  expect(await readFile(f.input)).toEqual(Buffer.from(archive));expect(await readFile(join(f.output,'keep.txt'),'utf8')).toBe('keep');
 });
 it.skipIf(!existsSync(join(repo,'public/assets/extracted/dm1/graphics.dat')))('reexports all535 supplied original sprites deterministically and preserves input/sentinel',async()=>{
  const f=await fixture(),input=join(repo,'public/assets/extracted/dm1/graphics.dat'),beforeSource=hash(await readFile(input));
  const args=['--input',input,'--output',f.output];const first=cli(args);expect(first.status,first.stderr).toBe(0);
  const manifest=await readFile(join(f.output,'manifest.json')),parsed=JSON.parse(manifest.toString()) as {sprites:{path:string}[]};
  expect(parsed.sprites).toHaveLength(535);
  const before=await Promise.all(parsed.sprites.map(async entry=>hash(await readFile(join(f.output,entry.path)))));
  await writeFile(join(f.output,'keep.txt'),'keep');const repeated=cli(args);expect(repeated.status,repeated.stderr).toBe(0);
  expect(await readFile(join(f.output,'manifest.json'))).toEqual(manifest);
  expect(await Promise.all(parsed.sprites.map(async entry=>hash(await readFile(join(f.output,entry.path)))))).toEqual(before);
  expect(hash(await readFile(input))).toBe(beforeSource);expect(await readFile(join(f.output,'keep.txt'),'utf8')).toBe('keep');
 },20000);
 it('fails missing and truncated sources before changing a previous successful export',async()=>{
  const f=await fixture();expect(cli(['--input',f.input,'--output',f.output]).status).toBe(0);
  const before=await readFile(join(f.output,'manifest.json'));
  const missing=cli(['--input',join(f.dir,'missing.dat'),'--output',f.output]);
  expect(missing.status).toBe(1);expect(missing.stderr).toContain('Cannot read graphics source');expect(missing.stderr).toContain('extract-assets');
  const bad=join(f.dir,'truncated.dat');await writeFile(bad,archive.subarray(0,archive.length-1));
  const corrupt=cli(['--input',bad,'--output',f.output]);expect(corrupt.status).toBe(1);expect(corrupt.stderr).toContain('Truncated graphics.dat record 562');
  expect(await readFile(join(f.output,'manifest.json'))).toEqual(before);expect(await readFile(f.input)).toEqual(Buffer.from(archive));
 });
});
