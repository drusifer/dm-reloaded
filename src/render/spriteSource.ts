/** Semantic campaign sprite adapter; raw DM1 indices remain inside this module. */
import { itemIconAddress, panelSourceIndex } from '../data/spriteCatalog';
import type { DecodedSprite, GraphicsBundle } from '../data/graphicsDatParser';

export type SpriteKey = 'inventory.panel' | 'inventory.chest' | 'inventory.scroll' | 'inventory.stats' |
  'inventory.skull' | 'inventory.mouth' | 'inventory.eye' | 'inventory.save' | 'inventory.sleep' |
  'wall.alcove' | 'wall.fountain' | 'wall.keyhole' | 'wall.altar' | `item.icon.${number}`;
export interface SpriteSource { getSprite(key: SpriteKey): DecodedSprite }
const cache = new WeakMap<GraphicsBundle, SpriteSource>();

/** Provide semantic sprites, cropping DM1 icon sheets and generating missing clean-room art. */
export function createSpriteSource(graphics?: GraphicsBundle): SpriteSource {
  if (graphics && cache.has(graphics)) return cache.get(graphics)!;
  const resolved = new Map<SpriteKey, DecodedSprite>();
  const source: SpriteSource = { getSprite(key) {
    const previous = resolved.get(key);
    if (previous) return previous;
    let sprite: DecodedSprite | undefined;
    const panelIndex = panelSourceIndex(key);
    if (panelIndex !== undefined) sprite = graphics?.sprites.get(panelIndex);
    if (key.startsWith('item.icon.')) {
      const icon = Number(key.slice(10));
      const address = itemIconAddress(icon);
      if (address) {
        const sheet = graphics?.sprites.get(address.rawSourceIndex);
        if (sheet && sheet.width === 256 && sheet.height === 32) {
          const pixels = new Uint8Array(256);
          const { x: sx, y: sy } = address.crop;
          for (let y = 0; y < 16; y++) pixels.set(sheet.pixels.subarray((sy + y) * 256 + sx, (sy + y) * 256 + sx + 16), y * 16);
          sprite = { index: icon, width: 16, height: 16, pixels };
        }
      }
    }
    if (!sprite) {
      const panel = panelIndex !== undefined;
      const width = key === 'inventory.panel' ? 224 : panel ? 144 : 16;
      const height = key === 'inventory.panel' ? 136 : panel ? 73 : 16;
      const pixels = new Uint8Array(width * height);
      if (panel) {
        pixels.fill(1);
        if (key === 'inventory.scroll') for (let y = 5; y < 68; y++) pixels.fill(15, y*width+34, y*width+132);
      }
      else {
        const seed = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
        for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) {
          if (x === 2 || x === 13 || y === 2 || y === 13 || ((x + y + seed) % 5 === 0)) pixels[y * 16 + x] = 8 + seed % 7;
        }
      }
      if (/^item\.icon\.[4-7]$/.test(key)) {
        pixels.fill(0);
        for (let x = 2; x <= 11; x++) {
          const y = 15 - x;
          pixels[y * 16 + x] = 5;
          pixels[(y + 1) * 16 + x] = 3;
        }
        const stage = Number(key.slice(10)) - 4;
        if (stage > 0) {
          for (let y = 6 - stage; y <= 6; y++) {
            for (let x = 10; x <= 13; x++) pixels[y * 16 + x] = 8;
          }
          pixels[5 * 16 + 11] = 11;
          pixels[6 * 16 + 11] = 11;
        }
      }
      if (!panel && !key.startsWith('item.icon.')) {
        pixels.fill(0);
        const box = (x: number,y: number,w: number,h: number,c: number): void => { for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)pixels[yy*16+xx]=c; };
        if (key === 'wall.alcove') { box(1,2,14,12,13); box(3,4,10,8,1);box(1,13,14,2,5); }
        else if (key === 'wall.fountain') { box(6,2,4,4,13);box(7,6,2,6,14);box(2,11,12,4,13);box(4,11,8,2,4); }
        else if (key === 'wall.keyhole') { box(4,1,8,14,5);box(6,4,4,4,0);box(7,7,2,5,0); }
        else if (key === 'wall.altar') { box(2,10,12,3,13);box(4,13,8,2,5);box(7,1,2,8,11);box(4,3,8,2,11); }
        else if (key === 'inventory.skull') { box(3,2,10,9,15);box(5,10,6,4,15);box(4,5,3,3,0);box(9,5,3,3,0);box(7,9,2,2,0);box(6,12,1,2,0);box(9,12,1,2,0); }
      }
      sprite = { index: -1, width, height, pixels };
    }
    resolved.set(key, sprite);
    return sprite;
  } };
  if (graphics) cache.set(graphics, source);
  return source;
}
