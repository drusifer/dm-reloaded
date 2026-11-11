import { describe, expect, it } from 'vitest';
import {
  MAGIC_RUNES,
  dispatchCommand,
  effectiveLightLevel,
  effectiveShieldMitigation
} from '../../src/engine';
import { effectiveChampionAttributes } from '../../src/engine/inventory';
import type { GameState, RuneId } from '../../src/engine/types';
import { partyOf, patchChampion, placeAt, withItem } from './testkit';

const QA_RANK_FLOORS = [
  0, 100, 250, 500, 1_000, 2_000, 4_000, 8_000,
  16_000, 32_000, 64_000, 128_000, 256_000, 512_000, 1_024_000, 2_048_000
] as const;
const WIZARD_FIRE = 12;
const PRIEST_POTION = 8;

function referenceDraw(seedState: number): { readonly value: number; readonly nextState: number } {
  const nextState = (seedState + 1_831_565_813) | 0;
  let mixed = Math.imul(nextState ^ (nextState >>> 15), nextState | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return { value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296, nextState };
}

function qaSeed(predicate: (value: number) => boolean): number {
  for (let seed = 1; seed < 10_000; seed++) {
    if (predicate(referenceDraw(seed).value)) return seed;
  }
  throw new Error('QA seed search exhausted');
}

function withRank(state: GameState, subskill: number, rank: number, championIndex = 0): GameState {
  const champion = state.party.champions[championIndex]!;
  return patchChampion(state, championIndex, {
    progression: {
      experience: champion.progression.experience.map((value, index) =>
        index === subskill ? QA_RANK_FLOORS[rank]! : value)
    }
  });
}

function formula(state: GameState, runes: readonly RuneId[], championIndex = 0): GameState {
  return runes.reduce((current, rune) => dispatchCommand(current, {
    type: 'ADD_RUNE', championIndex, rune
  }).state, state);
}

function addFlask(
  state: GameState,
  id: string,
  location: 'leftHand' | 'pouch1' | 'backpack' | 'head' = 'pouch1'
): GameState {
  const itemState = withItem(state, id, 'EMPTY FLASK');
  const champion = itemState.party.champions[0]!;
  if (location === 'backpack') {
    const backpack = champion.inventory.backpack.map((value, index) => index === 3 ? id : value);
    return patchChampion(itemState, 0, {
      inventory: { ...champion.inventory, backpack }
    });
  }
  return patchChampion(itemState, 0, {
    inventory: {
      ...champion.inventory,
      slots: { ...champion.inventory.slots, [location]: id }
    }
  });
}

function selectFlask(state: GameState, flaskId: string | null): GameState {
  return dispatchCommand(state, {
    type: 'SELECT_BREW_FLASK', championIndex: 0, flaskId
  }).state;
}

function invoke(state: GameState) {
  return dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 0 });
}

