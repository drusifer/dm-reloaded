import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GDAT_TRANSPARENT, creatureIds, creatureName, decodeGdatImage, decodeGdatText, keyOf, listGdatImages,
  parseDungeonDat, parseGdat, recordEntry
} from '../../src/data';
import type { GdatKey } from '../../src/data';

const GRAPHICS = resolve(process.cwd(), 'public/assets/extracted/dm2/GRAPHICS.DAT');
const DUNGEON = resolve(process.cwd(), 'public/assets/extracted/dm2/DUNGEON.DAT');

function buildGdat(
  records: [GdatKey, number][],
  entries: Uint8Array[],
  bigEndian = true
): Uint8Array {
  const count = 1 + entries.length;
  const cb0 = 0x14 + 8 * records.length;
  const w16 = (v: number): number[] => (bigEndian ? [v >> 8, v & 255] : [v & 255, v >> 8]);
  const w32 = (v: number): number[] => (bigEndian
    ? [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]
    : [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]);
  const e0 = new Uint8Array(cb0);
  e0[2] = records.length >> 8;
  e0[3] = records.length & 255;
  records.forEach(([key, value], i) => {
    e0.set(key, 0x14 + 8 * i);
    e0[0x14 + 8 * i + 6] = value >> 8;
    e0[0x14 + 8 * i + 7] = value & 255;
  });
  const header = [...w16(0x8005), ...w16(count), ...w32(cb0), ...entries.flatMap((e) => w16(e.length))];
  const out = new Uint8Array(header.length + cb0 + entries.reduce((s, e) => s + e.length, 0));
  out.set(header, 0);
  out.set(e0, header.length);
  let o = header.length + cb0;
  for (const e of entries) {
    out.set(e, o);
    o += e.length;
  }
  return out;
}

function scramble(text: string): Uint8Array {
  const bytes = [...text].map((c, i) => ((c.charCodeAt(0) ^ 0xff) - i) & 0xff);
  return Uint8Array.from([...bytes, ((0 ^ 0xff) - bytes.length) & 0xff]);
}

/** 4x2 primary image: row0 1,2,2,2 / row1 2,2,9,9 using colour, duration, copy-above and explicit codes. */
function syntheticImage(extra: number[] = []): Uint8Array {
  const body = [0x12, 0x34, 0x56, 0x09, 0x26, 0xf9, 0x00, ...extra];
  return Uint8Array.from([0, 4, 0, 2, ...body, ...Array.from({ length: 16 }, (_, i) => i)]);
}

