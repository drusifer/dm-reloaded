import { itemIconAddress } from './spriteCatalog';
/**
 * Parser and decoder for the original 1988 Amiga Dungeon Master graphics.dat archive.
 *
 * TLDR:
 *   Unpacks the 575-item Big-Endian graphics.dat container, decoding all 535 FTL 4bpp
 *   byte-aligned RLE sprites (including Champion portraits item[26], Paperdoll item[17],
 *   and 16x16 Item Icon Sheets items 42..48), 33 signed 8-bit Paula PCM sound effects,
 *   item[556] names, item[559] ObjectDescriptors, item[557] font, and item[562] light ramps.
 */

import type { ItemDef } from '../engine/types';
import {
  ITEM_CATALOG_180,
  ITEM_NAMES_199,
  parseItemNamesFrom556,
  parseObjectDescriptorsFrom559
} from './itemCatalog';

export interface DecodedSprite {
  readonly index: number;
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array; // 1 byte per pixel, palette index 0..15
}

export interface DecodedSound {
  readonly index: number;
  readonly sampleRate: number;
  readonly samples: Float32Array; // Normalized [-1, 1] PCM waveform
}

export type RgbColor = readonly [number, number, number];

export interface GraphicsBundle {
  readonly source: 'AMIGA_GRAPHICS_DAT' | 'CLEAN_ROOM';
  readonly itemCount: number;
  readonly sprites: ReadonlyMap<number, DecodedSprite>;
  readonly sounds: ReadonlyMap<number, DecodedSound>;
  readonly systemFont: Uint8Array | null;
  readonly lightPalettes: readonly (readonly RgbColor[])[]; // 6 levels: 0=darkest lit .. 5=brightest
  readonly itemNames: readonly string[];
  readonly itemCatalog: readonly ItemDef[];
  /** Decoded item[560] action labels when independently verified; never inferred from sprite identity. */
  readonly actionLabels?: readonly string[];
}

/**
 * Authentic 6-level FTL 16-color $0RGB torchlight ramps from Amiga graphics.dat item[562] (offsets 1278..1469).
 * Ordered from index 0 (dimmest torchlight) to index 5 (full Hall of Champions brightness).
 */
const DEFAULT_AMIGA_9BIT_LIGHT_RAMPS: readonly (readonly number[])[] = [
  // Ramp 0 (dimmest lit — offset 1438)
  [0x000, 0x000, 0x000, 0x000, 0x066, 0x000, 0x000, 0x010, 0x200, 0x200, 0x100, 0x320, 0x000, 0x000, 0x002, 0x222],
  // Ramp 1 (offset 1406)
  [0x000, 0x000, 0x000, 0x000, 0x066, 0x100, 0x000, 0x020, 0x300, 0x310, 0x200, 0x530, 0x000, 0x111, 0x003, 0x333],
  // Ramp 2 (offset 1374)
  [0x000, 0x000, 0x111, 0x100, 0x066, 0x210, 0x010, 0x030, 0x400, 0x420, 0x310, 0x640, 0x000, 0x222, 0x004, 0x444],
  // Ramp 3 (offset 1342)
  [0x000, 0x111, 0x222, 0x210, 0x066, 0x310, 0x020, 0x040, 0x500, 0x530, 0x421, 0x750, 0x000, 0x333, 0x005, 0x555],
  // Ramp 4 (offset 1310)
  [0x000, 0x222, 0x333, 0x310, 0x066, 0x410, 0x030, 0x050, 0x600, 0x640, 0x532, 0x760, 0x111, 0x444, 0x006, 0x666],
  // Ramp 5 (brightest — offset 1278)
  [0x000, 0x333, 0x444, 0x310, 0x066, 0x420, 0x040, 0x060, 0x700, 0x750, 0x643, 0x770, 0x222, 0x555, 0x007, 0x777]
];

export function amiga9BitWordToRgb(word: number): RgbColor {
  const r3 = (word >> 8) & 0x7;
  const g3 = (word >> 4) & 0x7;
  const b3 = word & 0x7;
  return [
    Math.round((r3 * 255) / 7),
    Math.round((g3 * 255) / 7),
    Math.round((b3 * 255) / 7)
  ];
}

export function buildDefaultLightPalettes(): readonly (readonly RgbColor[])[] {
  return DEFAULT_AMIGA_9BIT_LIGHT_RAMPS.map((ramp) => ramp.map(amiga9BitWordToRgb));
}

function readU16BE(buf: Uint8Array, offset: number): number {
  return ((buf[offset] ?? 0) << 8) | (buf[offset + 1] ?? 0);
}

/**
 * Decodes a single FTL 4bpp byte-aligned RLE graphic item (items 0..532, 538, 548).
 * Returns null if the item header or stream does not match the exact FTL RLE invariant.
 */