describe('Sprint 3 Phase 3 independent rune and spell UAT', () => {
  it('exposes the exact 24-rune order and edits at most four runes without costs', () => {
    expect(MAGIC_RUNES.map((entry) => entry.id)).toEqual([
      'LO', 'UM', 'ON', 'POWER_EE', 'PAL', 'MON',
      'YA', 'VI', 'OH', 'FUL', 'DES', 'ZO',
      'VEN', 'EW', 'KATH', 'IR', 'BRO', 'GOR',
      'KU', 'ROS', 'DAIN', 'NETA', 'RA', 'SAR'
    ]);
    expect(MAGIC_RUNES.map((entry) => entry.tier)).toEqual([
      ...Array(6).fill('POWER'), ...Array(6).fill('ELEMENTAL'),
      ...Array(6).fill('FORM'), ...Array(6).fill('CLASS')
    ]);

    const state = partyOf('iaido');
    const edited = formula(state, ['LO', 'FUL', 'IR', 'RA', 'SAR']);
    expect(edited.runeFormulas.iaido).toEqual(['LO', 'FUL', 'IR', 'RA']);
    expect(edited.rngState).toBe(state.rngState);
    expect(edited.party.champions[0]!.mana).toBe(state.party.champions[0]!.mana);
    const removed = dispatchCommand(edited, { type: 'REMOVE_RUNE', championIndex: 0 }).state;
    expect(removed.runeFormulas.iaido).toEqual(['LO', 'FUL', 'IR']);
    const cleared = dispatchCommand(removed, { type: 'CLEAR_RUNES', championIndex: 0 }).state;
    expect(cleared.runeFormulas.iaido).toEqual([]);
  });

  it('enforces None-to-Neophyte and invalid/mana/flask gates with zero costs or draws', () => {
    const cases: Array<{ state: GameState; reason: string }> = [];
    cases.push({
      state: formula(withRank(partyOf('iaido'), WIZARD_FIRE, 0), ['LO', 'FUL', 'IR']),
      reason: 'INSUFFICIENT_SKILL'
    });
    cases.push({ state: formula(partyOf('iaido'), ['FUL', 'IR']), reason: 'INVALID_FORMULA' });
    let noMana = withRank(partyOf('iaido'), WIZARD_FIRE, 1);
    noMana = patchChampion(noMana, 0, { mana: 0 });
    cases.push({ state: formula(noMana, ['LO', 'FUL', 'IR']), reason: 'INSUFFICIENT_MANA' });
    let stale = withRank(addFlask(partyOf('iaido'), 'head-flask', 'head'), PRIEST_POTION, 1);
    stale = selectFlask(stale, 'head-flask');
    cases.push({ state: formula(stale, ['LO', 'VI']), reason: 'INVALID_FLASK' });

    for (const entry of cases) {
      const before = entry.state;
      const actor = before.party.champions[0]!;
      const result = invoke(before);
      expect(result.events).toContainEqual(expect.objectContaining({
        type: 'SPELL_REJECTED', reason: entry.reason
      }));
      expect(result.state.rngState).toBe(before.rngState);
      expect(result.state.party.champions[0]!.mana).toBe(actor.mana);
      expect(result.state.party.champions[0]!.progression).toBe(actor.progression);
      expect(result.state.items).toBe(before.items);
      expect(result.state.runeFormulas.iaido).toBe(before.runeFormulas.iaido);
    }
  });

  it('pins success, fizzle, and backfire to one draw with exact costs and XP policy', () => {
    const outcomes = [
      { type: 'SPELL_SUCCEEDED', seed: qaSeed((value) => value < 0.6), xp: true },
      { type: 'SPELL_FIZZLED', seed: qaSeed((value) => value >= 0.6 && value < 0.85), xp: false },
      { type: 'SPELL_BACKFIRED', seed: qaSeed((value) => value >= 0.85), xp: false }
    ] as const;
    for (const outcome of outcomes) {
      let state = withRank(partyOf('iaido'), WIZARD_FIRE, 1);
      state = formula({ ...state, rngState: outcome.seed }, ['LO', 'FUL', 'IR']);
      const before = state.party.champions[0]!;
      const draw = referenceDraw(outcome.seed);
      const result = invoke(state);
      expect(result.state.rngState).toBe(draw.nextState);
      expect(result.state.party.champions[0]!.mana).toBe(before.mana - 5);
      expect(result.state.runeFormulas.iaido).toEqual([]);
      expect(result.events.some((event) => event.type === outcome.type)).toBe(true);
      expect(result.events.some((event) => event.type === 'SKILL_XP_AWARDED')).toBe(outcome.xp);
      if (outcome.type === 'SPELL_SUCCEEDED') {
        expect(result.state.projectiles[0]).toMatchObject({
          ownerChampionId: before.id,
          payload: { kind: 'SPELL', spellId: 'FIREBALL', explosive: true }
        });
      } else {
        expect(result.state.projectiles).toEqual([]);
      }
    }
  });

  it('opens doors and expires Light and Shield at their absolute ticks', () => {
    const successSeed = qaSeed((value) => value < 0.6);
    let state = withRank(partyOf('iaido'), WIZARD_FIRE, 3);
    state = placeAt(state, 0, 5, 2, 2);
    state = formula({ ...state, rngState: successSeed }, ['LO', 'ZO']);
    const opened = invoke(state).state;
    expect(opened.levels[0]!.tiles[3]![5]!.door?.progress).toBe(0);

    let effects = patchChampion({
      ...opened,
      party: { ...opened.party, level: 2, torchLight: 0 }
    }, 0, { mana: 99 });
    effects = formula({ ...effects, rngState: successSeed }, ['LO', 'OH', 'IR', 'RA']);
    const lit = invoke(effects).state;
    expect(effectiveLightLevel(lit)).toBeGreaterThan(effectiveLightLevel(effects));
    effects = patchChampion(lit, 0, { mana: 99 });
    effects = formula({ ...effects, rngState: successSeed }, ['LO', 'YA', 'IR']);
    const shielded = invoke(effects).state;
    expect(shielded.party.champions[0]!.effects.map((effect) => effect.kind)).toEqual(
      expect.arrayContaining(['LIGHT', 'SHIELD'])
    );
    const expiry = Math.max(...shielded.party.champions[0]!.effects.map((effect) => effect.expiresAtTick));
    const expired = dispatchCommand(shielded, { type: 'TICK', count: expiry - shielded.tick });
    expect(expired.state.party.champions[0]!.effects).toEqual([]);
    expect(expired.events.filter((event) =>
      event.type === 'STATUS_EFFECT_CHANGED' && !event.active)).toHaveLength(2);
  });

  it('replaces party Shield for only living champions with pure mitigation and exact expiry', () => {
    const successSeed = qaSeed((value) => value < 0.6);
    let state = partyOf('iaido', 'zed', 'chani');
    state = withRank(withRank(state, WIZARD_FIRE, 15), WIZARD_FIRE, 15, 1);
    state = patchChampion(state, 0, { mana: 99 });
    state = patchChampion(state, 1, { mana: 99 });
    state = patchChampion(state, 2, { alive: false });
    const baseAttributes = state.party.champions.map((champion) => champion.attributes);

    state = formula({ ...state, rngState: successSeed }, ['LO', 'YA', 'IR'], 1);
    const first = dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 1 });
    expect(first.state.party.champions.map((champion) =>
      champion.effects.filter((effect) => effect.kind === 'SHIELD').length)).toEqual([1, 1, 0]);
    expect(first.state.party.champions.slice(0, 2).map((champion) =>
      champion.effects.find((effect) => effect.kind === 'SHIELD')?.sourceChampionId
    )).toEqual(['zed', 'zed']);

    let replacementInput = patchChampion(first.state, 0, { mana: 99 });
    replacementInput = formula({ ...replacementInput, rngState: successSeed }, ['ON', 'YA', 'IR']);
    const replacementA = invoke(replacementInput);
    const replacementB = invoke(replacementInput);
    expect(replacementA.state.party.champions.map((champion) => champion.effects))
      .toEqual(replacementB.state.party.champions.map((champion) => champion.effects));
    expect(replacementA.events).toEqual(replacementB.events);

    const shielded = replacementA.state;
    const shields = shielded.party.champions.map((champion) =>
      champion.effects.filter((effect) => effect.kind === 'SHIELD'));
    expect(shields.map((effects) => effects.length)).toEqual([1, 1, 0]);
    expect(shields.slice(0, 2).map((effects) => effects[0])).toEqual([
      expect.objectContaining({ magnitude: 3, sourceChampionId: 'iaido' }),
      expect.objectContaining({ magnitude: 3, sourceChampionId: 'iaido' })
    ]);
    expect(shielded.party.champions.map((champion) => champion.attributes)).toEqual(baseAttributes);

    const snapshots = shielded.party.champions.map((champion) => structuredClone(champion));
    expect(shielded.party.champions.map(effectiveShieldMitigation)).toEqual([3, 3, 0]);
    expect(shielded.party.champions).toEqual(snapshots);

    const expiry = shields[0]![0]!.expiresAtTick;
    const beforeExpiry = dispatchCommand(shielded, {
      type: 'TICK', count: expiry - shielded.tick - 1
    });
    expect(beforeExpiry.state.tick).toBe(expiry - 1);
    expect(beforeExpiry.state.party.champions.map(effectiveShieldMitigation)).toEqual([3, 3, 0]);
    expect(beforeExpiry.events.some((event) =>
      event.type === 'STATUS_EFFECT_CHANGED' && event.effect === 'SHIELD' && !event.active)).toBe(false);

    const expired = dispatchCommand(beforeExpiry.state, { type: 'TICK' });
    const inactiveIds = expired.events.flatMap((event) =>
      event.type === 'STATUS_EFFECT_CHANGED' && event.effect === 'SHIELD' && !event.active
        ? [event.championId]
        : []);
    expect(expired.state.tick).toBe(expiry);
    expect(inactiveIds).toEqual(['iaido', 'zed']);
    expect(new Set(inactiveIds).size).toBe(2);
    expect(expired.state.party.champions.map(effectiveShieldMitigation)).toEqual([0, 0, 0]);

    const later = dispatchCommand(expired.state, { type: 'TICK', count: 3 });
    expect(later.events.some((event) =>
      event.type === 'STATUS_EFFECT_CHANGED' && event.effect === 'SHIELD' && !event.active)).toBe(false);
  });
});

