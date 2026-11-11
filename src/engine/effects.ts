import type { ChampionState, EngineEvent, GameState } from './types';

/** Derived mitigation authority; base attributes and champion state remain unchanged. */
export function effectiveShieldMitigation(champion: ChampionState): number {
  return champion.effects.filter((effect) => effect.kind === 'SHIELD')
    .reduce((sum, effect) => sum + effect.magnitude, 0);
}

export function stepEffects(state: GameState, events: EngineEvent[]): GameState {
  let changed = false;
  const champions = state.party.champions.map((champion) => {
    const expired = champion.effects.filter((effect) => effect.expiresAtTick <= state.tick);
    if (expired.length === 0) return champion;
    changed = true;
    for (const effect of expired) events.push({ type: 'STATUS_EFFECT_CHANGED', championId: champion.id, effect: effect.kind, active: false });
    return { ...champion, effects: champion.effects.filter((effect) => effect.expiresAtTick > state.tick) };
  });
  return changed ? { ...state, party: { ...state.party, champions } } : state;
}

export function partyMagicLightBonus(state: GameState): number {
  return state.party.champions.flatMap((champion) => champion.effects)
    .filter((effect) => effect.kind === 'LIGHT')
    .reduce((sum, effect) => sum + effect.magnitude, 0);
}
