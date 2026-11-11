import { describe, expect, it } from 'vitest';
import {
  MAGIC_RUNES,
  POTION_RECIPES,
  dispatchCommand,
  effectiveShieldMitigation,
  experienceFloorForRank,
  nextRandom
} from '../../src/engine';
import type { GameState, RuneId } from '../../src/engine/types';
import { partyOf, patchChampion, placeAt, run, withItem } from './testkit';

const WIZARD_FIRE = 12;
const PRIEST_POTION = 8;

function seedFor(predicate: (value: number) => boolean): number {
  for (let seed = 1; seed < 20_000; seed++) {
    if (predicate(nextRandom(seed).value)) return seed;
  }
  throw new Error('no deterministic seed found');
}

function withRank(state: GameState, subskill: number, rank: number): GameState {
  const champion = state.party.champions[0]!;
  const experience = champion.progression.experience.map((value, index) =>
    index === subskill ? experienceFloorForRank(rank) : value
  );
  return patchChampion(state, 0, { progression: { experience } });
}

function addFormula(state: GameState, runes: readonly RuneId[]): GameState {
  return runes.reduce((current, rune) => run(current, {
    type: 'ADD_RUNE', championIndex: 0, rune
  }).state, state);
}

function withEmptyFlask(state: GameState, id = 'flask'): GameState {
  const itemState = withItem(state, id, 'EMPTY FLASK');
  const champion = itemState.party.champions[0]!;
  return patchChampion(itemState, 0, {
    inventory: {
      ...champion.inventory,
      slots: { ...champion.inventory.slots, pouch1: id }
    }
  });
}

describe('Sprint 3 Phase 3 rune catalog and formula editing', () => {
  it('defines the ordered 24 runes across four six-rune tiers', () => {
    expect(MAGIC_RUNES).toHaveLength(24);
    expect(MAGIC_RUNES.map((rune) => rune.tier)).toEqual([
      ...new Array(6).fill('POWER'),
      ...new Array(6).fill('ELEMENTAL'),
      ...new Array(6).fill('FORM'),
      ...new Array(6).fill('CLASS')
    ]);
    expect(new Set(MAGIC_RUNES.map((rune) => rune.id)).size).toBe(24);
  });

  it('adds, removes, and clears a champion formula without costs', () => {
    const state = partyOf('iaido');
    const added = addFormula(state, ['LO', 'FUL', 'IR']);
    expect(added.runeFormulas.iaido).toEqual(['LO', 'FUL', 'IR']);
    const removed = run(added, { type: 'REMOVE_RUNE', championIndex: 0 }).state;
    expect(removed.runeFormulas.iaido).toEqual(['LO', 'FUL']);
    const cleared = run(removed, { type: 'CLEAR_RUNES', championIndex: 0 }).state;
    expect(cleared.runeFormulas.iaido).toEqual([]);
    expect(cleared.rngState).toBe(state.rngState);
    expect(cleared.party.champions[0]!.mana).toBe(state.party.champions[0]!.mana);
  });
});

