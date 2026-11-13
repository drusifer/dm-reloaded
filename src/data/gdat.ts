/**
 * Reader for the Dungeon Master II "GDAT" GRAPHICS.DAT container (container, directory, text, images).
 *
 * TLDR:
 *   parseGdat validates the container arithmetic (header + entry sizes must equal the file length) and builds
 *   a directory of 6-byte keys. decodeGdatText/creatureName read names. decodeGdatImage decodes the 4-bit
 *   nibble-RLE images to indexed pixels (0..15, 255 transparent). Colour is NOT decided here: the palette is
 *   still unidentified (see docs/DM2_DATA.md). Written independently from observed format facts.
 */

export type GdatKey = readonly [number, number, number, number, number, number];

export interface GdatRecord {
  readonly key: GdatKey;
  /** Entry index for binary classes (when in range), otherwise an inline value. */
  readonly value: number;
}

export type GdatFailure = 'TOO_SMALL' | 'BAD_MAGIC' | 'BAD_SIZES' | 'SIZE_MISMATCH' | 'BAD_DIRECTORY';

export interface Gdat {
  readonly bigEndian: boolean;
  readonly entryCount: number;
  readonly records: readonly GdatRecord[];
  /** True when text entries use the `((b + i) & 0xFF) ^ 0xFF` scrambling (auto-detected). */
  readonly textEncoded: boolean;
  entryBytes(index: number): Uint8Array | undefined;
  find(key: GdatKey): GdatRecord | undefined;
}

export type GdatParseResult =
  | { readonly ok: true; readonly gdat: Gdat }
  | { readonly ok: false; readonly reason: GdatFailure };

/** Directory classes (3rd key byte) whose value is an entry index when it is in range. */
const BINARY_CLASSES: ReadonlySet<number> = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14]);
export const GDAT_CLASS_IMAGE = 1;
export const GDAT_CLASS_TEXT = 5;
export const GDAT_CATEGORY_CREATURE = 0x0f;
const MAX_IMAGE_SIDE = 1023;

export function keyOf(...bytes: [number, number, number, number, number, number]): GdatKey {
  return bytes;
}

const keyString = (key: GdatKey): string => key.join(',');

export function decodeGdatText(bytes: Uint8Array, encoded: boolean): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    let x = bytes[i]!;
    if (encoded) x = ((x + i) & 0xff) ^ 0xff;
    if (x === 0) break;
    if (x === 0x0a) out += '\n';
    else out += x >= 0x20 && x < 0x7f ? String.fromCharCode(x) : '?';
  }
  return out;
}

function printableRatio(text: string): number {
  if (text.length === 0) return 0;
  let ok = 0;
  for (const ch of text) if (ch !== '?') ok++;
  return ok / text.length;
}

