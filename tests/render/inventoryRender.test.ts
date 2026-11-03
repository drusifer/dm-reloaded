import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseGraphicsDat } from '../../src/data';
import { createSpriteSource } from '../../src/render/spriteSource';
import { Framebuffer } from '../../src/render/framebuffer';
import { paintInventory } from '../../src/render/inventoryPainter';
import { BACKPACK_SLOT_RECTS, CHEST_SLOT_RECTS, EQUIP_SLOT_RECTS, SCROLL_TEXT_RECT } from '../../src/render/layout';
import { partyOf, withItem } from '../engine/testkit';
import { getUiPalette } from '../../src/render/palette';

// Small PNG writer keeps sprite-coordinate evidence independent of browser dependencies.
function crc(bytes: Uint8Array): number {
 let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let i=0;i<8;i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Buffer): Buffer { const kind=Buffer.from(name); const size=Buffer.alloc(4); size.writeUInt32BE(data.length); const end=Buffer.alloc(4); end.writeUInt32BE(crc(Buffer.concat([kind,data]))); return Buffer.concat([size,kind,data,end]); }
describe('inventory sprite evidence', () => {
 it('decodes original panel dimensions and emits slot-coordinate evidence when local assets exist', () => {
 const path='public/assets/extracted/dm1/graphics.dat'; if (!existsSync(path)) return;
 const graphics=parseGraphicsDat(new Uint8Array(readFileSync(path))); const source=createSpriteSource(graphics);
 for (const [key, filename] of [['inventory.panel','build/inventory-panel.png'], ['inventory.chest','build/chest-panel.png']] as const) {
 const sprite=source.getSprite(key); expect(sprite.width).toBe(key === 'inventory.panel' ? 224 : 144); expect(sprite.height).toBe(key === 'inventory.panel' ? 136 : 73);
 const fb=new Framebuffer(); fb.blitSprite(sprite,0,0,getUiPalette(graphics));
 const header=Buffer.alloc(13); header.writeUInt32BE(sprite.width,0); header.writeUInt32BE(sprite.height,4); header[8]=8; header[9]=6;
 const rows=[]; for (let y=0;y<sprite.height;y++) rows.push(Buffer.concat([Buffer.from([0]),Buffer.from(fb.rgba.subarray(y*320*4,(y*320+sprite.width)*4))]));
 writeFileSync(filename,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]));
 }
 });
});

describe('inventory rendering', () => {
 it('aligns every equipment, backpack and chest slot to original frame border pixels', () => {
 const path='public/assets/extracted/dm1/graphics.dat'; if (!existsSync(path)) return;
 const source=createSpriteSource(parseGraphicsDat(new Uint8Array(readFileSync(path))));
 for (const [key,rects,ox,oy] of [['inventory.panel',[...Object.values(EQUIP_SLOT_RECTS),...BACKPACK_SLOT_RECTS],0,33],['inventory.chest',CHEST_SLOT_RECTS,80,85]] as const) {
 const sprite=source.getSprite(key);
 for(const rect of rects) {
 const x=rect.x-ox-1,y=rect.y-oy-1;
 for(let i=0;i<18;i++) expect(sprite.pixels[y*sprite.width+x+i]).toBe(1);
 }
 }
 });
 it('renders equipped icons in measured slots and swaps chest and scroll subpanels', () => {
 let state=withItem(partyOf('zed'),'test','TORCH');
 const champion=state.party.champions[0]!;
 state={...state,openInventoryChampionIndex:0,party:{...state.party,champions:[{...champion,inventory:{...champion.inventory,slots:{...champion.inventory.slots,leftHand:'test'}}}]}};
 const base=new Framebuffer(); paintInventory(base,state);
 const slot=EQUIP_SLOT_RECTS.leftHand;
 const expected=createSpriteSource().getSprite(`item.icon.${state.items.test!.iconIndex}`);
 const palette=getUiPalette();
 for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(expected.pixels[y*16+x])expect(base.getPixel(slot.x+x,slot.y+y)).toEqual(palette[expected.pixels[y*16+x]!]);
 const chest={...state,openContainerId:'box',items:{...state.items,box:{...state.items.test!,instanceId:'box',contents:['test']}}};
 const chestFb=new Framebuffer();paintInventory(chestFb,chest);
 const scrollFb=new Framebuffer();paintInventory(scrollFb,{...chest,items:{...chest.items,box:{...chest.items.box,contents:undefined,scrollText:['READ THE RUNES']}}});
 expect(chestFb.rgba).not.toEqual(base.rgba);expect(scrollFb.rgba).not.toEqual(chestFb.rgba);
 });
});

describe('scroll text contrast and clipping', () => {
 it('wraps long text using black ink entirely inside original parchment and fallback parchment', () => {
 const path='public/assets/extracted/dm1/graphics.dat';
 const graphics=existsSync(path)?parseGraphicsDat(new Uint8Array(readFileSync(path))):undefined;
 for(const bundle of [undefined,graphics]) {
 let state=withItem(partyOf('zed'),'scroll','SCROLL');
 state={...state,openInventoryChampionIndex:0,openContainerId:'scroll',items:{...state.items,scroll:{...state.items.scroll!,scrollText:[]}}};
 const blank=new Framebuffer();paintInventory(blank,state,bundle);
 const written=new Framebuffer();paintInventory(written,{...state,items:{...state.items,scroll:{...state.items.scroll!,scrollText:['THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG AND A VERY LONG WORD ABCDEFGHIJKLMNOPQRSTUVWXYZ REPEATED TO FORCE CLIPPING']}}},bundle);
 let changed=0;
 for(let y=0;y<200;y++)for(let x=0;x<320;x++) {
 if(blank.getPixel(x,y).join()===written.getPixel(x,y).join())continue;
 changed++;expect(x).toBeGreaterThanOrEqual(SCROLL_TEXT_RECT.x);expect(x).toBeLessThan(SCROLL_TEXT_RECT.x+SCROLL_TEXT_RECT.w);
 expect(y).toBeGreaterThanOrEqual(SCROLL_TEXT_RECT.y);expect(y).toBeLessThan(SCROLL_TEXT_RECT.y+SCROLL_TEXT_RECT.h);
 expect(written.getPixel(x,y)).toEqual([0,0,0]);
 }
 expect(changed).toBeGreaterThan(150);
 }
 });
});