describe('Sprint 3 Phase 3 spell transactions', () => {
  it('blocks None-rank Lo Ful Ir without mana, RNG, projectile, or XP changes', () => {
    let state = withRank(partyOf('iaido'), WIZARD_FIRE, 0);
    state = addFormula(state, ['LO', 'FUL', 'IR']);
    const before = state;
    const result = dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 0 });
    expect(result.state.rngState).toBe(before.rngState);
    expect(result.state.party.champions[0]!.mana).toBe(before.party.champions[0]!.mana);
    expect(result.state.party.champions[0]!.progression).toBe(before.party.champions[0]!.progression);
    expect(result.state.projectiles).toEqual([]);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'SPELL_REJECTED', reason: 'INSUFFICIENT_SKILL' }));
  });

  it('allows Neophyte Lo Ful Ir, spends one draw/cost, launches a spell, clears formula, and awards Wizard XP', () => {
    let state = withRank(partyOf('iaido'), WIZARD_FIRE, 1);
    state = placeAt(state, 0, 1, 2, 1);
    state = addFormula({ ...state, rngState: seedFor((value) => value < 0.6) }, ['LO', 'FUL', 'IR']);
    const champion = state.party.champions[0]!;
    const draw = nextRandom(state.rngState);
    const result = dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 0 });
    expect(result.state.rngState).toBe(draw.nextState);
    expect(result.state.party.champions[0]!.mana).toBeLessThan(champion.mana);
    expect(result.state.runeFormulas.iaido).toEqual([]);
    expect(result.state.projectiles[0]).toMatchObject({
      ownerChampionId: 'iaido',
      payload: { kind: 'SPELL', spellId: 'FIREBALL', effectId: 'FIRE', explosive: true }
    });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'SPELL_SUCCEEDED', spellId: 'FIREBALL' }));
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'SKILL_XP_AWARDED', subskill: WIZARD_FIRE }));
  });

  it('uses one deterministic draw for fizzle/backfire, charging mana but awarding no XP', () => {
    for (const [outcome, predicate] of [
      ['SPELL_FIZZLED', (value: number) => value >= 0.6 && value < 0.85],
      ['SPELL_BACKFIRED', (value: number) => value >= 0.85]
    ] as const) {
      let state = withRank(partyOf('iaido'), WIZARD_FIRE, 1);
      state = addFormula({ ...state, rngState: seedFor(predicate) }, ['LO', 'FUL', 'IR']);
      const champion = state.party.champions[0]!;
      const draw = nextRandom(state.rngState);
      const result = dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 0 });
      expect(result.state.rngState).toBe(draw.nextState);
      expect(result.state.party.champions[0]!.mana).toBeLessThan(champion.mana);
      expect(result.state.projectiles).toEqual([]);
      expect(result.events.some((event) => event.type === outcome)).toBe(true);
      expect(result.events.some((event) => event.type === 'SKILL_XP_AWARDED')).toBe(false);
      if (outcome === 'SPELL_BACKFIRED') {
        expect(result.state.party.champions[0]!.health).toBeLessThan(champion.health);
      }
    }
  });

  it('opens an eligible door and expires light/shield effects on absolute ticks', () => {
    let state = withRank(partyOf('iaido'), WIZARD_FIRE, 2);
    state = placeAt(state, 0, 5, 2, 2); // clean-room wooden door at 5,3
    state = addFormula({ ...state, rngState: seedFor((value) => value < 0.65) }, ['LO', 'ZO']);
    const opened = dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 0 });
    expect(opened.state.levels[0]!.tiles[3]![5]!.door?.progress).toBe(0);

    let effects = patchChampion(opened.state, 0, { mana: opened.state.party.champions[0]!.maxMana });
    effects = addFormula({ ...effects, rngState: seedFor((value) => value < 0.65) }, ['LO', 'OH', 'IR', 'RA']);
    effects = dispatchCommand(effects, { type: 'INVOKE_RUNES', championIndex: 0 }).state;
    effects = patchChampion(effects, 0, { mana: effects.party.champions[0]!.maxMana });
    effects = addFormula({ ...effects, rngState: seedFor((value) => value < 0.65) }, ['LO', 'YA', 'IR']);
    effects = dispatchCommand(effects, { type: 'INVOKE_RUNES', championIndex: 0 }).state;
    expect(effects.party.champions[0]!.effects.map((effect) => effect.kind)).toEqual(expect.arrayContaining(['LIGHT', 'SHIELD']));
    const maxExpiry = Math.max(...effects.party.champions[0]!.effects.map((effect) => effect.expiresAtTick));
    const expired = dispatchCommand(effects, { type: 'TICK', count: maxExpiry - effects.tick }).state;
    expect(expired.party.champions[0]!.effects).toEqual([]);
  });

  it('applies Shield to every living champion, derives mitigation, and expires each status once', () => {
    let state = withRank(partyOf('iaido', 'zed', 'chani'), WIZARD_FIRE, 1);
    state = patchChampion(state, 2, { alive: false });
    const baseAttributes = state.party.champions.map((champion) => champion.attributes);
    state = addFormula({ ...state, rngState: seedFor((value) => value < 0.6) }, ['LO', 'YA', 'IR']);

    const cast = dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 0 });
    expect(cast.state.party.champions.map((champion) => champion.effects.some((effect) => effect.kind === 'SHIELD')))
      .toEqual([true, true, false]);
    expect(cast.state.party.champions.map((champion) => champion.attributes)).toEqual(baseAttributes);
    expect(cast.state.party.champions.map(effectiveShieldMitigation)).toEqual([1, 1, 0]);

    const expiry = cast.state.party.champions[0]!.effects.find((effect) => effect.kind === 'SHIELD')!.expiresAtTick;
    const expired = dispatchCommand(cast.state, { type: 'TICK', count: expiry - cast.state.tick });
    expect(expired.state.party.champions.map(effectiveShieldMitigation)).toEqual([0, 0, 0]);
    expect(expired.events.filter((event) => event.type === 'STATUS_EFFECT_CHANGED' && event.effect === 'SHIELD' && !event.active))
      .toHaveLength(2);
    const oneLater = dispatchCommand(expired.state, { type: 'TICK' });
    expect(oneLater.events.some((event) => event.type === 'STATUS_EFFECT_CHANGED' && event.effect === 'SHIELD')).toBe(false);
  });
});

