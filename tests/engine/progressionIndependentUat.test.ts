import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import { nextRandom as legacyNextRandom } from '../../src/engine/clock';
import {
  awardSkillExperience,
  createInitialGameState,
  dispatchCommand,
  nextRandom,
  rankForExperience
} from '../../src/engine';

const REFERENCE_RANK_FLOORS = [
  0,
  100,
  250,
  500,
  1_000,
  2_000,
  4_000,
  8_000,
  16_000,
  32_000,
  64_000,
  128_000,
  256_000,
  512_000,
  1_024_000,
  2_048_000
] as const;

function referenceDraw(seedState: number): { readonly value: number; readonly nextState: number } {
  const nextState = (seedState + 1_831_565_813) | 0;
  let mixed = Math.imul(nextState ^ (nextState >>> 15), nextState | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return { value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296, nextState };
}

function recruit(mode: 'RESURRECT' | 'REINCARNATE', championId: 'iaido' | 'zed' = 'iaido') {
  const bundle = createCleanRoomBundle();
  const definition = bundle.dungeon.champions[championId]!;
  const initial = createInitialGameState(bundle);
  const stateAtMirror = {
    ...initial,
    activeMirror: { wallX: 2, wallY: 1, face: 2 as const, champion: definition }
  };
  return {
    definition,
    initial,
    result: dispatchCommand(stateAtMirror, { type: 'RECRUIT_CHAMPION', mode })
  };
}

describe('Sprint 3 Phase 1 independent UAT', () => {
  it('matches a pinned Mulberry32 vector and preserves the clock compatibility export', () => {
    expect(nextRandom(0)).toEqual({ value: 0.26642920868471265, nextState: 1_831_565_813 });
    expect(legacyNextRandom(0)).toEqual(nextRandom(0));

    const first = nextRandom(99);
    const referenceFirst = referenceDraw(99);
    const second = nextRandom(first.nextState);
    const referenceSecond = referenceDraw(referenceFirst.nextState);
    expect(first).toEqual(referenceFirst);
    expect(second).toEqual(referenceSecond);
    expect(second.nextState).toBe(-631_835_571);
  });

  it('derives every mastery boundary from XP without importing production floors', () => {
    for (let rank = 0; rank < REFERENCE_RANK_FLOORS.length; rank++) {
      const floor = REFERENCE_RANK_FLOORS[rank]!;
      expect(rankForExperience(floor)).toBe(rank);
      if (rank > 0) expect(rankForExperience(floor - 1)).toBe(rank - 1);
    }
    expect(rankForExperience(-1)).toBe(0);
    expect(rankForExperience(Number.NaN)).toBe(0);
    expect(rankForExperience(REFERENCE_RANK_FLOORS.at(-1)! + 1_000_000)).toBe(15);
  });

  it('awards only one track with the configured depth multiplier and one rank event', () => {
    const { result } = recruit('REINCARNATE');
    const state = {
      ...result.state,
      party: { ...result.state.party, level: 2 }
    };
    const champion = state.party.champions[0]!;

    const practice = awardSkillExperience(state, champion.id, 7, 3);
    expect(practice.state.party.champions[0]!.progression.experience[7]).toBe(9);
    expect(practice.events).toEqual([
      { type: 'SKILL_XP_AWARDED', championId: champion.id, subskill: 7, amount: 9, total: 9 }
    ]);
    expect(state.party.champions[0]!.progression.experience).toEqual(new Array(16).fill(0));
    expect(practice.state.rngState).toBe(state.rngState);

    const crossing = awardSkillExperience(practice.state, champion.id, 7, 31);
    expect(crossing.state.party.champions[0]!.progression.experience[7]).toBe(102);
    expect(crossing.events.filter((event) => event.type === 'SKILL_RANK_GAINED')).toEqual([
      {
        type: 'SKILL_RANK_GAINED',
        championId: champion.id,
        subskill: 7,
        previousRank: 0,
        rank: 1,
        rankName: 'NEOPHYTE'
      }
    ]);
    expect(crossing.events.filter((event) => event.type === 'MESSAGE_LOGGED')).toHaveLength(1);
  });

  it('keeps rejected awards as identity no-ops with no XP, message, event, or RNG draw', () => {
    const { result } = recruit('RESURRECT');
    const champion = result.state.party.champions[0]!;
    const attempts = [
      awardSkillExperience(result.state, 'not-a-champion', 0, 10),
      awardSkillExperience(result.state, champion.id, 16, 10),
      awardSkillExperience(result.state, champion.id, 0, -10)
    ];

    for (const attempt of attempts) {
      expect(attempt.state).toBe(result.state);
      expect(attempt.events).toEqual([]);
      expect(attempt.state.rngState).toBe(result.state.rngState);
      expect(attempt.state.messages).toBe(result.state.messages);
      expect(attempt.state.party.champions[0]!.progression).toBe(champion.progression);
    }
  });

  it('materializes Resurrect source ranks at independent floors without a draw', () => {
    const { definition, initial, result } = recruit('RESURRECT');
    const champion = result.state.party.champions[0]!;
    const expected = Array.from({ length: 16 }, (_, index) =>
      REFERENCE_RANK_FLOORS[definition.skills[index] ?? 0]
    );

    expect(champion.progression.experience).toEqual(expected);
    expect(champion.skills).toEqual(definition.skills);
    expect(result.state.rngState).toBe(initial.rngState);
  });

  it('resets Reincarnate progression and preserves the independent two-draw boost', () => {
    const { definition, initial, result } = recruit('REINCARNATE', 'zed');
    const first = referenceDraw(initial.rngState);
    const second = referenceDraw(first.nextState);
    const attributeBonus = 2 + Math.floor(first.value * 3);
    const healthBonus = 3 + Math.floor(second.value * 5);
    const champion = result.state.party.champions[0]!;

    expect(result.state.rngState).toBe(second.nextState);
    expect(champion.progression.experience).toEqual(new Array(16).fill(0));
    expect(champion.skills).toEqual(new Array(16).fill(0));
    expect(champion.maxHealth).toBe(definition.maxHealth + healthBonus);
    expect(champion.attributes.strength).toBe(definition.attributes.strength + attributeBonus);
    expect(champion.attributes.dexterity).toBe(definition.attributes.dexterity + attributeBonus);
    expect(champion.attributes.wisdom).toBe(definition.attributes.wisdom + attributeBonus);
    expect(champion.attributes.vitality).toBe(definition.attributes.vitality + attributeBonus);
  });

  it('retains Sprint 2 movement and inventory behavior after recruitment', () => {
    const { result } = recruit('RESURRECT');
    const before = result.state.party.champions[0]!.progression;
    const moved = dispatchCommand(result.state, { type: 'MOVE', direction: 'FORWARD' });
    const inventory = dispatchCommand(moved.state, { type: 'TOGGLE_INVENTORY', championIndex: 0 });

    expect(moved.state.party.x).toBe(2);
    expect(moved.state.party.y).toBe(2);
    expect(moved.state.party.champions[0]!.progression).toBe(before);
    expect(inventory.state.openInventoryChampionIndex).toBe(0);
    expect(inventory.state.party.champions[0]!.progression).toBe(before);
  });
});