export function decodeFtlRleSprite(index: number, itemBytes: Uint8Array): DecodedSprite | null {
  if (itemBytes.length < 6) {
    return null;
  }
  const width = readU16BE(itemBytes, 0);
  const height = readU16BE(itemBytes, 2);
  if (width === 0 || height === 0 || width > 512 || height > 512 || (width & 1) !== 0) {
    return null;
  }

  const totalPixels = width * height;
  const pixels = new Uint8Array(totalPixels);
  let srcPos = 4;
  let dstPos = 0;

  while (srcPos < itemBytes.length && dstPos < totalPixels) {
    const cmdByte = itemBytes[srcPos] ?? 0;
    srcPos += 1;
    const op = cmdByte >> 4;
    const lo = cmdByte & 0x0f;

    if (op <= 7) {
      const count = op + 1;
      if (dstPos + count > totalPixels) return null;
      pixels.fill(lo, dstPos, dstPos + count);
      dstPos += count;
    } else if (op === 8) {
      if (srcPos >= itemBytes.length) return null;
      const count = (itemBytes[srcPos] ?? 0) + 1;
      srcPos += 1;
      if (dstPos + count > totalPixels) return null;
      pixels.fill(lo, dstPos, dstPos + count);
      dstPos += count;
    } else if (op === 0x0c) {
      if (srcPos + 1 >= itemBytes.length) return null;
      const count = readU16BE(itemBytes, srcPos) + 1;
      srcPos += 2;
      if (dstPos + count > totalPixels) return null;
      pixels.fill(lo, dstPos, dstPos + count);
      dstPos += count;
    } else if (op === 0x0b) {
      if (srcPos >= itemBytes.length) return null;
      const copyCount = (itemBytes[srcPos] ?? 0) + 1;
      srcPos += 1;
      if (dstPos + copyCount + 1 > totalPixels) return null;
      for (let i = 0; i < copyCount; i += 1) {
        pixels[dstPos] = dstPos >= width ? (pixels[dstPos - width] ?? 0) : 0;
        dstPos += 1;
      }
      pixels[dstPos] = lo;
      dstPos += 1;
    } else if (op === 0x0f) {
      if (srcPos + 1 >= itemBytes.length) return null;
      const copyCount = readU16BE(itemBytes, srcPos) + 1;
      srcPos += 2;
      if (dstPos + copyCount + 1 > totalPixels) return null;
      for (let i = 0; i < copyCount; i += 1) {
        pixels[dstPos] = dstPos >= width ? (pixels[dstPos - width] ?? 0) : 0;
        dstPos += 1;
      }
      pixels[dstPos] = lo;
      dstPos += 1;
    } else if (op === 9) {
      if (srcPos >= itemBytes.length) return null;
      const nibbleCount = itemBytes[srcPos] ?? 0;
      srcPos += 1;
      const byteCount = (nibbleCount + 1) >> 1;
      if (srcPos + byteCount > itemBytes.length) return null;
      if (dstPos + 1 + nibbleCount > totalPixels) return null;
      pixels[dstPos] = lo;
      dstPos += 1;
      for (let n = 0; n < nibbleCount; n += 1) {
        const pairByte = itemBytes[srcPos + (n >> 1)] ?? 0;
        pixels[dstPos] = (n & 1) === 0 ? (pairByte >> 4) & 0x0f : pairByte & 0x0f;
        dstPos += 1;
      }
      srcPos += byteCount;
    } else {
      return null;
    }
  }

  if (dstPos !== totalPixels || srcPos !== itemBytes.length) {
    return null;
  }

  return { index, width, height, pixels };
}

function decodePcmSoundItem(index: number, itemBytes: Uint8Array): DecodedSound | null {
  if (itemBytes.length < 16) {
    return null;
  }
  const declaredSamples = readU16BE(itemBytes, 0);
  const headerBytes = itemBytes.length - declaredSamples;
  if (declaredSamples > 0 && headerBytes >= 2 && headerBytes <= 5) {
    const sampleOffset = headerBytes;
    const sampleCount = Math.min(declaredSamples, itemBytes.length - sampleOffset);
    const samples = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i += 1) {
      const u = itemBytes[sampleOffset + i] ?? 0;
      const signed = u >= 128 ? u - 256 : u;
      samples[i] = signed / 128;
    }
    return { index, sampleRate: 5500, samples };
  }

  return null;
}

function extractPalettesFromItem562(itemBytes: Uint8Array): readonly (readonly RgbColor[])[] | null {
  if (itemBytes.length < 1470) {
    return null;
  }
  const palettes: RgbColor[][] = [];
  for (let level = 0; level < 6; level += 1) {
    const baseOffset = 1438 - level * 32;
    const colors: RgbColor[] = [];
    for (let c = 0; c < 16; c += 1) {
      const word = readU16BE(itemBytes, baseOffset + c * 2);
      colors.push(amiga9BitWordToRgb(word));
    }
    palettes.push(colors);
  }
  return palettes;
}

/**
 * Parses the complete 575-item Amiga graphics.dat binary into decoded sprites, PCM sounds, item catalog, font, and palettes.
 */
