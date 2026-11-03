/**
 * Contact sheet tests: pure layout/render on synthetic bundles plus the real graphics.dat.
 *
 * TLDR:
 *   Verifies shelf-packing (no overlaps, all sprites placed, wrap at maxWidth), palette-correct
 *   pixels with transparent index 0, hit-testing, and — when the extracted Amiga graphics.dat is
 *   present — renders every real sprite and writes build/contact-sheet.png for human inspection.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle, parseGraphicsDat } from '../../src/data';
import type { DecodedSprite, GraphicsBundle } from '../../src/data';
import { getUiPalette } from '../../src/render';
import {
  hitTestContactSheet,
  layoutContactSheet,
  renderContactSheet
} from '../../src/render/contactSheet';
import type { ContactSheetCell } from '../../src/render/contactSheet';

const EXTRACTED_GFX_PATH = resolve(process.cwd(), 'public/assets/extracted/dm1/graphics.dat');

function sprite(index: number, width: number, height: number, fill: number): DecodedSprite {
  return { index, width, height, pixels: new Uint8Array(width * height).fill(fill) };
}

function bundleOf(sprites: DecodedSprite[]): GraphicsBundle {
  const base = createCleanRoomGraphicsBundle();
  return { ...base, sprites: new Map(sprites.map((s) => [s.index, s])) };
}

function overlaps(a: ContactSheetCell, b: ContactSheetCell): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function crc32(buf: Uint8Array): number {
  let c: number;
  let crc = 0xffffffff;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encodePng(width: number, height: number, rgba: Uint8ClampedArray): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

describe('Contact sheet (pure layout & render)', () => {
  it('packs every sprite exactly once, in index order, without overlap', () => {
    const bundle = bundleOf([sprite(7, 16, 16, 1), sprite(3, 40, 8, 2), sprite(9, 24, 24, 3), sprite(1, 8, 8, 4)]);
    const layout = layoutContactSheet(bundle, { maxWidth: 64, padding: 2 });
    expect(layout.cells.map((c) => c.index)).toEqual([1, 3, 7, 9]);
    for (let i = 0; i < layout.cells.length; i++) {
      for (let j = i + 1; j < layout.cells.length; j++) {
        expect(overlaps(layout.cells[i]!, layout.cells[j]!)).toBe(false);
      }
    }
    for (const c of layout.cells) {
      expect(c.x + c.width).toBeLessThanOrEqual(layout.width);
      expect(c.y + c.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it('wraps rows at maxWidth and scales cell sizes', () => {
    const bundle = bundleOf([sprite(0, 10, 10, 1), sprite(1, 10, 10, 1), sprite(2, 10, 10, 1)]);
    const layout = layoutContactSheet(bundle, { maxWidth: 50, padding: 2, scale: 2 });
    expect(layout.cells[0]).toMatchObject({ width: 20, height: 20 });
    expect(layout.cells[1]!.y).toBe(layout.cells[0]!.y); // 2nd still fits (ends at x=44)
    expect(layout.cells[2]!.y).toBeGreaterThan(layout.cells[0]!.y); // 3rd wraps
    expect(layout.cells[2]!.x).toBe(2);
  });

  it('gives an oversized sprite its own row and widens the sheet', () => {
    const bundle = bundleOf([sprite(0, 8, 8, 1), sprite(1, 100, 10, 1)]);
    const layout = layoutContactSheet(bundle, { maxWidth: 32, padding: 2 });
    expect(layout.width).toBeGreaterThanOrEqual(100);
    expect(layout.cells[1]!.y).toBeGreaterThan(layout.cells[0]!.y);
  });

  it('paints palette colours, treats index 0 as transparent, and hit-tests cells', () => {
    const palette = getUiPalette();
    const bundle = bundleOf([sprite(5, 4, 4, 9), sprite(6, 4, 4, 0)]);
    const img = renderContactSheet(bundle, palette, { padding: 2 });
    expect(img.rgba.length).toBe(img.width * img.height * 4);

    const [solid, hollow] = img.cells as [ContactSheetCell, ContactSheetCell];
    const at = (cell: ContactSheetCell): number[] => {
      const o = (cell.y * img.width + cell.x) * 4;
      return [img.rgba[o]!, img.rgba[o + 1]!, img.rgba[o + 2]!];
    };
    expect(at(solid)).toEqual([...palette[9]!]);
    expect(at(hollow)).not.toEqual([...palette[0]!]); // checker, not flat palette[0]

    expect(hitTestContactSheet(img, solid.x + 1, solid.y + 1)?.index).toBe(5);
    expect(hitTestContactSheet(img, hollow.x + 1, hollow.y + 1)?.index).toBe(6);
    expect(hitTestContactSheet(img, 0, 0)).toBeNull();
  });

  it('returns an empty sheet for a bundle with no sprites', () => {
    const img = renderContactSheet(bundleOf([]), getUiPalette());
    expect(img).toMatchObject({ width: 0, height: 0 });
    expect(img.cells).toHaveLength(0);
  });
});

describe('Contact sheet (real Amiga graphics.dat)', () => {
  const hasReal = existsSync(EXTRACTED_GFX_PATH);

  it.skipIf(!hasReal)('renders all decoded sprites and exports build/contact-sheet.png', () => {
    const bundle = parseGraphicsDat(new Uint8Array(readFileSync(EXTRACTED_GFX_PATH)));
    const palette = getUiPalette(bundle);
    const img = renderContactSheet(bundle, palette, { scale: 1, maxWidth: 900 });

    expect(img.cells.length).toBe(bundle.sprites.size);
    expect(img.cells.length).toBeGreaterThan(500);

    // Non-trivial content: many pixels differ from the flat background.
    let coloured = 0;
    for (let o = 0; o < img.rgba.length; o += 4) {
      if (img.rgba[o]! > 60 || img.rgba[o + 1]! > 60 || img.rgba[o + 2]! > 60) {
        coloured++;
      }
    }
    expect(coloured).toBeGreaterThan(5000);

    mkdirSync(resolve(process.cwd(), 'build'), { recursive: true });
    writeFileSync(resolve(process.cwd(), 'build/contact-sheet.png'), encodePng(img.width, img.height, img.rgba));
  });
});
