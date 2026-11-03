/**
 * Shared deterministic helpers for engine tests on the clean-room campaign.
 *
 * TLDR:
 *   run/lastMessage wrap dispatchCommand; withItem/hold manage the item map and cursor hand;
 *   partyOf recruits champions through the real mirror flow; placeAt/tileAt position the party and
 *   read tiles; tick advances the 6 Hz clock.
 */

import { createCleanRoomBundle } from '../../src/data';
import { findItemDefByLegacyName } from '../../src/data/itemCatalog';
import { createInitialGameState, dispatchCommand } from '../../src/engine';
import type {
  Direction,
  EngineEvent,
  GameCommand,
  GameState,
  ItemInstanceId,
  Tile
} from '../../src/engine/types';

export function run(
  state: GameState,
  cmd: GameCommand
): { state: GameState; events: readonly EngineEvent[] } {
  return dispatchCommand(state, cmd);
}

export function tick(state: GameState, count = 1): { state: GameState; events: readonly EngineEvent[] } {
  return dispatchCommand(state, { type: 'TICK', count });
}

export function lastMessage(state: GameState): string | undefined {
  return state.messages[state.messages.length - 1];
}

export function withItem(
  state: GameState,
  id: ItemInstanceId,
  legacyName: string,
  extra: { charges?: number } = {}
): GameState {
  const def = findItemDefByLegacyName(legacyName);
  return {
    ...state,
    items: {
      ...state.items,
      [id]: { instanceId: id, defId: def.defId, iconIndex: def.iconIndex, name: def.name, charges: extra.charges ?? 0 }
    }
  };
}

export function hold(state: GameState, id: ItemInstanceId | null): GameState {
  return { ...state, handItem: id };
}

/** Initial state with champion(s) recruited through the real mirror flow. */
export function partyOf(...ids: string[]): GameState {
  const bundle = createCleanRoomBundle();
  let state = createInitialGameState(bundle);
  for (const id of ids) {
    const champion = bundle.dungeon.champions[id]!;
    state = { ...state, activeMirror: { wallX: 2, wallY: 1, face: 2, champion } };
    state = run(state, { type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' }).state;
  }
  return state;
}

export function placeAt(state: GameState, level: number, x: number, y: number, facing: Direction): GameState {
  return { ...state, party: { ...state.party, level, x, y, facing, moveCooldownTicks: 0 } };
}

export function tileAt(state: GameState, level: number, x: number, y: number): Tile {
  return state.levels.find((l) => l.id === level)!.tiles[y]![x]!;
}

/** All item ids lying on any floor quadrant of a level. */
export function floorItemIds(state: GameState, level: number): string[] {
  const out: string[] = [];
  for (const row of state.levels.find((l) => l.id === level)!.tiles) {
    for (const t of row) {
      for (const bucket of Object.values(t.floorItems ?? {})) {
        out.push(...bucket);
      }
    }
  }
  return out;
}

export function setStrength(state: GameState, index: number, strength: number): GameState {
  const champions = state.party.champions.map((c, i) =>
    i === index ? { ...c, attributes: { ...c.attributes, strength } } : c
  );
  return { ...state, party: { ...state.party, champions } };
}

export function patchChampion(
  state: GameState,
  index: number,
  patch: Partial<GameState['party']['champions'][number]>
): GameState {
  const champions = state.party.champions.map((c, i) => (i === index ? { ...c, ...patch } : c));
  return { ...state, party: { ...state.party, champions } };
}
