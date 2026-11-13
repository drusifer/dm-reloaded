import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { crc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/lzx_extract.py');
const ARCHIVE = resolve(process.cwd(), 'public/assets/extracted/dm2/DM2_archive.LZX');
const hasPython = spawnSync('python3', ['--version']).status === 0;

function run(args: string[]) {
  const r = spawnSync('python3', ['-I', SCRIPT, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

/** Builds a one-entry stored (method 0) archive with a valid header CRC. */
function storedArchive(name: string, content: Buffer): Buffer {
  const nameBytes = Buffer.from(name, 'latin1');
  const header = Buffer.alloc(31);
  header.writeUInt32LE(content.length, 2);
  header.writeUInt32LE(content.length, 6);
  header[10] = 10;
  header[11] = 0;
  header.writeUInt32LE(crc32(content), 22);
  header[30] = nameBytes.length;
  const headerCrc = crc32(Buffer.concat([header, nameBytes]));
  header.writeUInt32LE(headerCrc, 26);
  const top = Buffer.alloc(10);
  top.write('LZX');
  return Buffer.concat([top, header, nameBytes, content]);
}

describe.skipIf(!hasPython)('S7-1 LZX extractor', () => {
  it('extracts a stored entry and verifies its CRC', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lzx-'));
    const archive = join(dir, 'a.lzx');
    writeFileSync(archive, storedArchive('hello.txt', Buffer.from('hello lzx')));
    const out = join(dir, 'out');
    const r = run([archive, out]);
    expect(r.code).toBe(0);
    expect(readFileSync(join(out, 'hello.txt'), 'utf8')).toBe('hello lzx');
  });

  it('refuses a corrupted entry and writes nothing for it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lzx-'));
    const bytes = storedArchive('bad.txt', Buffer.from('payload'));
    bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 0xff;
    const archive = join(dir, 'a.lzx');
    writeFileSync(archive, bytes);
    const out = join(dir, 'out');
    const r = run([archive, out]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL bad\.txt: data CRC mismatch/);
    expect(existsSync(join(out, 'bad.txt'))).toBe(false);
  });

  it('refuses a damaged header and unsafe paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lzx-'));
    const damaged = storedArchive('x.txt', Buffer.from('data'));
    damaged[10 + 2] = (damaged[10 + 2] ?? 0) ^ 0x01; // flip a size bit: header CRC no longer matches
    const a1 = join(dir, 'damaged.lzx');
    writeFileSync(a1, damaged);
    const r1 = run([a1, join(dir, 'o1')]);
    expect(r1.code).toBe(1);
    expect(r1.out).toMatch(/header CRC mismatch/);

    for (const evil of ['../evil.txt', '/abs.txt']) {
      const a2 = join(dir, 'evil.lzx');
      writeFileSync(a2, storedArchive(evil, Buffer.from('x')));
      const out = join(dir, 'o2');
      const r2 = run([a2, out]);
      expect(r2.code).toBe(1);
      expect(r2.out).toMatch(/unsafe path/);
      expect(existsSync(resolve(out, '..', 'evil.txt'))).toBe(false);
    }
    expect(run(['/nonexistent.lzx', join(dir, 'o3')]).code).not.toBe(0);
  });

  it.skipIf(!existsSync(ARCHIVE))('lists all 35 real DM2 entries with zero failures', () => {
    const r = run([ARCHIVE, '--list']);
    expect(r.code).toBe(0);
    expect(r.out.match(/^ok /gm)).toHaveLength(35);
    expect(r.out).toMatch(/GRAPHICS\.DAT 3493879 bytes crc=e645fe23/);
    expect(r.out).toMatch(/DUNGEON\.DAT 39411 bytes/);
  }, 20_000);

  it.skipIf(!existsSync(ARCHIVE))('one flipped byte inside a packed stream fails only that entry', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lzx-'));
    const bytes = readFileSync(ARCHIVE);
    bytes[2_000_000] = (bytes[2_000_000] ?? 0) ^ 0xff; // inside GRAPHICS.DAT's packed stream
    const archive = join(dir, 'tampered.lzx');
    writeFileSync(archive, bytes);
    const out = join(dir, 'out');
    const r = run([archive, out]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL GRAPHICS\.DAT/);
    expect(existsSync(join(out, 'GRAPHICS.DAT'))).toBe(false);
    expect(readdirSync(out).length).toBeGreaterThan(5);
  }, 20_000);
});