export function parseGdat(bytes: Uint8Array): GdatParseResult {
  if (bytes.length < 8) return { ok: false, reason: 'TOO_SMALL' };
  const be16 = (o: number): number => (bytes[o]! << 8) | bytes[o + 1]!;
  const le16 = (o: number): number => bytes[o]! | (bytes[o + 1]! << 8);
  let bigEndian: boolean;
  if (be16(0) === 0x8005 || be16(0) === 0x8004) bigEndian = true;
  else if (le16(0) === 0x8005 || le16(0) === 0x8004) bigEndian = false;
  else return { ok: false, reason: 'BAD_MAGIC' };
  const u16 = (o: number): number => (bigEndian ? be16(o) : le16(o));
  const u32 = (o: number): number => bigEndian
    ? ((bytes[o]! << 24) | (bytes[o + 1]! << 16) | (bytes[o + 2]! << 8) | bytes[o + 3]!) >>> 0
    : (bytes[o]! | (bytes[o + 1]! << 8) | (bytes[o + 2]! << 16) | (bytes[o + 3]! << 24)) >>> 0;

  const entryCount = u16(2);
  const entry0Size = u32(4);
  if (entryCount < 1 || entry0Size < 0x14) return { ok: false, reason: 'BAD_SIZES' };
  const headerSize = 8 + 2 * (entryCount - 1);
  if (bytes.length < headerSize) return { ok: false, reason: 'SIZE_MISMATCH' };

  const sizes: number[] = [entry0Size];
  for (let i = 1; i < entryCount; i++) sizes.push(u16(8 + 2 * (i - 1)));
  let total = headerSize;
  for (const size of sizes) total += size;
  if (total !== bytes.length) return { ok: false, reason: 'SIZE_MISMATCH' };

  const offsets: number[] = [];
  let cursor = headerSize;
  for (const size of sizes) {
    offsets.push(cursor);
    cursor += size;
  }

  // Entry 0 internals are always big-endian: u16 directory count at +2, 8-byte records from +0x14.
  const e0 = offsets[0]!;
  const maxRecords = Math.floor((entry0Size - 0x14) / 8);
  const declared = (bytes[e0 + 2]! << 8) | bytes[e0 + 3]!;
  if (declared < 1 || declared > maxRecords) return { ok: false, reason: 'BAD_DIRECTORY' };

  const records: GdatRecord[] = [];
  const index = new Map<string, GdatRecord>();
  for (let i = 0; i < declared; i++) {
    const o = e0 + 0x14 + 8 * i;
    const key: GdatKey = [bytes[o]!, bytes[o + 1]!, bytes[o + 2]!, bytes[o + 3]!, bytes[o + 4]!, bytes[o + 5]!];
    const record: GdatRecord = { key, value: (bytes[o + 6]! << 8) | bytes[o + 7]! };
    records.push(record);
    if (!index.has(keyString(key))) index.set(keyString(key), record);
  }

  const entryBytes = (i: number): Uint8Array | undefined =>
    Number.isInteger(i) && i >= 0 && i < entryCount ? bytes.subarray(offsets[i]!, offsets[i]! + sizes[i]!) : undefined;

  // Choose the text scrambling by sampling the first text entries.
  let encodedScore = 0;
  let plainScore = 0;
  let sampled = 0;
  for (const record of records) {
    if (record.key[2] !== GDAT_CLASS_TEXT || record.value >= entryCount) continue;
    const raw = entryBytes(record.value);
    if (!raw || raw.length < 3) continue;
    encodedScore += printableRatio(decodeGdatText(raw, true));
    plainScore += printableRatio(decodeGdatText(raw, false));
    if (++sampled >= 24) break;
  }

  const gdat: Gdat = {
    bigEndian,
    entryCount,
    records,
    textEncoded: encodedScore >= plainScore,
    entryBytes,
    find: (key) => index.get(keyString(key))
  };
  return { ok: true, gdat };
}

/** Entry bytes for a record whose class is binary and whose value is a valid entry index. */
export function recordEntry(gdat: Gdat, record: GdatRecord): Uint8Array | undefined {
  return BINARY_CLASSES.has(record.key[2]) && record.value < gdat.entryCount ? gdat.entryBytes(record.value) : undefined;
}

export function creatureName(gdat: Gdat, creatureId: number): string | undefined {
  const record = gdat.find(keyOf(GDAT_CATEGORY_CREATURE, creatureId & 0xff, GDAT_CLASS_TEXT, 0x00, 0xf0, 0x00));
  const raw = record ? recordEntry(gdat, record) : undefined;
  const name = raw ? decodeGdatText(raw, gdat.textEncoded) : undefined;
  return name && name.length > 0 ? name : undefined;
}

