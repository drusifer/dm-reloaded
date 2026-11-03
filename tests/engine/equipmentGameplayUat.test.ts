/** Derived equipment bonuses affect active gameplay, not only paperdoll labels. */
import { describe, expect, it } from 'vitest';
import { hold, partyOf, patchChampion, run, setStrength, tick, withItem } from './testkit';
describe('equipment gameplay acceptance',()=>{
  it('uses worn strength bonus when launching an otherwise identical throw',()=>{
    let base=withItem(withItem(setStrength(partyOf('zed'),0,10),'mace','MACE OF ORDER'),'rock','ROCK');
    const before=run(hold(base,'rock'),{type:'THROW_HAND_ITEM',side:'LEFT'}).state.projectiles[0]!.kineticEnergy;
    base=run(hold(base,'mace'),{type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'rightHand'}).state;
    const equipped=run(hold(base,'rock'),{type:'THROW_HAND_ITEM',side:'LEFT'}).state;
    expect(equipped.projectiles[0]!.kineticEnergy).toBeGreaterThan(before);
    expect(equipped.party.champions[0]!.attributes.strength).toBe(10);
  });
  it('regenerates into equipment-provided mana capacity and clamps safely after unequip',()=>{
    let state=withItem(partyOf('zed'),'staff','STAFF OF MANAR');
    const champion=state.party.champions[0]!,baseMax=champion.maxMana;
    state=run(hold(state,'staff'),{type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'rightHand'}).state;
    state=patchChampion(state,0,{mana:baseMax,stamina:champion.maxStamina});
    state=tick(state,6).state;
    expect(state.party.champions[0]!.mana).toBeGreaterThan(baseMax);
    expect(state.party.champions[0]!.maxMana).toBe(baseMax);
    state=run(state,{type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'rightHand'}).state;
    state=tick(state,1).state;
    expect(state.party.champions[0]!.mana).toBe(baseMax);
  });
});
