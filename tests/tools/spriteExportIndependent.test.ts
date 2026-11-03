/** Independent PNG format oracle: table-free CRC, native inflate, and known source indices. */
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { DecodedSprite, GraphicsBundle, RgbColor } from '../../src/data/graphicsDatParser';
import { createCleanRoomGraphicsBundle } from '../../src/data/graphicsDatParser';
import { createSpriteExport, encodeIndexedPng } from '../../src/tools/spriteExport';

// Bit-at-a-time reference distinct from the production lookup-table encoder.
function referenceCrc(bytes: Uint8Array): number {
  let value=0xffffffff;
  for(const byte of bytes) {
    value ^= byte;
    for(let bit=0;bit<8;bit++) value=(value&1) ? (value>>>1)^0xedb88320 : value>>>1;
  }
  return (value^0xffffffff)>>>0;
}
const palette: readonly RgbColor[]=Array.from({length:16},(_,i)=>[i*17,i*11,255-i*13] as const);
const original: DecodedSprite={index:17,width:17,height:3,pixels:Uint8Array.from({length:51},(_,i)=>(i*7)%16)};

describe('independent raw sprite export acceptance',()=>{
  it('validates every chunk CRC and all sixteen indices across odd-width row boundaries',()=>{
    expect(referenceCrc(Buffer.from('123456789'))).toBe(0xcbf43926);
    expect(referenceCrc(Buffer.from('IEND'))).toBe(0xae426082);
    const png=Buffer.from(encodeIndexedPng(original,palette));
    expect(png.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
    const chunks=new Map<string,Buffer[]>();
    let position=8;
    while(position<png.length) {
      const length=png.readUInt32BE(position),end=position+12+length;
      expect(end).toBeLessThanOrEqual(png.length);
      const type=png.toString('ascii',position+4,position+8);
      expect(png.readUInt32BE(position+8+length)).toBe(referenceCrc(png.subarray(position+4,position+8+length)));
      chunks.set(type,[...(chunks.get(type)??[]),png.subarray(position+8,position+8+length)]);
      position=end;
    }
    expect(position).toBe(png.length);
    expect([...chunks.keys()]).toEqual(['IHDR','PLTE','tRNS','IDAT','IEND']);
    const header=chunks.get('IHDR')![0]!;
    expect([header.readUInt32BE(0),header.readUInt32BE(4),...header.subarray(8)]).toEqual([17,3,4,3,0,0,0]);
    expect([...chunks.get('PLTE')![0]!]).toEqual(palette.flat());
    expect([...chunks.get('tRNS')![0]!]).toEqual([0,...Array<number>(15).fill(255)]);
    const rows=inflateSync(Buffer.concat(chunks.get('IDAT')!));
    expect(rows.length).toBe(30); // three rows, one filter byte plus ceil(17/2) packed bytes each.
    const decoded:number[]=[];
    for(let y=0;y<3;y++) {
      expect(rows[y*10]).toBe(0);
      for(let x=0;x<17;x++) {
        const byte=rows[y*10+1+Math.floor(x/2)]!;
        decoded.push(x%2===0?byte>>>4:byte&15);
      }
      expect(rows[y*10+9]!&15).toBe(0); // last low nibble is padding, never the next row's first pixel.
    }
    expect(decoded).toEqual([...original.pixels]);
    expect(new Set(decoded).size).toBe(16);
  });
  it('sorts numeric indices that differ from lexical order and strips either source path separator',()=>{
    const graphics:GraphicsBundle={...createCleanRoomGraphicsBundle(),source:'AMIGA_GRAPHICS_DAT',
      sprites:new Map([17,10,2].map(index=>[index,{...original,index}])),
      lightPalettes:[Array.from({length:16},()=>[0,0,0] as const),palette]};
    const source={fileName:'C:\\private\\assets\\graphics.dat',bytes:Buffer.from('original source')};
    const exported=createSpriteExport(graphics,source);
    expect(exported.manifest.sprites.map(entry=>entry.index)).toEqual([2,10,17]);
    expect(exported.manifest.source.fileName).toBe('graphics.dat');
    expect(exported.manifest.palette).toEqual(palette);
    expect(exported.manifest.sprites.slice(0,2).every(entry=>entry.category==='unclassified'&&entry.semanticKeys.length===0)).toBe(true);
    expect(exported.manifestJson).not.toContain('private');
    const reversed={...graphics,sprites:new Map([...graphics.sprites].reverse())};
    const rerun=createSpriteExport(reversed,source);
    expect(rerun.manifestJson).toBe(exported.manifestJson);
    expect([...rerun.pngFiles]).toEqual([...exported.pngFiles]);
    for(const entry of exported.manifest.sprites) {
      expect(entry.path).toMatch(/^[a-z]+\/[0-9]+_[0-9]+x[0-9]+\.png$/);
      expect(entry.path).not.toContain('\\');
    }
  });
});
