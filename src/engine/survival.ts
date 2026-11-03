/**
 * Pure 6 Hz SurvivalEngine: food/water metabolism, regeneration, torch burn, sleep, death and rebirth.
 *
 * TLDR:
 *   stepSurvival runs once per tick: food/water drain (slower asleep), stamina/health/mana regen
 *   while fed, starvation damage when food or water is negative, torch charge burn (icon 4..7),
 *   and champion death (items + "<NAME> BONES" drop to the floor, leader reassigned, game over when
 *   the whole party is dead). setSleeping toggles Sleep; reviveChampion restores a fallen champion
 *   (used by the Vi Altar). Zero DOM; deterministic.
 */

import { effectiveChampionAttributes, effectiveChampionMaxMana } from './inventory';
import { findItemDefByLegacyName, torchIconForCharges } from '../data/itemCatalog';
import { updateTileInLevels } from './actuators';
import {
  ALL_EQUIP_SLOTS,
  BACKPACK_SLOT_COUNT,
  type ChampionState,
  type EngineEvent,
  type EquipSlotId,
  type GameState,
  type ItemInstance,
  type ItemInstanceId,
  type SubTileQuadrant
} from './types';

export const FOOD_WATER_MIN = -1024;
export const FOOD_WATER_MAX = 2048;
export const FOOD_WATER_START = 1500;

/** Ticks between 1-point food/water drains. */
export const DRAIN_PERIOD_AWAKE = 4;
export const DRAIN_PERIOD_ASLEEP = 8;
/** Ticks between stamina/health/mana regen or starvation damage steps. */
export const REGEN_PERIOD_AWAKE = 6;
export const REGEN_PERIOD_ASLEEP = 2;
/** Ticks per torch charge. */
export const TORCH_BURN_PERIOD = 24;

const TORCH_NAME = 'TORCH';

function clampVital(v: number): number {
  return Math.max(FOOD_WATER_MIN, Math.min(FOOD_WATER_MAX, v));
}

export { torchIconForCharges } from '../data/itemCatalog';

function pushMessage(state: GameState, text: string, events: EngineEvent[]): GameState {
  events.push({ type: 'MESSAGE_LOGGED', text });
  const next = [...state.messages, text];
  return { ...state, messages: next.length > 24 ? next.slice(next.length - 24) : next };
}

function emptyInventory(c: ChampionState): ChampionState {
  const slots = {} as Record<EquipSlotId, ItemInstanceId | null>;
  for (const s of ALL_EQUIP_SLOTS) {
    slots[s] = null;
  }
  return {
    ...c,
    leftHand: null,
    rightHand: null,
    inventory: { slots, backpack: new Array<ItemInstanceId | null>(BACKPACK_SLOT_COUNT).fill(null) }
  };
}

