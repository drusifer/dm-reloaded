/**
 * Developer review tool: index-labelled contact sheets of DM1 graphics.dat sprites.
 *
 * TLDR:
 *   `bobp make dm1-sheet ARGS="440 575"` writes build/dm1-sheets/sheet-NN.png for sprite indices FROM..TO using the
 *   brightest source light ramp (index 0 shown as dark magenta = transparent). Labels are raw atlas indices.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseGraphicsDat } from '../src/data/graphicsDatParser';
import { Framebuffer } from '../src/render/framebuffer';
import { drawBitmapText } from '../src/render/bitmapFont';
import { png } from './lib/png';

const INPUT = resolve('public/assets/extracted/dm1/graphics.dat');
const FROM = Number(process.argv[2] ?? 0);
const TO = Number(process.argv[3] ?? 574);
const OUT = resolve('build/dm1-sheets');
if (!existsSync(INPUT)) {
  console.error('Missing graphics.dat. Run bobp make extract-assets first.');
  process.exit(1);
}
const graphics = parseGraphicsDat(new Uint8Array(readFileSync(INPUT)));
const palette = graphics.lightPalettes[graphics.lightPalettes.length - 1]!;
mkdirSync(OUT, { recursive: true });

const W = 320;
const H = 200;
const SCALE = 3;
const HALF = process.env.HALF !== '0'; // show sprites at half size so a sheet holds more of them
let fb = new Framebuffer();
let sheet = 0;
let x = 2;
let y = 2;
let rowH = 0;
let count = 0;

const flush = (): void => {
  const out = new Uint8Array(W * SCALE * H * SCALE * 3);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const [r, g, b] = fb.getPixel(px, py);
    for (let dy = 0; dy < SCALE; dy++) for (let dx = 0; dx < SCALE; dx++) {
      const o = ((py * SCALE + dy) * W * SCALE + px * SCALE + dx) * 3;
      out[o] = r; out[o + 1] = g; out[o + 2] = b;
    }
  }
  writeFileSync(`${OUT}/sheet-${String(sheet).padStart(2, '0')}.png`, png(W * SCALE, H * SCALE, out));
  sheet++;
  fb = new Framebuffer();
  x = 2; y = 2; rowH = 0;
};

fb.clear([40, 40, 40]);
for (let i = FROM; i <= TO; i++) {
  const sprite = graphics.sprites.get(i);
  if (!sprite) continue;
  const step = HALF ? 2 : 1;
  const w = Math.min(Math.ceil(sprite.width / step), 120);
  const h = Math.min(Math.ceil(sprite.height / step), 90);
  if (x + w + 2 > W) { x = 2; y += rowH + 10; rowH = 0; }
  if (y + h + 10 > H) { flush(); fb.clear([40, 40, 40]); }
  for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < w; sx++) {
    const v = sprite.pixels[(sy * step) * sprite.width + sx * step]!;
    fb.setPixel(x + sx, y + 8 + sy, v === 0 ? [90, 0, 90] : palette[v]!);
  }
  drawBitmapText(fb, String(i), x, y, [255, 255, 0]);
  x += Math.max(w, String(i).length * 6) + 4;
  rowH = Math.max(rowH, h + 0);
  count++;
}
flush();
console.log(`DM1 sheets: ${count} sprites (${FROM}..${TO}) in ${sheet} sheets at ${OUT}`);
