/** Deterministic passive targets for Sprint 3 review; no monster AI or campaign mutation. */

import { createInitialGameState } from './simulation';
import { DIRECTION_DELTAS, type CampaignBundle, type GameState } from './types';

export function createSprint3ReviewScenario(bundle: CampaignBundle): GameState {
  const state = createInitialGameState(bundle);
  const { dx, dy } = DIRECTION_DELTAS[state.party.facing];
  const x = state.party.x + dx;
  const y = state.party.y + dy;
  return {
    ...state,
    combatTargets: [
      { id: 'training-left', level: state.party.level, x, y, lane: 'LEFT', traits: [], maxHealth: 100, health: 100, defeated: false },
      { id: 'training-right', level: state.party.level, x, y, lane: 'RIGHT', traits: [], maxHealth: 100, health: 100, defeated: false }
    ]
  };
}
