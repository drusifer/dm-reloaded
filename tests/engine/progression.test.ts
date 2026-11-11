import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import {
  SKILL_RANK_NAMES,
  SKILL_THRESHOLDS,
  awardSkillExperience,
  createInitialGameState,
  depthExperienceMultiplier,
  dispatchCommand,
  experienceFloorForRank,
  nextRandom,
  rankForExperience
} from '../../src/engine';

function recruit(mode: 'RESURRECT' | 'REINCARNATE', championId = 'iaido') {
  const bundle = createCleanRoomBundle();
  const champion = bundle.dungeon.champions[championId]!;
  const initial = createInitialGameState(bundle);
  const withMirror = {
    ...initial,
    activeMirror: { wallX: 2, wallY: 1, face: 2 as const, champion }
  };
  return {
    definition: champion,
    initial,
    result: dispatchCommand(withMirror, { type: 'RECRUIT_CHAMPION', mode })
  };
}

describe('Sprint 3 deterministic RNG authority', () => {
  it('advances one specified integer state per draw with reproducible values', () => {
    const first = nextRandom(99);
    const repeated = nextRandom(99);
    const second = nextRandom(first.nextState);

    expect(first).toEqual(repeated);
    expect(first.nextState).toBe((99 + 0x6d2b79f5) | 0);
    expect(first.value).toBeGreaterThanOrEqual(0);
    expect(first.value).toBeLessThan(1);
    expect(second.nextState).not.toBe(first.nextState);
  });
});

describe('Sprint 3 usage progression authority', () => {
  it('defines all ordered ranks and derives rank solely from monotonic XP floors', () => {
    expect(SKILL_RANK_NAMES).toEqual([
      'NONE',
      'NEOPHYTE',
      'NOVICE',
      'APPRENTICE',
      'JOURNEYMAN',
      'CRAFTSMAN',
      'ARTISAN',
      'ADEPT',
      'EXPERT',
      'LO MASTER',
      'UM MASTER',
      'ON MASTER',
      'EE MASTER',
      'PAL MASTER',
      'MON MASTER',
      'ARCHMASTER'
    ]);
    expect(SKILL_THRESHOLDS).toHaveLength(16);
    expect(SKILL_THRESHOLDS.every((floor, rank) => rank === 0 || floor > SKILL_THRESHOLDS[rank - 1]!)).toBe(true);

    for (let rank = 0; rank < SKILL_THRESHOLDS.length; rank++) {
      const floor = experienceFloorForRank(rank);
      expect(floor).toBe(SKILL_THRESHOLDS[rank]);
      expect(rankForExperience(floor)).toBe(rank);
      if (rank > 0) expect(rankForExperience(floor - 1)).toBe(rank - 1);
    }
  });

  it('uses a deterministic deeper-level multiplier', () => {
    expect(depthExperienceMultiplier(0)).toBe(1);
    expect(depthExperienceMultiplier(4)).toBeGreaterThan(depthExperienceMultiplier(1));
    expect(depthExperienceMultiplier(4)).toBe(depthExperienceMultiplier(4));
  });

  it('materializes Resurrect ranks to XP floors without consuming RNG', () => {
    const { definition, initial, result } = recruit('RESURRECT');
    const recruited = result.state.party.champions[0]!;

    expect(result.state.rngState).toBe(initial.rngState);
    expect(recruited.skills).toEqual(definition.skills);
    expect(recruited.progression.experience).toEqual(
      definition.skills.map((rank) => experienceFloorForRank(rank))
    );
  });

  it('starts Reincarnate progression at None and consumes exactly two RNG draws', () => {
    const { initial, result } = recruit('REINCARNATE', 'zed');
    const afterOne = nextRandom(initial.rngState);
    const afterTwo = nextRandom(afterOne.nextState);
    const recruited = result.state.party.champions[0]!;

    expect(result.state.rngState).toBe(afterTwo.nextState);
    expect(recruited.skills).toEqual(new Array(16).fill(0));
    expect(recruited.progression.experience).toEqual(new Array(16).fill(0));
  });

  it('awards only the acting champion/subskill and emits one final rank crossing', () => {
    const { result } = recruit('RESURRECT');
    const state = {
      ...result.state,
      party: { ...result.state.party, level: 1 }
    };
    const champion = state.party.champions[0]!;
    const subskill = 0;
    const startRank = rankForExperience(champion.progression.experience[subskill]!);
    const baseXp = experienceFloorForRank(startRank + 2) - champion.progression.experience[subskill]!;
    const awarded = awardSkillExperience(state, champion.id, subskill, baseXp);

    const nextChampion = awarded.state.party.champions[0]!;
    expect(nextChampion.progression.experience[subskill]).toBeGreaterThan(
      champion.progression.experience[subskill]!
    );
    expect(nextChampion.progression.experience.filter((xp, index) => xp !== champion.progression.experience[index])).toHaveLength(1);
    expect(awarded.events.filter((event) => event.type === 'SKILL_XP_AWARDED')).toHaveLength(1);
    expect(awarded.events.filter((event) => event.type === 'SKILL_RANK_GAINED')).toHaveLength(1);
    expect(awarded.events.filter((event) => event.type === 'MESSAGE_LOGGED')).toHaveLength(1);
    expect(awarded.state.messages.at(-1)).toContain('RANK');
  });

  it('does not award XP for rejected or invalid award requests', () => {
    const { result } = recruit('RESURRECT');
    const state = result.state;

    expect(awardSkillExperience(state, 'missing', 0, 10)).toEqual({ state, events: [] });
    expect(awardSkillExperience(state, state.party.champions[0]!.id, -1, 10)).toEqual({ state, events: [] });
    expect(awardSkillExperience(state, state.party.champions[0]!.id, 0, 0)).toEqual({ state, events: [] });

    const inspected = dispatchCommand(state, { type: 'TOGGLE_INVENTORY', championIndex: 0 });
    expect(inspected.state.party.champions[0]!.progression).toEqual(state.party.champions[0]!.progression);
  });
});