describe('S8-1 GDAT container (synthetic)', () => {
  const text = scramble('BAT');
  const image = syntheticImage();
  const records: [GdatKey, number][] = [
    [keyOf(0x0f, 3, 5, 0, 0xf0, 0), 1],
    [keyOf(0x0f, 3, 1, 0, 0, 0), 2],
    [keyOf(0x0f, 3, 11, 0, 0, 7), 77]
  ];

  it('parses container, directory, text and an inline value', () => {
    const r = parseGdat(buildGdat(records, [text, image]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.gdat.entryCount).toBe(3);
    expect(r.gdat.records).toHaveLength(3);
    expect(r.gdat.textEncoded).toBe(true);
    expect(creatureName(r.gdat, 3)).toBe('BAT');
    expect(creatureName(r.gdat, 4)).toBeUndefined();
    expect(creatureIds(r.gdat)).toEqual([3]);
    const inline = r.gdat.find(keyOf(0x0f, 3, 11, 0, 0, 7));
    expect(inline?.value).toBe(77);
    expect(recordEntry(r.gdat, inline!)).toBeUndefined();
    expect(listGdatImages(r.gdat)).toEqual([{ key: [0x0f, 3, 1, 0, 0, 0], entryIndex: 2 }]);
  });

  it('parses a little-endian file too', () => {
    // Entry sizes and header words are LE; entry 0 internals stay big-endian by format.
    const r = parseGdat(buildGdat(records, [text, image], false));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.gdat.bigEndian).toBe(false);
  });

  it('rejects damaged containers with typed reasons and never throws', () => {
    const good = buildGdat(records, [text, image]);
    const reason = (b: Uint8Array) => { const r = parseGdat(b); return r.ok ? 'OK' : r.reason; };
    expect(reason(new Uint8Array(4))).toBe('TOO_SMALL');
    expect(reason(new Uint8Array(64))).toBe('BAD_MAGIC');
    expect(reason(good.subarray(0, good.length - 1))).toBe('SIZE_MISMATCH');
    expect(reason(Uint8Array.from([...good, 0]))).toBe('SIZE_MISMATCH');
    const badCb0 = good.slice();
    badCb0[4] = 0; badCb0[5] = 0; badCb0[6] = 0; badCb0[7] = 4;
    expect(reason(badCb0)).toBe('BAD_SIZES');
    const noDir = good.slice();
    const e0 = 8 + 2 * 2;
    noDir[e0 + 2] = 0; noDir[e0 + 3] = 0;
    expect(reason(noDir)).toBe('BAD_DIRECTORY');
    const tooMany = good.slice();
    tooMany[e0 + 2] = 1; tooMany[e0 + 3] = 0;
    expect(reason(tooMany)).toBe('BAD_DIRECTORY');
    for (let i = 0; i < good.length; i++) expect(() => parseGdat(good.subarray(0, i))).not.toThrow();
  });

  it('decodes text both ways and shows unknown codes as ?', () => {
    expect(decodeGdatText(scramble('AXE'), true)).toBe('AXE');
    expect(decodeGdatText(Uint8Array.from([65, 66, 0, 67]), false)).toBe('AB');
    expect(decodeGdatText(Uint8Array.from([65, 1, 10, 66]), false)).toBe('A?\nB');
  });
});

describe('S8-3 image decoder (synthetic)', () => {
  const asGdat = (entry: Uint8Array) => {
    const r = parseGdat(buildGdat([[keyOf(1, 0, 1, 0, 0, 0), 1]], [entry]));
    if (!r.ok) throw new Error('fixture failed');
    return r.gdat;
  };

  it('decodes colour, duration, copy-above and explicit codes into indexed pixels', () => {
    const img = decodeGdatImage(asGdat(syntheticImage()), 1);
    expect(img).not.toBeNull();
    expect(img!.plane).toBe('PRIMARY');
    expect([img!.width, img!.height]).toEqual([4, 2]);
    expect(Array.from(img!.pixels)).toEqual([1, 2, 2, 2, 2, 2, 9, 9]);
    expect(Array.from(img!.paletteTail)).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });

  it('rejects truncated, over-long, bad-size and flagged entries without throwing', () => {
    const decode = (e: Uint8Array) => decodeGdatImage(asGdat(e), 1);
    expect(decode(syntheticImage([0xaa]))).toBeNull(); // leftover byte
    const short = syntheticImage();
    expect(decode(Uint8Array.from([...short.slice(0, 8), ...short.slice(short.length - 16)]))).toBeNull(); // stream ends early
    expect(decode(Uint8Array.from([0, 0, 0, 2, ...syntheticImage().slice(4)]))).toBeNull(); // zero width
    expect(decode(Uint8Array.from([0x80, 4, 0x80, 2, ...syntheticImage().slice(4)]))).toBeNull(); // unsupported flag
    expect(decodeGdatImage(asGdat(syntheticImage()), 5)).toBeNull();
    expect(decodeGdatImage(asGdat(syntheticImage()), -1)).toBeNull();
    const big = syntheticImage();
    big[0] = 0x03; big[1] = 0xff; big[2] = 0x03; big[3] = 0xff; // 1023x1023 but tiny stream
    expect(decode(big)).toBeNull();
  });

  it('decodes a secondary overlay plane with transparent pixels', () => {
    // 5 palette nibbles, local[5] implicitly 0: n1=5 means transparent "still" for 1 pixel, then explicit colour 7.
    const nibbles = [1, 2, 3, 4, 5, 5, 7, 7];
    const body: number[] = [];
    for (let i = 0; i < nibbles.length; i += 2) body.push((nibbles[i]! << 4) | (nibbles[i + 1] ?? 0));
    const entry = Uint8Array.from([0, 2, 0, 1, ...body, ...new Array<number>(16).fill(0)]);
    const img = decodeGdatImage(asGdat(entry), 1);
    // The primary attempt must fail (it would consume a 6th palette nibble and misread); secondary succeeds.
    expect(img?.plane).toBe('SECONDARY');
    expect(Array.from(img!.pixels)).toEqual([GDAT_TRANSPARENT, 7]);
  });
});

