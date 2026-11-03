/** Real review CLI failure evidence must invalidate stale success and preserve local aliases. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, rename, rm, rmdir, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createGraphicsExportFixture } from './graphicsExportFixture';
const repo=process.cwd(),evidence=join(repo,'build','sprite-export-review'),roots:string[]=[];
const script=resolve(repo,'scripts/review-sprite-export.mjs');
async function isolatedEvidence(work:(root:string)=>Promise<void>):Promise<void> {
  await mkdir(join(repo,'build'),{recursive:true});
  const root=await mkdtemp(join(repo,'build','qa-review-safety-'));roots.push(root);
  const backup=join(root,'saved-evidence');let hadEvidence=false;
  try {
    const info=await lstat(evidence);
    if(!info.isDirectory()||info.isSymbolicLink()) throw new Error('Refusing to replace unrelated review evidence path.');
    await rename(evidence,backup);hadEvidence=true;
  } catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  await mkdir(evidence);
  try {await work(root);} finally {
    await rm(evidence,{recursive:true,force:true});
    if(hadEvidence)await rename(backup,evidence);
  }
}
afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
function review(args:string[]) {return spawnSync(process.execPath,[script,...args],{cwd:repo,encoding:'utf8',timeout:20000});}
function independentCrc(bytes:Uint8Array):number {
  let value=0xffffffff;
  for(const byte of bytes) {value^=byte;for(let bit=0;bit<8;bit++)value=(value&1)?(value>>>1)^0xedb88320:value>>>1;}
  return (value^0xffffffff)>>>0;
}
describe('independent review CLI evidence safety',()=>{
  it('turns a previous passed report into failed evidence for an actual missing-manifest invocation',async()=>{
    await isolatedEvidence(async root=>{
      await writeFile(join(evidence,'report.json'),JSON.stringify({schemaVersion:1,passed:true,status:'passed',spritesVerified:535}));
      const failed=review(['--output',join(root,'missing-export')]);
      expect(failed.status).toBe(1);expect(failed.stderr).toContain('Cannot read export manifest');
      const report=JSON.parse(await readFile(join(evidence,'report.json'),'utf8'));
      expect(report.passed).toBe(false);expect(report.status).toBe('failed');
      expect(report.error).toContain('export-sprites first');expect(report.spritesVerified).toBeUndefined();
    });
  });
  it('keeps existing review evidence byte-identical when requesting CLI help',async()=>{
    await isolatedEvidence(async root=>{
      const before=Buffer.from('{"passed":true,"sentinel":"keep exactly"}\n');
      await writeFile(join(evidence,'report.json'),before);
      const help=review(['--output',join(root,'missing-export'),'--help']);
      expect(help.status).toBe(0);expect(help.stdout).toContain('does not re-export');
      expect(await readFile(join(evidence,'report.json'))).toEqual(before);
    });
  });
  it('rejects a report-file symlink without changing its unrelated target',async()=>{
    await isolatedEvidence(async root=>{
      const target=join(root,'unrelated.json');await writeFile(target,'keep');
      await symlink(target,join(evidence,'report.json'));
      const failed=review(['--output',join(root,'missing-export')]);
      expect(failed.status).toBe(1);expect(failed.stderr).toMatch(/symlink/i);
      expect(await readFile(target,'utf8')).toBe('keep');
    });
  });
  it('rejects an evidence-directory symlink without writing through it',async()=>{
    await isolatedEvidence(async root=>{
      await rmdir(evidence);const target=join(root,'unrelated-dir');await mkdir(target);
      await writeFile(join(target,'keep.txt'),'keep');await symlink(target,evidence);
      const failed=review(['--output',join(root,'missing-export')]);
      expect(failed.status).toBe(1);expect(failed.stderr).toMatch(/symlink/i);
      expect(await readFile(join(target,'keep.txt'),'utf8')).toBe('keep');
      await expect(readFile(join(target,'report.json'))).rejects.toMatchObject({code:'ENOENT'});
    });
  });
  it.each(['PLTE','tRNS'])('rejects altered unused %s in valid PNG metadata before browser startup',async type=>{
    await isolatedEvidence(async root=>{
      const input=join(root,'source.dat'),output=join(root,'exports');
      await writeFile(input,createGraphicsExportFixture());
      const exported=spawnSync(process.execPath,[resolve(repo,'scripts/export-sprites.mjs'),'--input',input,'--output',output],{cwd:repo,encoding:'utf8',timeout:20000});
      expect(exported.status,exported.stderr).toBe(0);
      const manifest=JSON.parse(await readFile(join(output,'manifest.json'),'utf8'));
      const entry=manifest.sprites[0] as {path:string;sha256:string};
      const file=join(output,entry.path),png=await readFile(file);let mutated=false;
      for(let at=8;at<png.length;) {
        const length=png.readUInt32BE(at);
        if(png.toString('ascii',at+4,at+8)===type) {
          // Only indices0/1 occur in the fixture. Index15 metadata must still match the original policy.
          png[at+8+(type==='PLTE'?45:15)]!^=1;
          png.writeUInt32BE(independentCrc(png.subarray(at+4,at+8+length)),at+8+length);
          mutated=true;break;
        }
        at+=length+12;
      }
      expect(mutated).toBe(true);await writeFile(file,png);
      entry.sha256=createHash('sha256').update(png).digest('hex');
      await writeFile(join(output,'manifest.json'),JSON.stringify(manifest));
      const failed=review(['--input',input,'--output',output]);
      expect(failed.status).toBe(1);
      expect(failed.stderr).toMatch(type==='PLTE'?/PLTE|palette/i:/tRNS|transparen/i);
      expect(failed.stderr).not.toContain('Playwright runner unavailable');
      const report=JSON.parse(await readFile(join(evidence,'report.json'),'utf8'));
      expect(report.passed).toBe(false);expect(report.status).toBe('failed');
    });
  });

});
