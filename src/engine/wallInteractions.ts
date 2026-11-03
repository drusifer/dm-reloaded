/**
 * Hand-aware wall interactions: keyholes, Vi Altars, fountains and alcoves.
 *
 * TLDR:
 *   interactWallFeatures resolves a click on the facing wall using the cursor-hand item.
 *   Precedence with a held item: Keyhole (matching key unlocks + fires the lock actuator, wrong
 *   item is refused) > Vi Altar (BONES revive a fallen champion) > Fountain (refill Waterskin /
 *   Empty Flask) > Alcove (drop onto the wall shelf). With an empty hand: Fountain drinks for the
 *   leader and Alcove picks up the top item. Returns null when no feature applies so the caller can
 *   fall back to buttons/inscriptions. Zero DOM; deterministic.
 */

import { ITEM_CATALOG_180 } from '../data/itemCatalog';
import { triggerActuatorList, updateTileInLevels } from './actuators';
import { reviveChampion } from './survival';
import type {
  Direction,
  EngineEvent,
  GameState,
  ItemDef,
  ItemInstance,
  Tile,
  WallFeature
} from './types';

const FOUNTAIN_DRINK = 600;
const MAX_VITAL = 2048;

function pushMessage(state: GameState, text: string, events: EngineEvent[]): GameState {
  events.push({ type: 'MESSAGE_LOGGED', text });
  const next = [...state.messages, text];
  return { ...state, messages: next.length > 24 ? next.slice(next.length - 24) : next };
}

function sound(
  state: GameState,
  cue: 'LOCK_CLICK' | 'GULP' | 'ITEM_PICKUP',
  x: number,
  y: number,
  events: EngineEvent[]
): void {
  events.push({ type: 'SOUND_CUE', cue, sourceLevel: state.party.level, sourceX: x, sourceY: y });
}

function findDefByName(name: string): ItemDef | undefined {
  return ITEM_CATALOG_180.find((d) => d.name === name);
}

function unlockKeyhole(
  state: GameState,
  tile: Tile,
  feature: WallFeature,
  held: ItemInstance,
  x: number,
  y: number,
  face: Direction,
  events: EngineEvent[]
): GameState {
  if (held.iconIndex !== feature.requiredItemIcon) {
    return pushMessage(state, 'IT DOES NOT FIT THE LOCK.', events);
  }
  const lockActuators = tile.actuators.filter(
    (a) => a.face === face && (a.id === feature.actuatorId || a.rawType === 4 || a.rawType === 3)
  );
  const levels = updateTileInLevels(state.levels, state.party.level, x, y, (t) => ({
    ...t,
    wallFeatures: t.wallFeatures.map((f) =>
      f.face === face && f.kind === 'KEYHOLE' ? { ...f, unlocked: true } : f
    )
  }));
  let next: GameState = { ...state, levels };
  next = triggerActuatorList(next, state.party.level, x, y, lockActuators, events);
  events.push({ type: 'LOCK_UNLOCKED', x, y, itemName: held.name });
  sound(next, 'LOCK_CLICK', x, y, events);

  if (feature.consumesKey) {
    const { [held.instanceId]: _gone, ...rest } = next.items;
    void _gone;
    next = { ...next, items: rest, handItem: null };
  }
  return pushMessage(next, 'CLICK! THE LOCK TURNS.', events);
}

