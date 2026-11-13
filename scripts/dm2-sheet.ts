/**
 * Developer review tool: grayscale PNG contact sheets of every decodable DM2 GDAT image.
 *
 * TLDR:
 *   Run through `bobp make dm2-sheet`. Reads public/assets/extracted/dm2/GRAPHICS.DAT, decodes images with
 *   src/data/gdat.ts and writes build/dm2-sheets/sheet-NN.png (indices as gray levels; colour is not claimed)
 *   plus build/dm2-sheets/index.json (entry, key, size, plane). Output is gitignored.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { png } from './lib/png';
import { GDAT_TRANSPARENT, decodeGdatImage, listGdatImages, parseGdat } from '../src/data/gdat';

const INPUT = resolve(process.argv[2] ?? 'public/assets/extracted/dm2/GRAPHICS.DAT');
const OUT = resolve('build/dm2-sheets');
const SHEET_W = 1280;
const SHEET_H = 960;
const CELL = 160;
const GAP = 8;

if (!existsSync(INPUT)) {
  console.error(`Missing ${INPUT}. Run bobp make extract-dm2 first.`);
  process.exit(1);
}
const parsed = parseGdat(new Uint8Array(readFileSync(INPUT)));
if (!parsed.ok) {
  console.error(`Not a readable GDAT file: ${parsed.reason}`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const refs = listGdatImages(parsed.gdat);
const index: unknown[] = [];
let sheet = 0;
let cursorX = GAP;
let cursorY = GAP;
let rowH = 0;
let canvas = new Uint8Array(SHEET_W * SHEET_H * 3).fill(40);
let decoded = 0;
let failed = 0;

const flush = (): void => {
  writeFileSync(`${OUT}/sheet-${String(sheet).padStart(2, '0')}.png`, png(SHEET_W, SHEET_H, canvas));
  sheet++;
  canvas = new Uint8Array(SHEET_W * SHEET_H * 3).fill(40);
  cursorX = GAP;
  cursorY = GAP;
  rowH = 0;
};

for (const ref of refs) {
  const image = decodeGdatImage(parsed.gdat, ref.entryIndex);
  if (!image) {
    failed++;
    continue;
  }
  decoded++;
  index.push({ entry: ref.entryIndex, key: ref.key, width: image.width, height: image.height, plane: image.plane, sheet });
  const w = Math.min(image.width, CELL);
  const h = Math.min(image.height, CELL);
  if (cursorX + w + GAP > SHEET_W) {
    cursorX = GAP;
    cursorY += rowH + GAP;
    rowH = 0;
  }
  if (cursorY + h + GAP > SHEET_H) {
    flush();
    (index[index.length - 1] as { sheet: number }).sheet = sheet;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = image.pixels[y * image.width + x]!;
      const gray = v === GDAT_TRANSPARENT ? 0 : 15 + v * 15;
      const o = ((cursorY + y) * SHEET_W + cursorX + x) * 3;
      canvas[o] = canvas[o + 1] = canvas[o + 2] = gray;
    }
  }
  cursorX += w + GAP;
  rowH = Math.max(rowH, h);
}
flush();
writeFileSync(`${OUT}/index.json`, JSON.stringify({ source: INPUT, decoded, failed, sheets: sheet, images: index }, null, 1));
console.log(`DM2 sheets: ${decoded} images decoded, ${failed} failed, ${sheet} sheets in ${OUT}`);
process.exit(failed ? 1 : 0);
