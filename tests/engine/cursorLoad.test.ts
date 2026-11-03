import { describe, expect, it } from 'vitest';
import { championLoadTenths, itemWeightTenths } from '../../src/engine/inventory';
import { dispatchCommand } from '../../src/engine';
import { partyOf, placeAt } from './testkit';

describe('cursor-hand load ownership',()=>{
  it('conserves leader load when equipment moves into cursor and while viewing another champion',()=>{
    const state=partyOf('iaido','zed');
    const champion=state.party.champions[0]!;
    const slot=champion.inventory.slots.rightHand?'rightHand':'leftHand';
    expect(champion.inventory.slots[slot]).not.toBeNull();
    const before=championLoadTenths(state,champion);
    const otherBefore=championLoadTenths(state,state.party.champions[1]!);
    let held=dispatchCommand(state,{type:'CLICK_EQUIP_SLOT',championIndex:0,slot}).state;
    expect(held.handItem).not.toBeNull();
    expect(championLoadTenths(held,held.party.champions[0]!)).toBe(before);
    held=dispatchCommand(held,{type:'TOGGLE_INVENTORY',championIndex:1}).state;
    expect(championLoadTenths(held,held.party.champions[0]!)).toBe(before);
    expect(championLoadTenths(held,held.party.champions[1]!)).toBe(otherBefore);
    held=dispatchCommand(held,{type:'CLICK_EQUIP_SLOT',championIndex:0,slot}).state;
    expect(held.handItem).toBeNull();
    expect(championLoadTenths(held,held.party.champions[0]!)).toBe(before);
  });
  it('counts a cursor chest and its contents once, then transfers the same load into backpack',()=>{
    const state=placeAt(partyOf('iaido'),0,2,2,1);
    const before=championLoadTenths(state,state.party.champions[0]!);
    let held=dispatchCommand(state,{type:'PICKUP_OR_DROP_FLOOR',quadrant:1}).state;
    expect(held.handItem).toBe('cr_chest_1');
    const chestWeight=itemWeightTenths(held,'cr_chest_1');
    expect(championLoadTenths(held,held.party.champions[0]!)).toBe(before+chestWeight);
    held=dispatchCommand(held,{type:'CLICK_BACKPACK_SLOT',championIndex:0,slotIndex:16}).state;
    expect(championLoadTenths(held,held.party.champions[0]!)).toBe(before+chestWeight);
  });
});
