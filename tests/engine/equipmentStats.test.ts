import { describe, expect, it } from 'vitest';
import { championArmorRating, effectiveChampionAttributes, effectiveChampionMaxMana, maxLoadTenths } from '../../src/engine/inventory';
import { hold, partyOf, run, withItem } from './testkit';

describe('AC2.1.2 derived equipment armor and attributes', () => {
 it('applies Dexhelm only when worn, reverses on pickup and never mutates base attributes', () => {
 let state=withItem(partyOf('zed'),'helm','DEXHELM');const original=state.party.champions[0]!;
 const base=effectiveChampionAttributes(state,original).dexterity;
 state=run(hold(state,'helm'),{type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'head'}).state;
 expect(effectiveChampionAttributes(state,state.party.champions[0]!).dexterity).toBe(base+10);
 expect(state.party.champions[0]!.attributes).toEqual(original.attributes);
 expect(championArmorRating(state,state.party.champions[0]!)).toBeGreaterThan(championArmorRating({...state,items:{...state.items,helm:{...state.items.helm!,defId:127}}},state.party.champions[0]!));
 state=run(state,{type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'head'}).state;
 expect(effectiveChampionAttributes(state,state.party.champions[0]!).dexterity).toBe(base);
 });
 it('uses verified strength bonuses for capacity and ignores bonuses in backpack or wrong hand', () => {
 let state=withItem(partyOf('zed'),'mace','MACE OF ORDER');const c=state.party.champions[0]!;
 const load=maxLoadTenths(c,state);
 state=run(hold(state,'mace'),{type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'rightHand'}).state;
 expect(effectiveChampionAttributes(state,state.party.champions[0]!).strength).toBe(c.attributes.strength+5);
 expect(maxLoadTenths(state.party.champions[0]!,state)).toBe(load+40);
 state=run(state,{type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'rightHand'}).state;
 state=run(state,{type:'CLICK_BACKPACK_SLOT',championIndex:0,slotIndex:16}).state;
 expect(effectiveChampionAttributes(state,state.party.champions[0]!).strength).toBe(c.attributes.strength);
 });
 it('derives mana capacity from verified action-hand staff and neck moonstone without stacking reads', () => {
 let state=withItem(withItem(partyOf('zed'),'staff','STAFF OF MANAR'),'moon','MOONSTONE');
 const base=state.party.champions[0]!.maxMana;
 state=run(hold(state,'staff'),{type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'rightHand'}).state;
 state=run(hold(state,'moon'),{type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'neck'}).state;
 expect(effectiveChampionMaxMana(state,state.party.champions[0]!)).toBe(base+13);
 expect(effectiveChampionMaxMana(state,state.party.champions[0]!)).toBe(base+13);
 });
 it.each([
 ['POWERTOWERS','legs','strength',10], ['CROWN OF NERRA','head','wisdom',10],
 ['FLAMEBAIN','torso','antiFire',12], ['CLOAK OF NIGHT','neck','dexterity',8],
 ['JEWEL SYMAL','neck','antiMagic',15]
 ] as const)('applies verified %s bonus in its required %s slot', (name,slot,stat,bonus) => {
 let state=withItem(partyOf('zed'),'gear',name);const base=effectiveChampionAttributes(state,state.party.champions[0]!)[stat];
 state=run(hold(state,'gear'),{type:'CLICK_EQUIP_SLOT',championIndex:0,slot}).state;
 expect(effectiveChampionAttributes(state,state.party.champions[0]!)[stat]).toBe(base+bonus);
 });
 it('suppresses a cursed armor bonus and derives its luck penalty only while equipped', () => {
 let state=withItem(partyOf('zed'),'helm','DEXHELM');const original=state.party.champions[0]!;
 state={...state,items:{...state.items,helm:{...state.items.helm!,cursed:true}}};
 state=run(hold(state,'helm'),{type:'CLICK_EQUIP_SLOT',championIndex:0,slot:'head'}).state;
 expect(effectiveChampionAttributes(state,state.party.champions[0]!).dexterity).toBe(original.attributes.dexterity);
 expect(effectiveChampionAttributes(state,state.party.champions[0]!).luck).toBe(original.attributes.luck-3);
 });

});