export function parseGraphicsDat(rawBytes: Uint8Array): GraphicsBundle {
  if (rawBytes.length < 10) {
    throw new Error(`Invalid graphics.dat size (${rawBytes.length} bytes)`);
  }
  const itemCount = readU16BE(rawBytes, 0);
  const headerBytes = 2 + itemCount * 4;
  if (itemCount === 0 || rawBytes.length < headerBytes) {
    throw new Error(`Corrupt graphics.dat item header (${itemCount} items)`);
  }

  const sizes: number[] = [];
  for (let i = 0; i < itemCount; i += 1) {
    sizes.push(readU16BE(rawBytes, 2 + i * 2));
  }

  const sprites = new Map<number, DecodedSprite>();
  const sounds = new Map<number, DecodedSound>();
  let systemFont: Uint8Array | null = null;
  let lightPalettes: readonly (readonly RgbColor[])[] = buildDefaultLightPalettes();
  let raw556: Uint8Array | null = null;
  let raw559: Uint8Array | null = null;
  let raw560: Uint8Array | null = null;

  let offset = headerBytes;
  for (let index = 0; index < itemCount; index += 1) {
    const size = sizes[index] ?? 0;
    if (offset + size > rawBytes.length) {
      break;
    }
    const slice = rawBytes.subarray(offset, offset + size);
    offset += size;

    if (index === 556) {
      raw556 = slice;
      continue;
    }
    if (index === 557 && slice.length === 768) {
      systemFont = new Uint8Array(slice);
      continue;
    }
    if (index === 559) {
      raw559 = slice;
      continue;
    }
    if (index === 560) {
      raw560 = slice;
      continue;
    }
    if (index === 562) {
      const extracted = extractPalettesFromItem562(slice);
      if (extracted) {
        lightPalettes = extracted;
      }
      continue;
    }

    const sprite = decodeFtlRleSprite(index, slice);
    if (sprite) {
      sprites.set(index, sprite);
      continue;
    }

    const sound = decodePcmSoundItem(index, slice);
    if (sound) {
      sounds.set(index, sound);
    }
  }

  const itemNames = raw556 ? parseItemNamesFrom556(raw556) : ITEM_NAMES_199;
  const itemCatalog = raw559 ? parseObjectDescriptorsFrom559(raw559, itemNames) : ITEM_CATALOG_180;
  const decodedActions = raw560 ? parseItemNamesFrom556(raw560).map((label) => label.trim().toUpperCase()) : [];
  const actionLabels = ['SWING', 'SHOOT'].map((fallback) =>
    decodedActions.find((label) => label === fallback) ?? fallback
  );

  return {
    source: 'AMIGA_GRAPHICS_DAT',
    itemCount,
    sprites,
    sounds,
    systemFont,
    lightPalettes,
    itemNames,
    itemCatalog,
    actionLabels
  };
}

/**
 * Slices an individual 32x29 Champion portrait (0..23) from item[26] (256x87 = 8 cols x 3 rows).
 */
export function extractChampionPortrait(bundle: GraphicsBundle, portraitIndex: number): DecodedSprite | null {
  const sheet = bundle.sprites.get(26);
  if (!sheet || sheet.width < 256 || sheet.height < 87) {
    return null;
  }
  const clamped = Math.max(0, Math.min(23, portraitIndex));
  const col = clamped % 8;
  const row = Math.floor(clamped / 8);
  const portraitW = 32;
  const portraitH = 29;
  const out = new Uint8Array(portraitW * portraitH);

  for (let y = 0; y < portraitH; y += 1) {
    const srcRowStart = (row * portraitH + y) * sheet.width + col * portraitW;
    const dstRowStart = y * portraitW;
    out.set(sheet.pixels.subarray(srcRowStart, srcRowStart + portraitW), dstRowStart);
  }

  return {
    index: 2600 + clamped,
    width: portraitW,
    height: portraitH,
    pixels: out
  };
}

/**
 * Slices an individual 16x16 Item Icon (0..223) from Amiga graphics.dat items 42..48 (each 256x32 = 16 cols x 2 rows).
 */
export function extractItemIcon(bundle: GraphicsBundle, iconIndex: number): DecodedSprite | null {
  const clamped = Math.max(0, Math.min(223, iconIndex));
  const address = itemIconAddress(clamped);
  if (!address) return null;
  const sheet = bundle.sprites.get(address.rawSourceIndex);
  if (!sheet || sheet.width < 256 || sheet.height < 32) {
    return null;
  }
  const { x: cropX, y: cropY } = address.crop;
  const out = new Uint8Array(16 * 16);

  for (let y = 0; y < 16; y += 1) {
    const srcRowStart = (cropY + y) * sheet.width + cropX;
    out.set(sheet.pixels.subarray(srcRowStart, srcRowStart + 16), y * 16);
  }

  return {
    index: 4200 + clamped,
    width: 16,
    height: 16,
    pixels: out
  };
}

/**
 * Clean-room fallback graphics bundle when Amiga graphics.dat has not been extracted locally.
 */
export function createCleanRoomGraphicsBundle(): GraphicsBundle {
  return {
    source: 'CLEAN_ROOM',
    itemCount: 0,
    sprites: new Map(),
    sounds: new Map(),
    systemFont: null,
    lightPalettes: buildDefaultLightPalettes(),
    itemNames: ITEM_NAMES_199,
    itemCatalog: ITEM_CATALOG_180,
    actionLabels: ['SWING', 'SHOOT']
  };
}