function interactWithHeldItem(
  state: GameState,
  tile: Tile,
  feats: readonly WallFeature[],
  x: number,
  y: number,
  face: Direction,
  held: ItemInstance,
  events: EngineEvent[]
): GameState | null {
  const keyhole = feats.find((f) => f.kind === 'KEYHOLE');
  if (keyhole) {
    return unlockKeyhole(state, tile, keyhole, held, x, y, face, events);
  }

  if (feats.some((f) => f.kind === 'VI_ALTAR') && held.bonesChampionId) {
    const { [held.instanceId]: _gone, ...rest } = state.items;
    void _gone;
    const consumed: GameState = { ...state, items: rest, handItem: null };
    return reviveChampion(consumed, held.bonesChampionId, events);
  }

  if (feats.some((f) => f.kind === 'FOUNTAIN')) {
    const def = ITEM_CATALOG_180[held.defId];
    if (def?.name === 'WATERSKIN') {
      events.push({ type: 'FOUNTAIN_USED', refilledItem: held.name });
      sound(state, 'GULP', x, y, events);
      const next: GameState = {
        ...state,
        items: { ...state.items, [held.instanceId]: { ...held, charges: 3 } }
      };
      return pushMessage(next, 'THE WATERSKIN IS REFILLED.', events);
    }
    if (def?.name === 'EMPTY FLASK') {
      const full = findDefByName('WATER FLASK');
      if (!full) {
        return pushMessage(state, 'NOTHING HAPPENS.', events);
      }
      events.push({ type: 'FOUNTAIN_USED', refilledItem: held.name });
      sound(state, 'GULP', x, y, events);
      const filled: ItemInstance = {
        ...held,
        defId: full.defId,
        iconIndex: full.iconIndex,
        name: full.name
      };
      const next: GameState = { ...state, items: { ...state.items, [held.instanceId]: filled } };
      return pushMessage(next, 'THE FLASK FILLS WITH WATER.', events);
    }
  }

  if (feats.some((f) => f.kind === 'ALCOVE')) {
    const stacks = tile.wallItems ?? { 0: [], 1: [], 2: [], 3: [] };
    const levels = updateTileInLevels(state.levels, state.party.level, x, y, (t) => ({
      ...t,
      wallItems: { ...stacks, [face]: [...(stacks[face] ?? []), held.instanceId] }
    }));
    events.push({ type: 'ITEM_DROPPED', itemId: held.instanceId, name: held.name });
    sound(state, 'ITEM_PICKUP', x, y, events);
    return { ...state, levels, handItem: null };
  }

  return null;
}

function interactWithEmptyHand(
  state: GameState,
  tile: Tile,
  feats: readonly WallFeature[],
  x: number,
  y: number,
  face: Direction,
  events: EngineEvent[]
): GameState | null {
  if (feats.some((f) => f.kind === 'FOUNTAIN')) {
    const idx = state.party.leaderIndex;
    const leader = state.party.champions[idx];
    if (!leader || !leader.alive) {
      return null;
    }
    const champions = state.party.champions.map((c, i) =>
      i === idx ? { ...c, water: Math.min(MAX_VITAL, c.water + FOUNTAIN_DRINK) } : c
    );
    events.push({ type: 'FOUNTAIN_USED', refilledItem: null });
    sound(state, 'GULP', x, y, events);
    const next: GameState = { ...state, party: { ...state.party, champions } };
    return pushMessage(next, `${leader.name} DRINKS FROM THE FOUNTAIN.`, events);
  }

  if (feats.some((f) => f.kind === 'ALCOVE')) {
    const stacks = tile.wallItems ?? { 0: [], 1: [], 2: [], 3: [] };
    const stack = [...(stacks[face] ?? [])];
    const top = stack.pop();
    const item = top ? state.items[top] : undefined;
    if (!top || !item) {
      return null;
    }
    const levels = updateTileInLevels(state.levels, state.party.level, x, y, (t) => ({
      ...t,
      wallItems: { ...stacks, [face]: stack }
    }));
    events.push({ type: 'ITEM_PICKED_UP', itemId: top, name: item.name });
    sound(state, 'ITEM_PICKUP', x, y, events);
    return { ...state, levels, handItem: top };
  }

  return null;
}

/**
 * Resolves a facing-wall click using the cursor-hand item. `face` is the wall face pointing back
 * at the party. Returns null when no hand-aware feature applies.
 */
export function interactWallFeatures(
  state: GameState,
  tile: Tile,
  x: number,
  y: number,
  face: Direction,
  events: EngineEvent[]
): GameState | null {
  const feats = tile.wallFeatures.filter((f) => f.face === face);
  if (feats.length === 0) {
    return null;
  }
  const held = state.handItem ? state.items[state.handItem] : undefined;
  return held
    ? interactWithHeldItem(state, tile, feats, x, y, face, held, events)
    : interactWithEmptyHand(state, tile, feats, x, y, face, events);
}