describe.skipIf(!existsSync(GRAPHICS))('S8-1..3 real DM2 GRAPHICS.DAT facts', () => {
  const bytes = new Uint8Array(readFileSync(GRAPHICS));
  const parsed = parseGdat(bytes);
  if (!parsed.ok) throw new Error(`real GDAT failed: ${parsed.reason}`);
  const gdat = parsed.gdat;

  it('has the documented container arithmetic and directory', () => {
    expect(bytes.length).toBe(3493879);
    expect(gdat.bigEndian).toBe(true);
    expect(gdat.entryCount).toBe(4630);
    expect(gdat.records).toHaveLength(10045);
    expect(8 + 2 * 4629 + 80380 + 3404233).toBe(bytes.length);
    expect(gdat.textEncoded).toBe(true);
    const byCategory = new Map<number, number>();
    for (const r of gdat.records) byCategory.set(r.key[0], (byCategory.get(r.key[0]) ?? 0) + 1);
    expect(byCategory.get(15)).toBe(3653);
    expect(byCategory.get(9)).toBe(1233);
  });

  it('reads creature names and covers every creature id used by DUNGEON.DAT', () => {
    expect(creatureName(gdat, 0)).toBe('THORN DEMON');
    expect(creatureName(gdat, 2)).toBe('VORTEX');
    expect(creatureName(gdat, 4)).toBe('BUSH');
    expect(creatureIds(gdat)).toContain(87);
    if (existsSync(DUNGEON)) {
      const buf = new Uint8Array(readFileSync(DUNGEON));
      const u16 = (o: number) => (buf[o]! << 8) | buf[o + 1]!;
      const counts = Array.from({ length: 16 }, (_, i) => u16(12 + 2 * i));
      const sizes = [4, 6, 4, 8, 16, 4, 4, 4, 4, 8, 4, 0, 0, 0, 8, 4];
      const columns = parseDungeonDat(buf).dungeon.levels.reduce((s, l) => s + l.width, 0);
      const base = 44 + 44 * 16 + columns * 2 + u16(10) * 2 + u16(6) * 2;
      const creatureStart = base + counts.slice(0, 4).reduce((s, c, i) => s + c * sizes[i]!, 0);
      const missing = new Set<number>();
      for (let i = 0; i < counts[4]!; i++) {
        const type = buf[creatureStart + i * 16 + 4]!;
        if (!creatureName(gdat, type)) missing.add(type);
      }
      expect([...missing]).toEqual([]);
    }
  });

  it('decodes all 3,011 distinct image entries (4,758 records) with the encoding self-check', () => {
    const images = listGdatImages(gdat);
    expect(gdat.records.filter((r) => r.key[2] === 1)).toHaveLength(4758);
    let primary = 0;
    let secondary = 0;
    let failures = 0;
    for (const ref of images) {
      const img = decodeGdatImage(gdat, ref.entryIndex);
      if (!img) failures++;
      else if (img.plane === 'PRIMARY') primary++;
      else secondary++;
    }
    expect(failures).toBe(0);
    expect(primary + secondary).toBe(images.length);
    expect(images).toHaveLength(3011);
    expect(primary).toBe(2060);
    expect(secondary).toBe(951);
  });
});