describe('Sprint 3 Phase 3 independent potion UAT', () => {
  it('brews all five formulas across six monotonically powered same-ID flasks without duplication', () => {
    const recipes: ReadonlyArray<readonly [string, RuneId]> = [
      ['VI', 'VI'], ['YA', 'YA'], ['EE', 'POWER_EE'], ['KU', 'KU'], ['BRO', 'BRO']
    ];
    const powers: readonly RuneId[] = ['LO', 'UM', 'ON', 'POWER_EE', 'PAL', 'MON'];
    const successSeed = qaSeed((value) => value < 0.55);
    for (const [recipeId, recipeRune] of recipes) {
      for (let power = 0; power < powers.length; power++) {
        let state = withRank(addFlask(partyOf('iaido'), 'qa-flask', 'backpack'), PRIEST_POTION, 15);
        state = patchChampion(state, 0, { mana: 99 });
        state = selectFlask(state, 'qa-flask');
        state = formula({ ...state, rngState: successSeed }, [powers[power]!, recipeRune]);
        const beforeCount = Object.keys(state.items).length;
        const result = invoke(state);
        expect(result.state.items['qa-flask']?.instanceId).toBe('qa-flask');
        expect(result.state.items['qa-flask']?.potion).toEqual({ recipeId, power });
        expect(result.state.party.champions[0]!.inventory.backpack[3]).toBe('qa-flask');
        expect(Object.keys(result.state.items)).toHaveLength(beforeCount);
        expect(result.events).toContainEqual(expect.objectContaining({
          type: 'POTION_BREWED', recipeId, itemId: 'qa-flask'
        }));
        expect(result.events).toContainEqual(expect.objectContaining({
          type: 'SKILL_XP_AWARDED', subskill: PRIEST_POTION, amount: 12 + power * 4
        }));
      }
    }
  });

  it('preserves the flask on fizzle and destroys only the selected flask on backfire', () => {
    const outcomes = [
      { type: 'SPELL_FIZZLED', seed: qaSeed((value) => value >= 0.6 && value < 0.85), survives: true },
      { type: 'SPELL_BACKFIRED', seed: qaSeed((value) => value >= 0.85), survives: false }
    ] as const;
    for (const outcome of outcomes) {
      let state = addFlask(addFlask(partyOf('iaido'), 'selected'), 'other', 'backpack');
      state = withRank(state, PRIEST_POTION, 1);
      state = selectFlask(state, 'selected');
      state = formula({ ...state, rngState: outcome.seed }, ['LO', 'VI']);
      const before = state.party.champions[0]!;
      const result = invoke(state);
      expect(result.events.some((event) => event.type === outcome.type)).toBe(true);
      expect(Boolean(result.state.items.selected)).toBe(outcome.survives);
      expect(result.state.items.other).toBeDefined();
      expect(result.state.party.champions[0]!.inventory.backpack[3]).toBe('other');
      expect(result.state.party.champions[0]!.mana).toBe(before.mana - 3);
      expect(result.events.some((event) => event.type === 'SKILL_XP_AWARDED')).toBe(false);
      if (!outcome.survives) expect(result.state.selectedBrewFlasks.iaido).toBeNull();
    }
  });

  it('rejects stale/non-reachable selected flasks without mutation', () => {
    let state = withRank(addFlask(partyOf('iaido'), 'stale'), PRIEST_POTION, 1);
    state = selectFlask(state, 'stale');
    const champion = state.party.champions[0]!;
    state = patchChampion(state, 0, {
      inventory: {
        ...champion.inventory,
        slots: { ...champion.inventory.slots, pouch1: null }
      }
    });
    state = formula(state, ['LO', 'VI']);
    const result = invoke(state);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'SPELL_REJECTED', reason: 'INVALID_FLASK'
    }));
    expect(result.state.rngState).toBe(state.rngState);
    expect(result.state.party.champions[0]!.mana).toBe(state.party.champions[0]!.mana);
    expect(result.state.items).toBe(state.items);
    expect(result.state.runeFormulas.iaido).toBe(state.runeFormulas.iaido);
  });

  it('consumes one potion for each effect and expires derived Ku strength', () => {
    const recipes = ['VI', 'YA', 'EE', 'KU', 'BRO'] as const;
    for (const recipeId of recipes) {
      let state = addFlask(partyOf('iaido'), `qa-${recipeId}`);
      state = patchChampion(state, 0, {
        health: 1, stamina: 1, mana: 0, poisonSeverity: 30
      });
      state = {
        ...state,
        items: {
          ...state.items,
          [`qa-${recipeId}`]: {
            ...state.items[`qa-${recipeId}`]!,
            name: `PAL ${recipeId} POTION`,
            potion: { recipeId, power: 4 }
          }
        }
      };
      const actor = state.party.champions[0]!;
      const baseStrength = effectiveChampionAttributes(state, actor).strength;
      const result = dispatchCommand(state, {
        type: 'CONSUME_POTION', championIndex: 0, itemId: `qa-${recipeId}`
      });
      expect(result.state.items[`qa-${recipeId}`]).toBeUndefined();
      expect(result.state.party.champions[0]!.inventory.slots.pouch1).toBeNull();
      expect(result.events.filter((event) => event.type === 'POTION_CONSUMED')).toHaveLength(1);
      if (recipeId === 'VI') expect(result.state.party.champions[0]!.health).toBeGreaterThan(1);
      if (recipeId === 'YA') expect(result.state.party.champions[0]!.stamina).toBeGreaterThan(1);
      if (recipeId === 'EE') expect(result.state.party.champions[0]!.mana).toBeGreaterThan(0);
      if (recipeId === 'BRO') expect(result.state.party.champions[0]!.poisonSeverity).toBe(10);
      if (recipeId === 'KU') {
        expect(effectiveChampionAttributes(result.state, result.state.party.champions[0]!).strength)
          .toBe(baseStrength + 5);
        const expiry = result.state.party.champions[0]!.effects[0]!.expiresAtTick;
        const expired = dispatchCommand(result.state, { type: 'TICK', count: expiry - result.state.tick });
        expect(effectiveChampionAttributes(expired.state, expired.state.party.champions[0]!).strength)
          .toBe(baseStrength);
      }
    }
  });
});
