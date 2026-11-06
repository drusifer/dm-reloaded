/** Independent explicit-preview boundaries; provenance is enforced by catalog/UI, not this generic renderer. */
import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle } from '../../src/data/graphicsDatParser';
import type { RgbColor } from '../../src/data/graphicsDatParser';
import { buildSpriteCatalog } from '../../src/data/spriteCatalog';
import { filterSpriteCatalog, renderSpritePreview } from '../../src/render/catalogInspection';
const sprite={index:85,width:2,height:2,pixels:Uint8Array.from([0,10,2,1])};
const palette:RgbColor[]=Array.from({length:16},()=>[0,0,0] as const);palette[1]=[9,8,7];palette[2]=[3,5,7];
describe('independent catalog inspection acceptance',()=>{
  it('keeps colliding black RGB colors distinct under raw0/raw10 masks and shows a binary white mask role',()=>{
    const source=sprite.pixels.slice(),colors=JSON.stringify(palette);
    expect([...renderSpritePreview(sprite,palette,{kind:'opaque'}).rgba]).toEqual([0,0,0,255,0,0,0,255,3,5,7,255,9,8,7,255]);
    expect([...renderSpritePreview(sprite,palette,{kind:'transparent-index',index:0}).rgba]).toEqual([0,0,0,0,0,0,0,255,3,5,7,255,9,8,7,255]);
    expect([...renderSpritePreview(sprite,palette,{kind:'transparent-index',index:10}).rgba]).toEqual([0,0,0,255,0,0,0,0,3,5,7,255,9,8,7,255]);
    expect([...renderSpritePreview(sprite,palette,{kind:'mask-index',index:0}).rgba]).toEqual([0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255]);
    expect(sprite.pixels).toEqual(source);expect(JSON.stringify(palette)).toBe(colors);
  });
  it('accepts the exact bottom-right crop and rejects negative/outside/fractional/nonfinite crop bounds',()=>{
    const edge=renderSpritePreview(sprite,palette,{kind:'opaque'},{x:1,y:1,width:1,height:1});
    expect([edge.width,edge.height,...edge.rgba]).toEqual([1,1,9,8,7,255]);
    const valid={x:0,y:0,width:1,height:1};
    for(const change of [{y:-1},{y:2},{y:0.5},{height:0},{height:-1},{height:0.5},{height:Infinity},{width:0},{width:-1},{width:NaN},{x:NaN},{x:Infinity}]) {
      expect(()=>renderSpritePreview(sprite,palette,{kind:'opaque'},{...valid,...change})).toThrow(/crop/i);
    }
  });
  it('intersects filters without mutation and keeps numeric raw17 separate from usage icon17 on raw42',()=>{
    const source={...createCleanRoomGraphicsBundle(),source:'AMIGA_GRAPHICS_DAT' as const,
      sprites:new Map([[17,{index:17,width:224,height:136,pixels:new Uint8Array(224*136)}],[42,{index:42,width:256,height:32,pixels:new Uint8Array(256*32)}],[117,{index:117,width:2,height:1,pixels:new Uint8Array(2)}],[500,{index:500,width:17,height:1,pixels:new Uint8Array(17)}]])};
    const entries=buildSpriteCatalog(source),snapshot=JSON.stringify(entries);
    expect(filterSpriteCatalog(entries,{query:' 0017 '}).map(e=>e.sourceIndex)).toEqual([17]);
    expect(filterSpriteCatalog(entries,{query:' ITEM.ICON.17 ',category:'items',status:'verified'}).map(e=>e.sourceIndex)).toEqual([42]);
    expect(filterSpriteCatalog(entries,{query:' viewport.source.117 ',category:'dungeon',status:'verified'}).map(e=>e.sourceIndex)).toEqual([117]);
    expect(filterSpriteCatalog(entries,{query:'item.icon.17',category:'items',status:'unclassified'})).toEqual([]);
    const generated=buildSpriteCatalog({...source,source:'CLEAN_ROOM'});
    expect(filterSpriteCatalog(generated,{status:'verified'})).toEqual([]);
    expect(filterSpriteCatalog(entries,{}).map(e=>e.sourceIndex)).toEqual([17,42,117,500]);
    expect(JSON.stringify(entries)).toBe(snapshot);expect([...source.sprites.keys()]).toEqual([17,42,117,500]);
  });
});
