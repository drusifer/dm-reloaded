/** Held objects keep their center at the pointer, including clipped screen edges. */
import { describe, expect, it } from 'vitest';
import { createSpriteSource } from '../../src/render/spriteSource';
import { Framebuffer, renderFrame } from '../../src/render';
import { itemIconIndex } from '../../src/data/itemCatalog';
import { dispatchCommand } from '../../src/engine';
import { partyOf } from '../engine/testkit';
function changedPixels(pointer: {x:number;y:number}): {x:number;y:number}[] {
  const state={...partyOf('iaido'),handItem:'cr_dagger_1'};
  const base=new Framebuffer(),held=new Framebuffer();
  renderFrame(base,state); renderFrame(held,state,{pointer});
  const changes: {x:number;y:number}[]=[];
  for(let y=0;y<200;y++) for(let x=0;x<320;x++) if(base.getPixel(x,y).some((v,i)=>v!==held.getPixel(x,y)[i])) changes.push({x,y});
  return changes;
}
describe('held item cursor hotspot',()=>{
  it('draws an attached flame on generated lit torches, and none on burned-out ones',()=>{
    const source=createSpriteSource();
    const lit=source.getSprite('item.icon.7').pixels;
    const out=source.getSprite('item.icon.4').pixels;
    expect([...lit].some(p=>p===8||p===11)).toBe(true);
    expect([...lit].some(p=>p===3||p===5)).toBe(true);
    expect([...out].some(p=>p===8||p===11)).toBe(false);
  });
  it('keeps a fresh torch lit when picked up, including older stored icon values',()=>{
    const state=partyOf('zed'); const hero=state.party.champions[0]!;
    const slot=hero.inventory.slots.rightHand?'rightHand':'leftHand';
    const id=hero.inventory.slots[slot]!;
    const picked=dispatchCommand(state,{type:'CLICK_EQUIP_SLOT',championIndex:0,slot}).state;
    expect(picked.handItem).toBe(id);
    expect(picked.items[id]!.charges).toBe(15);
    expect(itemIconIndex({...picked.items[id]!,iconIndex:4})).toBe(7);
    expect(itemIconIndex({...picked.items[id]!,charges:0,iconIndex:7})).toBe(4);
  });
  it('straddles the pointer instead of hanging from its lower-right corner',()=>{
    const pixels=changedPixels({x:100,y:100});
    expect(pixels.some(p=>p.x<100)).toBe(true);
    expect(pixels.some(p=>p.x>100)).toBe(true);
    expect(pixels.some(p=>p.y<100)).toBe(true);
    expect(pixels.some(p=>p.y>100)).toBe(true);
  });
  it('clips at screen edges without sliding the hotspot away from the pointer',()=>{
    const pixels=changedPixels({x:0,y:0});
    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.every(p=>p.x<8&&p.y<8)).toBe(true);
  });
});