function carriedIds(c: ChampionState): ItemInstanceId[] {
  const ids: ItemInstanceId[] = [];
  for (const s of ALL_EQUIP_SLOTS) {
    const id = c.inventory.slots[s];
    if (id) {
      ids.push(id);
    }
  }
  for (const id of c.inventory.backpack) {
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

/** Kills a champion: drops gear + BONES on the party tile and reassigns leader / ends the game. */
export function killChampion(state: GameState, index: number, events: EngineEvent[]): GameState {
  const champ = state.party.champions[index];
  if (!champ || !champ.alive) {
    return state;
  }

  const boneDef = findItemDefByLegacyName('BONES');
  const bonesId = `bones_${champ.id}`;
  const bones: ItemInstance = {
    instanceId: bonesId,
    defId: boneDef.defId,
    iconIndex: boneDef.iconIndex,
    name: `${champ.name} BONES`,
    charges: 0,
    bonesChampionId: champ.id
  };

  const { level, x, y } = state.party;
  const dropQuadrant = (index % 4) as SubTileQuadrant;
  const dropped = [...carriedIds(champ), bonesId];
  const levels = updateTileInLevels(state.levels, level, x, y, (t) => {
    const stacks = t.floorItems ?? { 0: [], 1: [], 2: [], 3: [] };
    return { ...t, floorItems: { ...stacks, [dropQuadrant]: [...(stacks[dropQuadrant] ?? []), ...dropped] } };
  });

  const champions = state.party.champions.map((c, i) =>
    i === index ? { ...emptyInventory(c), alive: false, health: 0 } : c
  );
  const anyAlive = champions.some((c) => c.alive);
  let leaderIndex = state.party.leaderIndex;
  if (leaderIndex === index || !champions[leaderIndex]?.alive) {
    const firstAlive = champions.findIndex((c) => c.alive);
    leaderIndex = firstAlive >= 0 ? firstAlive : leaderIndex;
  }

  events.push({ type: 'CHAMPION_DIED', championId: champ.id, name: champ.name });
  events.push({
    type: 'SOUND_CUE',
    cue: 'CHAMPION_DEATH',
    sourceLevel: level,
    sourceX: x,
    sourceY: y
  });

  let next: GameState = {
    ...state,
    levels,
    items: { ...state.items, [bonesId]: bones },
    openInventoryChampionIndex: state.openInventoryChampionIndex === index ? null : state.openInventoryChampionIndex,
    party: { ...state.party, champions, leaderIndex, sleeping: false },
    gameOver: !anyAlive
  };
  next = pushMessage(next, `${champ.name} DIES!`, events);
  if (!anyAlive) {
    next = pushMessage(next, 'THE PARTY HAS PERISHED. GAME OVER.', events);
  }
  return next;
}

/** Restores a fallen champion at a Vi Altar: half health, healthy food/water. */
export function reviveChampion(state: GameState, championId: string, events: EngineEvent[]): GameState {
  const index = state.party.champions.findIndex((c) => c.id === championId && !c.alive);
  const champ = state.party.champions[index];
  if (!champ) {
    return state;
  }
  const champions = state.party.champions.map((c, i) =>
    i === index
      ? {
          ...c,
          alive: true,
          health: Math.max(1, Math.floor(c.maxHealth / 2)),
          food: FOOD_WATER_START,
          water: FOOD_WATER_START
        }
      : c
  );
  events.push({ type: 'CHAMPION_REVIVED_AT_ALTAR', championId: champ.id, name: champ.name });
  events.push({
    type: 'SOUND_CUE',
    cue: 'CHAMPION_REVIVE',
    sourceLevel: state.party.level,
    sourceX: state.party.x,
    sourceY: state.party.y
  });
  const leader = state.party.champions[state.party.leaderIndex];
  const next: GameState = {
    ...state,
    gameOver: false,
    party: {
      ...state.party,
      champions,
      leaderIndex: leader?.alive ? state.party.leaderIndex : index
    }
  };
  return pushMessage(next, `${champ.name} IS REBORN!`, events);
}

/** Toggles Sleep; forbidden during the mirror modal, after game over, or with nobody alive. */
export function setSleeping(state: GameState, sleeping: boolean, events: EngineEvent[]): GameState {
  if (state.party.sleeping === sleeping) {
    return state;
  }
  if (sleeping && (state.activeMirror || state.gameOver || !state.party.champions.some((c) => c.alive))) {
    return state;
  }
  events.push({ type: 'SLEEP_STATE_CHANGED', sleeping });
  return { ...state, party: { ...state.party, sleeping } };
}

function burnTorches(state: GameState, events: EngineEvent[]): GameState {
  let items = state.items;
  let changed = false;
  for (const c of state.party.champions) {
    if (!c.alive) {
      continue;
    }
    for (const slot of ['leftHand', 'rightHand'] as const) {
      const id = c.inventory.slots[slot];
      const item = id ? items[id] : undefined;
      if (!id || !item || item.name !== TORCH_NAME || item.charges <= 0) {
        continue;
      }
      const charges = item.charges - 1;
      items = { ...items, [id]: { ...item, charges, iconIndex: torchIconForCharges(charges) } };
      changed = true;
      if (charges === 0) {
        events.push({ type: 'MESSAGE_LOGGED', text: `${c.name}'S TORCH BURNS OUT.` });
      }
    }
  }
  return changed ? { ...state, items } : state;
}

/** One 6 Hz survival step (call after movement/door/projectile updates). */
export function stepSurvival(state: GameState, events: EngineEvent[]): GameState {
  if (state.gameOver || state.party.champions.length === 0) {
    return state;
  }
  const asleep = state.party.sleeping;
  const t = state.tick;
  const drainEvery = asleep ? DRAIN_PERIOD_ASLEEP : DRAIN_PERIOD_AWAKE;
  const regenEvery = asleep ? REGEN_PERIOD_ASLEEP : REGEN_PERIOD_AWAKE;
  const doDrain = t % drainEvery === 0;
  const doRegen = t % regenEvery === 0;

  let tookDamage = false;
  const died: number[] = [];

  const champions = state.party.champions.map((c, i) => {
    if (!c.alive) {
      return c;
    }
    let { food, water, stamina, health, mana } = c;
    const attributes = effectiveChampionAttributes(state, c);
    const manaCapacity = effectiveChampionMaxMana(state, c);
    mana = Math.min(mana, manaCapacity);
    if (doDrain) {
      food = clampVital(food - 1);
      water = clampVital(water - 1);
    }
    if (doRegen) {
      if (food > 0 && water > 0) {
        stamina = Math.min(c.maxStamina, stamina + 1 + Math.floor(attributes.vitality / 25));
        if (stamina >= c.maxStamina) {
          health = Math.min(c.maxHealth, health + 1);
          mana = Math.min(manaCapacity, mana + 1 + Math.floor(attributes.wisdom / 25));
        }
      } else if (food < 0 || water < 0) {
        if (stamina > 0) {
          stamina = Math.max(0, stamina - 2);
        } else {
          health -= 1;
          tookDamage = true;
        }
      }
    }
    if (health <= 0) {
      died.push(i);
    }
    return { ...c, food, water, stamina, health, mana };
  });

  let next: GameState = { ...state, party: { ...state.party, champions } };
  if (t % TORCH_BURN_PERIOD === 0) {
    next = burnTorches(next, events);
  }
  if (tookDamage && next.party.sleeping) {
    next = setSleeping(next, false, events);
  }
  for (const index of died) {
    next = killChampion(next, index, events);
  }
  return next;
}
