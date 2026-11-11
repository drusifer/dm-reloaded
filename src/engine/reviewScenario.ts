/** Deterministic passive targets for Sprint 3 review; no monster AI or campaign mutation. */

import { expandMonsterGroups } from './monsterSpawn';
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

/**
 * Sprint 4 bounded review arena: a lit 10x3 corridor at level 0 with a Screamer pair and a Ghost.
 * Applies to an already-recruited party; used by headless tests and the actual-browser gate.
 */
export function createSprint4ReviewScenario(state: GameState): GameState {
  const floor = { type: 'FLOOR' as const, rawFlags: 0, wallFeatures: [], actuators: [], itemNames: [] };
  const wall = { ...floor, type: 'WALL' as const };
  const width = 10;
  const height = 3;
  const level = {
    id: 0, name: 'Sprint 4 Review Arena', width, height, offsetX: 0, offsetY: 0, depth: 1, ambientLight: 5,
    tiles: Array.from({ length: height }, (_, y) => Array.from({ length: width }, () => (y === 1 ? floor : wall)))
  };
  const groups = [
    { id: 'rv_screamer', typeId: 6, level: 0, x: 4, y: 1, facing: 3 as const, healths: [55, 55] },
    { id: 'rv_ghost', typeId: 8, level: 0, x: 8, y: 1, facing: 3 as const, healths: [60] }
  ];
  return {
    ...state,
    levels: [level],
    party: { ...state.party, level: 0, x: 1, y: 1, facing: 1, moveCooldownTicks: 0 },
    combatTargets: expandMonsterGroups(groups),
    monsterGenerators: []
  };
}