describe('Sprint 3 Phase 3 brewing and potion consumption', () => {
  it('transforms the selected reachable flask in place for all five powered recipes', () => {
    for (const recipe of POTION_RECIPES) {
      let state = withRank(withEmptyFlask(partyOf('iaido')), PRIEST_POTION, 1);
      state = run(state, { type: 'SELECT_BREW_FLASK', championIndex: 0, flaskId: 'flask' }).state;
      state = addFormula({ ...state, rngState: seedFor((value) => value < 0.6) }, ['LO', recipe.rune]);
      const result = dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 0 });
      expect(result.state.items.flask?.instanceId).toBe('flask');
      expect(result.state.items.flask?.potion).toEqual({ recipeId: recipe.id, power: 0 });
      expect(result.state.party.champions[0]!.inventory.slots.pouch1).toBe('flask');
      expect(Object.keys(result.state.items).filter((id) => id === 'flask')).toHaveLength(1);
      expect(result.events).toContainEqual(expect.objectContaining({ type: 'POTION_BREWED', recipeId: recipe.id }));
    }
  });

  it('preserves a selected flask on fizzle and destroys exactly it on backfire', () => {
    for (const [outcome, predicate, survives] of [
      ['SPELL_FIZZLED', (value: number) => value >= 0.6 && value < 0.85, true],
      ['SPELL_BACKFIRED', (value: number) => value >= 0.85, false]
    ] as const) {
      let state = withRank(withEmptyFlask(partyOf('iaido')), PRIEST_POTION, 1);
      state = run(state, { type: 'SELECT_BREW_FLASK', championIndex: 0, flaskId: 'flask' }).state;
      state = addFormula({ ...state, rngState: seedFor(predicate) }, ['LO', 'VI']);
      const result = dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 0 });
      expect(result.events.some((event) => event.type === outcome)).toBe(true);
      expect(Boolean(result.state.items.flask)).toBe(survives);
      expect(result.state.party.champions[0]!.inventory.slots.pouch1).toBe(survives ? 'flask' : null);
      if (!survives) expect(result.state.selectedBrewFlasks.iaido).toBeNull();
      expect(result.events.some((event) => event.type === 'SKILL_XP_AWARDED')).toBe(false);
    }
  });

  it('consumes one potion and applies Vi/Ya/Ee/Ku/Bro effects with power scaling', () => {
    for (const [recipeId, setup, assertion] of [
      ['VI', { health: 1 }, (state: GameState) => expect(state.party.champions[0]!.health).toBeGreaterThan(1)],
      ['YA', { stamina: 1 }, (state: GameState) => expect(state.party.champions[0]!.stamina).toBeGreaterThan(1)],
      ['EE', { mana: 0 }, (state: GameState) => expect(state.party.champions[0]!.mana).toBeGreaterThan(0)],
      ['KU', {}, (state: GameState) => expect(state.party.champions[0]!.effects.some((effect) => effect.kind === 'STRENGTH')).toBe(true)],
      ['BRO', { poisonSeverity: 3 }, (state: GameState) => expect(state.party.champions[0]!.poisonSeverity).toBe(0)]
    ] as const) {
      let state = withEmptyFlask(partyOf('iaido'), `potion-${recipeId}`);
      state = patchChampion(state, 0, setup);
      state = {
        ...state,
        items: {
          ...state.items,
          [`potion-${recipeId}`]: {
            ...state.items[`potion-${recipeId}`]!,
            name: `MON ${recipeId} POTION`,
            potion: { recipeId, power: 5 }
          }
        }
      };
      const result = dispatchCommand(state, {
        type: 'CONSUME_POTION', championIndex: 0, itemId: `potion-${recipeId}`
      });
      expect(result.state.items[`potion-${recipeId}`]).toBeUndefined();
      expect(result.state.party.champions[0]!.inventory.slots.pouch1).toBeNull();
      assertion(result.state);
      expect(result.events).toContainEqual(expect.objectContaining({ type: 'POTION_CONSUMED', recipeId }));
    }
  });
});