export function creatureIds(gdat: Gdat): number[] {
  const ids = new Set<number>();
  for (const record of gdat.records) if (record.key[0] === GDAT_CATEGORY_CREATURE) ids.add(record.key[1]);
  return [...ids].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------------------------

export const GDAT_TRANSPARENT = 255;

export interface GdatImage {
  readonly width: number;
  readonly height: number;
  /** One byte per pixel: 0..15 local colour index, or GDAT_TRANSPARENT. */
  readonly pixels: Uint8Array;
  /** The 16-byte tail of the entry (indices into a 256-colour palette that is not yet identified). */
  readonly paletteTail: Uint8Array;
  readonly plane: 'PRIMARY' | 'SECONDARY';
}

class NibbleReader {
  private index = 0;
  private half = false;
  private current = 0;
  constructor(private readonly bytes: Uint8Array) {}
  read(): number {
    if (!this.half) {
      if (this.index >= this.bytes.length) return -1;
      this.current = this.bytes[this.index++]!;
      this.half = true;
      return (this.current >> 4) & 15;
    }
    this.half = false;
    return this.current & 15;
  }
  /** True when every byte was consumed (a trailing half-byte is allowed only as that byte's low nibble). */
  consumedAll(): boolean {
    return this.index === this.bytes.length;
  }
}

function readDuration(reader: NibbleReader): number {
  const v = reader.read();
  if (v < 0) return -1;
  if (v !== 15) return v + 2;
  const w = reader.read();
  if (w < 0) return -1;
  if (w !== 15) {
    const low = reader.read();
    return low < 0 ? -1 : 17 + w * 16 + low;
  }
  const x = reader.read();
  if (x < 0) return -1;
  if (x !== 15) return x + 257;
  const a = reader.read();
  const b = reader.read();
  const c = reader.read();
  const d = reader.read();
  return a < 0 || b < 0 || c < 0 || d < 0 ? -1 : a * 4096 + b * 256 + c * 16 + d;
}

function decodeNibbleImage(entry: Uint8Array, bigEndian: boolean, primary: boolean): GdatImage | null {
  if (entry.length < 7 + 16) return null;
  const rawX = bigEndian ? (entry[0]! << 8) | entry[1]! : entry[0]! | (entry[1]! << 8);
  const rawY = bigEndian ? (entry[2]! << 8) | entry[3]! : entry[2]! | (entry[3]! << 8);
  const width = rawX & 0x3ff;
  const height = rawY & 0x3ff;
  if (width < 1 || height < 1 || width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) return null;
  const total = width * height;
  const body = entry.subarray(4, entry.length - 16);
  const reader = new NibbleReader(body);
  const local: number[] = [];
  for (let i = 0; i < 5; i++) local.push(reader.read());
  local.push(primary ? reader.read() : 0);
  if (local.some((v) => v < 0)) return null;

  const pixels = new Uint8Array(total).fill(GDAT_TRANSPARENT);
  let pos = 0;
  while (pos < total) {
    const n1 = reader.read();
    if (n1 < 0) return null;
    const k = n1 & 7;
    let color = 0;
    let spill = false;
    let still = false;
    if (k <= 4) color = local[k]!;
    else if (k === 5) {
      color = local[5]!;
      still = !primary;
    } else if (k === 6) spill = true;
    else {
      const n2 = reader.read();
      if (n2 < 0) return null;
      color = n2;
    }
    let duration = 1;
    if (n1 & 8) {
      duration = readDuration(reader);
      if (duration < 0) return null;
    }
    if (pos + duration > total) return null;
    if (spill) {
      if (pos < width) return null;
      for (let i = 0; i < duration; i++, pos++) pixels[pos] = pixels[pos - width]!;
    } else if (still) {
      pos += duration;
    } else {
      pixels.fill(color, pos, pos + duration);
      pos += duration;
    }
  }
  if (!reader.consumedAll()) return null;
  return {
    width,
    height,
    pixels,
    paletteTail: entry.slice(entry.length - 16),
    plane: primary ? 'PRIMARY' : 'SECONDARY'
  };
}

/** Decodes an image entry; null when the entry is not a recognized 4-bit nibble-RLE image. Never throws. */
export function decodeGdatImage(gdat: Gdat, entryIndex: number): GdatImage | null {
  const entry = gdat.entryBytes(entryIndex);
  if (!entry || entry.length < 4 + 16) return null;
  const rawY = gdat.bigEndian ? (entry[2]! << 8) | entry[3]! : entry[2]! | (entry[3]! << 8);
  // The 0x8000 flag marks an uncompressed 4-bit form that does not occur in the real file; not supported.
  if ((rawY & 0xfe00) === 0x8000) return null;
  return decodeNibbleImage(entry, gdat.bigEndian, true) ?? decodeNibbleImage(entry, gdat.bigEndian, false);
}

export interface GdatImageRef {
  readonly key: GdatKey;
  readonly entryIndex: number;
}

/** Image directory records (class 1) with a valid entry index, one per distinct entry. */
export function listGdatImages(gdat: Gdat): GdatImageRef[] {
  const seen = new Set<number>();
  const out: GdatImageRef[] = [];
  for (const record of gdat.records) {
    if (record.key[2] !== GDAT_CLASS_IMAGE || record.value >= gdat.entryCount || seen.has(record.value)) continue;
    seen.add(record.value);
    out.push({ key: record.key, entryIndex: record.value });
  }
  return out;
}
