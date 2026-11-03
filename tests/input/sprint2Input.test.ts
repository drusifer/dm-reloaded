import { describe, expect, it } from 'vitest';
import { resolveKeyboardCommand, resolvePointerHitCommand } from '../../src/input';
import { dispatchCommand } from '../../src/engine';
import { partyOf, placeAt } from '../engine/testkit';
import { BACKPACK_SLOT_RECTS, CHEST_SLOT_RECTS, EQUIP_SLOT_RECTS } from '../../src/render/layout';

describe('Sprint2 hand-aware input', () => {
  it('opens inventory by header/right-click and maps measured body/backpack/chest slots', () => {
    const state = partyOf('iaido');
    expect(resolvePointerHitCommand(8,4,state)).toEqual({type:'TOGGLE_INVENTORY',championIndex:0});
    expect(resolvePointerHitCommand(8,20,state,2)).toEqual({type:'TOGGLE_INVENTORY',championIndex:0});
    const opened = {...state,openInventoryChampionIndex:0};
    const head=EQUIP_SLOT_RECTS.head, bag=BACKPACK_SLOT_RECTS[16]!;
    expect(resolvePointerHitCommand(head.x+1,head.y+1,opened)).toEqual({type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'head'});
    expect(resolvePointerHitCommand(bag.x+1,bag.y+1,opened)).toEqual({type:'CLICK_BACKPACK_SLOT',championIndex:0,slotIndex:16});
    const chest=CHEST_SLOT_RECTS[7]!;
    expect(resolvePointerHitCommand(chest.x+1,chest.y+1,{...opened,openContainerId:'cr_chest_1'})).toEqual({type:'CLICK_CONTAINER_SLOT',slotIndex:7});
    expect(resolvePointerHitCommand(18,49,opened)).toEqual({type:'INSPECT_HAND_ITEM',championIndex:0});
    expect(resolvePointerHitCommand(59,49,opened)).toEqual({type:'CONSUME_HAND_ITEM',championIndex:0});
  });
  it('prioritizes wall features over throws, and rotates floor quadrants with facing', () => {
    const state = {...placeAt(partyOf('iaido'),1,5,4,1),handItem:'cr_key_iron'};
    expect(resolvePointerHitCommand(112,90,state)).toEqual({type:'INTERACT_AHEAD'});
    expect(resolvePointerHitCommand(35,90,state)).toEqual({type:'THROW_HAND_ITEM',side:'LEFT'});
    for (const facing of [0,1,2,3] as const) {
      const sample=placeAt(state,0,2,2,facing);
      expect(resolvePointerHitCommand(40,150,sample)).toEqual({type:'PICKUP_OR_DROP_FLOOR',quadrant:facing});
      expect(resolvePointerHitCommand(150,150,sample)).toEqual({type:'PICKUP_OR_DROP_FLOOR',quadrant:(facing+1)&3});
    }
  });
  it('wakes first on any click/key and supports QoL inventory/sleep/escape', () => {
    const state=partyOf('iaido'); const sleeping={...state,party:{...state.party,sleeping:true}};
    expect(resolvePointerHitCommand(280,4,sleeping)).toEqual({type:'SET_SLEEPING',sleeping:false});
    expect(resolveKeyboardCommand('x',sleeping)).toEqual({type:'SET_SLEEPING',sleeping:false});
    const qol=dispatchCommand(state,{type:'TOGGLE_QOL_MODE'}).state;
    expect(resolveKeyboardCommand('1',qol)).toEqual({type:'TOGGLE_INVENTORY',championIndex:0});
    expect(resolveKeyboardCommand('z',qol)).toEqual({type:'SET_SLEEPING',sleeping:true});
    expect(resolveKeyboardCommand('Escape',{...qol,openInventoryChampionIndex:0})).toEqual({type:'TOGGLE_INVENTORY',championIndex:null});
    expect(resolveKeyboardCommand('1',state)).toBeNull();
  });
});
