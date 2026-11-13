import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildSpriteCatalog, dm1ExportMetadata, itemIconAddress, panelSourceIndex } from '../../src/data/spriteCatalog';
import { createCleanRoomGraphicsBundle, parseGraphicsDat } from '../../src/data/graphicsDatParser';
import type { GraphicsBundle } from '../../src/data/graphicsDatParser';
import { createSpriteExport } from '../../src/tools/spriteExport';
import { createSpriteSource } from '../../src/render/spriteSource';

function fixture(source:GraphicsBundle['source']='AMIGA_GRAPHICS_DAT'):GraphicsBundle {
  const sizes=[[17,224,136],[42,256,32],[85,32,136],[110,96,88],[301,96,88],[500,2,1]];
  return {...createCleanRoomGraphicsBundle(),source,sprites:new Map(sizes.map(([index,width,height])=>[index!,{index:index!,width:width!,height:height!,pixels:new Uint8Array(width!*height!)}]))};
}

describe('verified raw sprite catalog',()=>{
  it('covers exactly actual raw map indices, ordered with measured dimensions and explicit unknowns',()=>{
    const input=fixture(),before=Array.from(input.sprites.keys());
    const entries=buildSpriteCatalog(input);
    expect(entries.map(e=>e.sourceIndex)).toEqual([17,42,85,110,301,500]);
    expect(entries.find(e=>e.sourceIndex===500)).toMatchObject({width:2,height:1,status:'unclassified',category:'unclassified',semanticKeys:[],usages:[],evidence:[]});
    expect(entries.find(e=>e.sourceIndex===17)).toMatchObject({width:224,height:136,semanticKeys:['inventory.panel'],status:'verified'});
    expect(Array.from(input.sprites.keys())).toEqual(before);
    expect(buildSpriteCatalog(input)).toEqual(entries);
    expect(buildSpriteCatalog(createCleanRoomGraphicsBundle())).toEqual([]);
  });

  it('never turns matching generated numeric indices into original facts',()=>{
    for(const entry of buildSpriteCatalog(fixture('CLEAN_ROOM'))) {
      expect(entry).toMatchObject({provenance:'generated',status:'unclassified',category:'unclassified',semanticKeys:[],evidence:[],usages:[]});
      expect(entry.label).toBeUndefined();
    }
    // Legacy runtime fixture resolution intentionally remains compatible.
    expect(createSpriteSource(fixture('CLEAN_ROOM')).getSprite('inventory.panel').index).toBe(17);
  });

  it('records opaque panels, raw atlas provenance/crops, index10 walls and separate smash role',()=>{
    const entries=buildSpriteCatalog(fixture());
    expect(entries.find(e=>e.sourceIndex===17)!.usages).toContainEqual(expect.objectContaining({rawSourceIndex:17,mask:{kind:'opaque'}}));
    const icon=entries.find(e=>e.sourceIndex===42)!.usages.find(u=>u.usageKey==='item.icon.4');
    expect(icon).toMatchObject({rawSourceIndex:42,crop:{x:64,y:0,width:16,height:16},mask:{kind:'transparent-index',index:0}});
    expect(entries.find(e=>e.sourceIndex===85)!.usages).toContainEqual(expect.objectContaining({mask:{kind:'transparent-index',index:10}}));
    expect(entries.find(e=>e.sourceIndex===110)!.usages).toContainEqual(expect.objectContaining({mask:{kind:'transparent-index',index:10}}));
    expect(entries.find(e=>e.sourceIndex===301)!.usages).toContainEqual(expect.objectContaining({mask:{kind:'mask-index',index:0}}));
    expect(icon!.evidence.length).toBeGreaterThan(0);
  });

  it('preserves four exported aliases/categories and rejects invalid icon addresses',()=>{
    expect([17,23,25,27].map(i=>dm1ExportMetadata(i).semanticKeys)).toEqual([['inventory.panel'],['inventory.scroll'],['inventory.chest'],['inventory.stats']]);
    expect([1,42,75,110,301,315,500].map(i=>dm1ExportMetadata(i).category)).toEqual(['ui','items','dungeon','dungeon','dungeon','dungeon','unclassified']);
    expect(panelSourceIndex('wall.alcove')).toBeUndefined();
    expect(panelSourceIndex('inventory.stats')).toBe(27);
    expect(itemIconAddress(31)).toEqual({rawSourceIndex:42,crop:{x:240,y:16,width:16,height:16}});
    expect(itemIconAddress(32)).toEqual({rawSourceIndex:43,crop:{x:0,y:0,width:16,height:16}});
    expect(itemIconAddress(223)).toEqual({rawSourceIndex:48,crop:{x:240,y:16,width:16,height:16}});
    for(const icon of [-1,224,NaN,1.5])expect(itemIconAddress(icon)).toBeUndefined();
  });

  it('rejects invalid raw map identity rather than joining derived IDs',()=>{
    const input=fixture();
    expect(()=>buildSpriteCatalog({...input,sprites:new Map([[42,{index:17,width:16,height:16,pixels:new Uint8Array(256)}]])})).toThrow(/index/i);
  });

  const path='public/assets/extracted/dm1/graphics.dat';
  it.skipIf(!existsSync(path))('audits all535 original records and byte-identical existing raw manifest/PNGs',()=>{
    const bytes=readFileSync(path),graphics=parseGraphicsDat(bytes),entries=buildSpriteCatalog(graphics);
    expect(entries).toHaveLength(535);
    expect(entries.map(e=>e.sourceIndex)).toEqual([...graphics.sprites.keys()].sort((a,b)=>a-b));
    for(const e of entries) {
      expect([e.width,e.height]).toEqual([graphics.sprites.get(e.sourceIndex)!.width,graphics.sprites.get(e.sourceIndex)!.height]);
      for(const u of e.usages)expect(u.rawSourceIndex).toBe(e.sourceIndex);
    }
    const output=createSpriteExport(graphics,{fileName:'graphics.dat',bytes});
    expect(createHash('sha256').update(output.manifestJson).digest('hex')).toBe('d4b9555ff40ed93be4dec34dc9c1af8b071cdbe489608acbce576c26a834d083');
    if(existsSync('build/sprites/manifest.json')) {
      expect(output.manifestJson).toBe(readFileSync('build/sprites/manifest.json','utf8'));
      for(const [relative,png] of output.pngFiles)expect(Buffer.from(png)).toEqual(readFileSync(`build/sprites/${relative}`));
    }
  });
});
