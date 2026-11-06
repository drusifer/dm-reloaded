import { describe, expect, it } from 'vitest';
import { filterSpriteCatalog, renderSpritePreview } from '../../src/render/catalogInspection';
import { buildSpriteCatalog } from '../../src/data/spriteCatalog';
import { createCleanRoomGraphicsBundle } from '../../src/data/graphicsDatParser';
import type { RgbColor } from '../../src/data/graphicsDatParser';
const sprite={index:42,width:3,height:2,pixels:new Uint8Array([0,10,2,2,0,10])};
const palette:RgbColor[]=Array.from({length:16},(_,i)=>[i*10,i*5,i]);
const base=createCleanRoomGraphicsBundle();
const entries=buildSpriteCatalog({...base,source:'AMIGA_GRAPHICS_DAT',sprites:new Map([17,117,170,500].map(index=>[index,{index,width:1,height:1,pixels:new Uint8Array(1)}]))});
describe('catalog inspection policy',()=>{
  it('uses exact numeric raw indices and combines category/status/text filters',()=>{
    expect(filterSpriteCatalog(entries,{query:'17'}).map(e=>e.sourceIndex)).toEqual([17]);
    expect(filterSpriteCatalog(entries,{query:'INVENTORY.PANEL',category:'ui',status:'verified'}).map(e=>e.sourceIndex)).toEqual([17]);
    expect(filterSpriteCatalog(entries,{query:'17',status:'unclassified'})).toEqual([]);
    expect(filterSpriteCatalog(entries,{status:'unclassified'}).map(e=>e.sourceIndex)).toEqual([170,500]);
    expect(filterSpriteCatalog(entries,{query:'not a sprite'})).toEqual([]);
    expect(filterSpriteCatalog(entries,{})).toEqual(entries);
  });
  it('shows opaque black and rawindex0 vs index10 holes before RGB lookup',()=>{
    const opaque=renderSpritePreview(sprite,palette,{kind:'opaque'});
    expect(Array.from(opaque.rgba.slice(0,8))).toEqual([0,0,0,255,100,50,10,255]);
    const raw=renderSpritePreview(sprite,palette,{kind:'transparent-index',index:0});
    expect(Array.from(raw.rgba.slice(0,8))).toEqual([0,0,0,0,100,50,10,255]);
    const wall=renderSpritePreview(sprite,palette,{kind:'transparent-index',index:10});
    expect(Array.from(wall.rgba.slice(0,8))).toEqual([0,0,0,255,0,0,0,0]);
    expect(sprite.pixels).toEqual(new Uint8Array([0,10,2,2,0,10]));
  });
  it('crops a usage to raw source bounds and renders mask-only as a stencil',()=>{
    const cropped=renderSpritePreview(sprite,palette,{kind:'opaque'},{x:1,y:0,width:2,height:1});
    expect([cropped.width,cropped.height]).toEqual([2,1]);
    expect(Array.from(cropped.rgba)).toEqual([100,50,10,255,20,10,2,255]);
    const stencil=renderSpritePreview(sprite,palette,{kind:'mask-index',index:0});
    expect(Array.from(stencil.rgba.slice(0,12))).toEqual([0,0,0,0,255,255,255,255,255,255,255,255]);
    for(const crop of [{x:-1,y:0,width:1,height:1},{x:2,y:0,width:2,height:1},{x:0,y:0,width:0,height:1},{x:0.5,y:0,width:1,height:1}])expect(()=>renderSpritePreview(sprite,palette,{kind:'opaque'},crop)).toThrow(/crop/i);
  });
});
