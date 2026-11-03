/** Carried load remains conserved while equipment moves through the persistent cursor. */
import { describe, expect, it } from 'vitest';
import { dispatchCommand } from '../../src/engine';
import { championLoadTenths, itemWeightTenths } from '../../src/engine/inventory';
import { partyOf } from './testkit';

describe('Sprint2 cursor load acceptance',()=>{
  it('keeps equipped item weight assigned while it is held and then placed back',()=>{
    const base={...partyOf('zed'),openInventoryChampionIndex:0};
    const champion=base.party.champions[0]!;
    const slot=champion.inventory.slots.rightHand ? 'rightHand' : 'leftHand';
    expect(champion.inventory.slots[slot]).not.toBeNull();
    const load=championLoadTenths(base,champion);
    const held=dispatchCommand(base,{type:'CLICK_EQUIP_SLOT',championIndex:0,slot}).state;
    expect(held.handItem).not.toBeNull();
    expect(championLoadTenths(held,held.party.champions[0]!)).toBe(load);
    const placed=dispatchCommand(held,{type:'CLICK_EQUIP_SLOT',championIndex:0,slot}).state;
    expect(placed.handItem).toBeNull();
    expect(championLoadTenths(placed,placed.party.champions[0]!)).toBe(load);
  });
  it('attributes held chest and contents to the living leader regardless of inventory view',()=>{
    const base=partyOf('iaido','zed');
    const active={...base,handItem:'cr_chest_1',openInventoryChampionIndex:1};
    const weight=itemWeightTenths(active,'cr_chest_1');
    expect(weight).toBeGreaterThan(0);
    const loads=base.party.champions.map(champion=>championLoadTenths(base,champion));
    expect(championLoadTenths(active,active.party.champions[0]!)).toBe(loads[0]!+weight);
    expect(championLoadTenths(active,active.party.champions[1]!)).toBe(loads[1]);
    const closed={...active,openInventoryChampionIndex:null};
    expect(championLoadTenths(closed,closed.party.champions[0]!)).toBe(loads[0]!+weight);
    expect(championLoadTenths(closed,closed.party.champions[1]!)).toBe(loads[1]);
  });
});
