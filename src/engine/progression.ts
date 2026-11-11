/**
 * Pure usage-based champion progression for Sprint 3.
 *
 * XP is the sole mutable authority. Mastery ranks are always derived from the
 * immutable threshold table, so rank state cannot drift from earned progress.
 */

import type { ChampionProgression, EngineEvent, GameState } from './types';

export const SKILL_RANK_NAMES = [
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
] as const;

/** Monotonic XP floors for the 16 ranks. */
export const SKILL_THRESHOLDS = [
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

export const SUBSKILL_COUNT = 16;
const MAX_MESSAGE_LOG = 24;

export function experienceFloorForRank(rank: number): number {
  const boundedRank = Math.max(0, Math.min(SKILL_THRESHOLDS.length - 1, Math.trunc(rank)));
  return SKILL_THRESHOLDS[boundedRank]!;
}

export function rankForExperience(experience: number): number {
  const safeExperience = Math.max(0, Math.trunc(experience));
  for (let rank = SKILL_THRESHOLDS.length - 1; rank >= 0; rank--) {
    if (safeExperience >= SKILL_THRESHOLDS[rank]!) return rank;
  }
  return 0;
}

/** Classic deeper-floor practice bonus, bounded to keep arithmetic predictable. */
export function depthExperienceMultiplier(depth: number): number {
  return Math.max(1, Math.min(16, Math.trunc(depth) + 1));
}

export function createProgressionFromRanks(ranks: readonly number[]): ChampionProgression {
  return {
    experience: Array.from({ length: SUBSKILL_COUNT }, (_, index) =>
      experienceFloorForRank(ranks[index] ?? 0)
    )
  };
}

export interface SkillAwardResult {
  readonly state: GameState;
  readonly events: readonly EngineEvent[];
}

/**
 * Awards committed gameplay XP to one champion/subskill.
 * Invalid or rejected award requests are immutable no-ops.
 */
export function awardSkillExperience(
  state: GameState,
  championId: string,
  subskill: number,
  baseXp: number
): SkillAwardResult {
  if (!Number.isInteger(subskill) || subskill < 0 || subskill >= SUBSKILL_COUNT || baseXp <= 0) {
    return { state, events: [] };
  }
  const championIndex = state.party.champions.findIndex((champion) => champion.id === championId);
  if (championIndex < 0) return { state, events: [] };

  const champion = state.party.champions[championIndex]!;
  const oldExperience = champion.progression.experience[subskill] ?? 0;
  const oldRank = rankForExperience(oldExperience);
  const levelDepth = state.levels.find((level) => level.id === state.party.level)?.depth ?? 0;
  const amount = Math.max(1, Math.trunc(baseXp)) * depthExperienceMultiplier(levelDepth);
  const newExperience = oldExperience + amount;
  const newRank = rankForExperience(newExperience);
  const experience = champion.progression.experience.map((value, index) =>
    index === subskill ? newExperience : value
  );
  const nextChampion = { ...champion, progression: { experience } };
  const champions = state.party.champions.map((value, index) =>
    index === championIndex ? nextChampion : value
  );
  const events: EngineEvent[] = [
    {
      type: 'SKILL_XP_AWARDED',
      championId,
      subskill,
      amount,
      total: newExperience
    }
  ];
  if (newRank > oldRank) {
    const message = `${champion.name} ${SKILL_RANK_NAMES[newRank]} RANK!`;
    events.push({
      type: 'SKILL_RANK_GAINED',
      championId,
      subskill,
      previousRank: oldRank,
      rank: newRank,
      rankName: SKILL_RANK_NAMES[newRank]!
    });
    events.push({ type: 'MESSAGE_LOGGED', text: message });
    const messages = [...state.messages, message];
    return {
      state: {
        ...state,
        messages: messages.length > MAX_MESSAGE_LOG ? messages.slice(-MAX_MESSAGE_LOG) : messages,
        party: { ...state.party, champions }
      },
      events
    };
  }
  return {
    state: { ...state, party: { ...state.party, champions } },
    events
  };
}
