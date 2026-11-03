/** Known-data PNG and manifest contract tests; independent browser decode follows in Phase 2. */
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle } from '../../src/data/graphicsDatParser';
import type { DecodedSprite, GraphicsBundle, RgbColor } from '../../src/data/graphicsDatParser';
import { createSpriteSource } from '../../src/render/spriteSource';
import { createSpriteExport, encodeIndexedPng } from '../../src/tools/spriteExport';

const palette: readonly RgbColor[] = Array.from({length:16},(_,i)=>[i*17,255-i*17,i] as const);
const sprite: DecodedSprite={index:17,width:3,height:2,pixels:new Uint8Array([0,1,2,15,2,0])};
function chunks(png:Uint8Array): {type:string;data:Buffer;crc:number}[] {
 const buffer=Buffer.from(png), result=[];
 for(let at=8;at<buffer.length;) {
  const length=buffer.readUInt32BE(at),type=buffer.toString('ascii',at+4,at+8);
  result.push({type,data:buffer.subarray(at+8,at+8+length),crc:buffer.readUInt32BE(at+8+length)});
  at+=length+12;
 }
 return result;
}
function bundle(sprites:readonly DecodedSprite[]): GraphicsBundle {
 return {...createCleanRoomGraphicsBundle(),source:'AMIGA_GRAPHICS_DAT',sprites:new Map(sprites.map(s=>[s.index,s])),lightPalettes:[Array.from({length:16},()=>[0,0,0] as const),palette]};
}
const source={fileName:'/local/private/graphics.dat',bytes:new TextEncoder().encode('abc')};
describe('indexed PNG export',()=>{
 it('encodes a real 4-bit indexed PNG with known odd-width rows, palette and transparency',()=>{
  const png=encodeIndexedPng(sprite,palette),parts=chunks(png);
  expect([...png.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
  expect(parts.map(p=>p.type)).toEqual(['IHDR','PLTE','tRNS','IDAT','IEND']);
  const ihdr=parts[0]!.data;
  expect(ihdr.readUInt32BE(0)).toBe(3);expect(ihdr.readUInt32BE(4)).toBe(2);
  expect([...ihdr.subarray(8)]).toEqual([4,3,0,0,0]);
  expect([...parts[1]!.data]).toEqual(palette.flat());
  expect([...parts[2]!.data]).toEqual([0,...Array(15).fill(255)]);
  expect([...inflateSync(parts[3]!.data)]).toEqual([0,0x01,0x20,0,0xf2,0x00]);
  // Canonical empty IEND CRC is an external known PNG test vector.
  expect(parts[4]!.crc).toBe(0xae426082);
 });
 it('is deterministic and preserves the source pixel buffer',()=>{
  const before=sprite.pixels.slice();
  expect(encodeIndexedPng(sprite,palette)).toEqual(encodeIndexedPng(sprite,palette));
  expect(sprite.pixels).toEqual(before);
 });
 it.each([0,-1,1.5,Number.NaN])('rejects invalid dimension %s before allocation',width=>{
  expect(()=>encodeIndexedPng({...sprite,width},palette)).toThrow(/dimension/i);
 });
 it('rejects incomplete pixels and indices outside the palette',()=>{
  expect(()=>encodeIndexedPng({...sprite,pixels:new Uint8Array([0])},palette)).toThrow(/pixel/i);
  expect(()=>encodeIndexedPng({...sprite,pixels:new Uint8Array([0,1,2,3,4,16])},palette)).toThrow(/index/i);
 });
 it('requires exactly sixteen valid byte-valued colors',()=>{
  expect(()=>encodeIndexedPng(sprite,palette.slice(0,15))).toThrow(/palette/i);
  expect(()=>encodeIndexedPng(sprite,[[-1,0,0],...palette.slice(1)])).toThrow(/palette/i);
  expect(()=>encodeIndexedPng(sprite,[[0,1.5,0],...palette.slice(1)])).toThrow(/palette/i);
  expect(()=>encodeIndexedPng(sprite,new Array<RgbColor>(16))).toThrow(/palette/i);
  expect(()=>encodeIndexedPng(sprite,[new Array<number>(3) as unknown as RgbColor,...palette.slice(1)])).toThrow(/palette/i);
 });
});
describe('deterministic sprite export manifest',()=>{
 it('exports each raw sprite once in numeric order with verified labels and unknowns explicit',()=>{
  const result=createSpriteExport(bundle([{...sprite,index:500},{...sprite,index:42},sprite]),source);
  expect(result.manifest.schemaVersion).toBe(1);
  expect(result.manifest.source).toEqual({fileName:'graphics.dat',sha256:'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'});
  expect(result.manifest.palette).toEqual(palette);
  expect(result.manifest.transparency).toEqual({transparentIndex:0,opaqueIndices:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],policy:'raw-index-0'});
  expect(result.manifest.sprites.map(s=>[s.index,s.category,s.semanticKeys])).toEqual([[17,'ui',['inventory.panel']],[42,'items',[]],[500,'unclassified',[]]]);
  expect([...result.pngFiles.keys()]).toEqual(['ui/17_3x2.png','items/42_3x2.png','unclassified/500_3x2.png']);
  expect(result.manifest.sprites).toHaveLength(result.pngFiles.size);
  for(const entry of result.manifest.sprites) {
   expect(entry.width).toBe(3);expect(entry.height).toBe(2);
   expect(entry.sha256).toBe(createHash('sha256').update(result.pngFiles.get(entry.path)!).digest('hex'));
  }
 });
 it('keeps every exported semantic alias aligned with the existing SpriteSource adapter',()=>{
  const graphics=bundle([17,23,25,27].map(index=>({...sprite,index})));
  const adapter=createSpriteSource(graphics),result=createSpriteExport(graphics,source);
  for(const entry of result.manifest.sprites) {
   expect(entry.semanticKeys).toHaveLength(1);
   expect(adapter.getSprite(entry.semanticKeys[0] as 'inventory.panel'|'inventory.scroll'|'inventory.chest'|'inventory.stats').index).toBe(entry.index);
  }
 });
 it('produces byte-identical output regardless of input-map insertion order',()=>{
  const other={...sprite,index:25};
  const a=createSpriteExport(bundle([other,sprite]),source),b=createSpriteExport(bundle([sprite,other]),source);
  expect(a.manifestJson).toBe(b.manifestJson);expect([...a.pngFiles]).toEqual([...b.pngFiles]);
  expect(a.manifestJson).not.toContain('/local/private');expect(a.manifestJson.endsWith('\n')).toBe(true);
 });
 it('rejects empty/fallback bundles, duplicate source indices and inconsistent map keys',()=>{
  expect(()=>createSpriteExport(bundle([]),source)).toThrow(/no decoded sprites/i);
  expect(()=>createSpriteExport(createCleanRoomGraphicsBundle(),source)).toThrow(/original|clean.room/i);
  const invalid={...bundle([sprite]),sprites:new Map([[18,sprite]])};
  expect(()=>createSpriteExport(invalid,source)).toThrow(/source indices/i);
 });
});
