/** Independent evidence boundaries: raw IDs, derived crops, dormant aliases and conditional masks. */
import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle } from '../../src/data/graphicsDatParser';
import type { GraphicsBundle } from '../../src/data/graphicsDatParser';
import { buildSpriteCatalog, dm1ExportMetadata, itemIconAddress, panelSourceIndex } from '../../src/data/spriteCatalog';
import { createSpriteSource } from '../../src/render/spriteSource';
function fixture(source:GraphicsBundle['source']='AMIGA_GRAPHICS_DAT'):GraphicsBundle {
  const sizes=[[17,224,136],[26,256,87],[27,144,73],[42,256,32],[81,16,49],[85,32,136],[110,96,88],[301,96,88]];
  return {...createCleanRoomGraphicsBundle(),source,sprites:new Map(sizes.map(([index,width,height])=>[index!,{index:index!,width:width!,height:height!,pixels:new Uint8Array(width!*height!).fill(1)}]))};
}
describe('independent catalog policy acceptance',()=>{
  it('keeps cropped icon17 tied to raw42 even though its derived ID collides with raw panel17',()=>{
    const source=fixture(),catalog=buildSpriteCatalog(source),panel=catalog.find(e=>e.sourceIndex===17)!,atlas=catalog.find(e=>e.sourceIndex===42)!;
    expect(createSpriteSource(source).getSprite('item.icon.17').index).toBe(17);
    expect(panel.usages.map(u=>u.usageKey)).toEqual(['inventory.panel']);
    const crop=atlas.usages.find(u=>u.usageKey==='item.icon.17')!;
    expect(crop).toMatchObject({rawSourceIndex:42,crop:{x:16,y:16,width:16,height:16},mask:{kind:'transparent-index',index:0}});
    expect(atlas.usages).toHaveLength(32);
    expect(atlas.usages.every(u=>u.crop?.width===16&&u.crop.height===16&&u.mask.kind==='transparent-index')).toBe(true);
    expect(atlas.usages.some(u=>u.mask.kind==='opaque')).toBe(false); // raw opaque preview is not a whole-atlas runtime claim.
  });
  it('separates a verified dormant alias and legacy categories from proven active roles',()=>{
    const catalog=buildSpriteCatalog(fixture());
    expect(catalog.find(e=>e.sourceIndex===27)).toMatchObject({status:'verified',semanticKeys:['inventory.stats'],usages:[]});
    expect(catalog.find(e=>e.sourceIndex===26)).toMatchObject({category:'ui',status:'unclassified',semanticKeys:[],usages:[],evidence:[]});
    expect(catalog.find(e=>e.sourceIndex===81)).toMatchObject({category:'dungeon',status:'unclassified',semanticKeys:[],usages:[],evidence:[]});
    expect(dm1ExportMetadata(85)).toEqual({category:'dungeon',semanticKeys:[]});
    expect([17,23,25,27].map(index=>dm1ExportMetadata(index).semanticKeys)).toEqual([['inventory.panel'],['inventory.scroll'],['inventory.chest'],['inventory.stats']]);
  });
  it('does not confer DM1 identity from numeric legacy helpers on generated art',()=>{
    const source=fixture('CLEAN_ROOM');
    expect(panelSourceIndex('inventory.panel')).toBe(17);expect(itemIconAddress(17)!.rawSourceIndex).toBe(42);
    expect(createSpriteSource(source).getSprite('inventory.panel').width).toBe(224);
    for(const entry of buildSpriteCatalog(source))expect(entry).toMatchObject({provenance:'generated',category:'unclassified',status:'unclassified',semanticKeys:[],evidence:[],usages:[]});
  });
  it('returns fresh metadata and nested crops/masks so inspection cannot poison later resolutions',()=>{
    const source=fixture(),expected=buildSpriteCatalog(source),first=buildSpriteCatalog(source);
    const panel=first.find(e=>e.sourceIndex===17)!,icon=first.find(e=>e.sourceIndex===42)!.usages[0]!;
    Object.assign(panel.semanticKeys,{0:'poisoned'});Object.assign(panel.usages[0]!.mask,{kind:'transparent-index',index:10});
    Object.assign(icon.crop!,{x:255});
    const metadata=dm1ExportMetadata(17);Object.assign(metadata.semanticKeys,{0:'poisoned'});
    Object.assign(itemIconAddress(17)!.crop,{x:255});
    expect(buildSpriteCatalog(source)).toEqual(expected);
    expect(dm1ExportMetadata(17)).toEqual({category:'ui',semanticKeys:['inventory.panel']});
    expect(itemIconAddress(17)!.crop).toEqual({x:16,y:16,width:16,height:16});
    expect(panelSourceIndex('__proto__')).toBeUndefined();
  });
  it('links ordinary door blits to the separate conditional301 breach mask without treating301 as color art',()=>{
    const source=fixture(),doors=new Map(source.sprites);
    for(let index=108;index<=119;index++)doors.set(index,{index,width:2,height:1,pixels:new Uint8Array(2)});
    const catalog=buildSpriteCatalog({...source,sprites:doors});
    for(let index=108;index<=119;index++)expect(catalog.find(e=>e.sourceIndex===index)!.usages[0]).toMatchObject({
      mask:{kind:'transparent-index',index:10},auxiliaryMask:{rawSourceIndex:301,condition:'bashed',mask:{kind:'mask-index',index:0}}
    });
    expect(catalog.find(e=>e.sourceIndex===301)!.usages[0]!.mask).toEqual({kind:'mask-index',index:0});
  });
});
