/**
 * Pure InventoryEngine: paperdoll slots, backpack, chests, cursor hand, floor pickup, load.
 *
 * TLDR:
 *   Implements the Sprint 2 inventory commands (TOGGLE_INVENTORY, SELECT_LEADER, CLICK_EQUIP_SLOT,
 *   CLICK_BACKPACK_SLOT, CLICK_CONTAINER_SLOT, INSPECT_HAND_ITEM, CONSUME_HAND_ITEM,
 *   PICKUP_OR_DROP_FLOOR) over GameState.items / handItem with slot-compatibility validation
 *   ("CANNOT EQUIP THERE"), swap semantics, nested 8-slot chests, Load/MaxLoad kg encumbrance
 *   (move-cooldown penalty) and Torch/Illumulet light. Zero DOM; fully deterministic.
 */

import { EQUIP_MASK, ITEM_CATALOG_180, findItemDef, findItemDefByLegacyName, torchIconForCharges } from '../data/itemCatalog';
import { updateTileInLevels } from './actuators';
import {
  ALL_EQUIP_SLOTS,
  BACKPACK_SLOT_COUNT,
  CHEST_SLOT_COUNT,
  type ChampionState,
  type ChampionAttributes,
  type EngineEvent,
  type EquipSlotId,
  type GameCommand,
  type GameState,
  type ItemDef,
  type ItemInstance,
  type ItemInstanceId,
  type SubTileQuadrant
} from './types';

export const MAX_FOOD_WATER = 2048;
/** Load fraction above which the party is "burdened" (+1 move tick). */
export const BURDENED_RATIO = 0.75;
/** Load fraction above which the party is "overloaded" (+2 move ticks). */
export const OVERLOADED_RATIO = 1;

const CANNOT_EQUIP = 'CANNOT EQUIP THERE';

export interface InventoryResult {
  readonly state: GameState;
  readonly handled: boolean;
}

/** Interprets FTL item[559] equip bitmasks (EQUIP_MASK) against a paperdoll slot. */
export function slotAcceptsDef(slot: EquipSlotId, def: ItemDef): boolean {
  const m = def.equipMask;
  switch (slot) {
    case 'head':
      return (m & EQUIP_MASK.HEAD) !== 0;
    case 'neck':
      return (m & EQUIP_MASK.NECK) !== 0;
    case 'torso':
      return (m & EQUIP_MASK.TORSO) !== 0;
    case 'legs':
      return (m & EQUIP_MASK.LEGS) !== 0;
    case 'feet':
      return (m & EQUIP_MASK.FEET) !== 0;
    case 'leftHand':
    case 'rightHand':
      return true;
    case 'pouch1':
    case 'pouch2':
      return (m & EQUIP_MASK.POUCH) !== 0;
    case 'quiver1':
      return (m & (EQUIP_MASK.QUIVER_WEAPON | EQUIP_MASK.QUIVER_AMMO)) !== 0;
    case 'quiver2':
    case 'quiver3':
    case 'quiver4':
      return (m & EQUIP_MASK.QUIVER_AMMO) !== 0;
  }
}

function defOf(item: ItemInstance): ItemDef {
  return ITEM_CATALOG_180[item.defId] ?? findItemDef('MISC', 0);
}

function isChest(item: ItemInstance): boolean {
  return defOf(item).category === 'CHEST';
}

/** Total weight in 1/10 kg including nested chest contents. */
export function itemWeightTenths(state: GameState, itemId: ItemInstanceId, depth = 0): number {
  const item = state.items[itemId];
  if (!item || depth > 2) {
    return 0;
  }
  let w = defOf(item).weightTenthsKg;
  for (const child of item.contents ?? []) {
    w += itemWeightTenths(state, child, depth + 1);
  }
  return w;
}

function championItemIds(champion: ChampionState): ItemInstanceId[] {
  const ids: ItemInstanceId[] = [];
  for (const slot of ALL_EQUIP_SLOTS) {
    const id = champion.inventory.slots[slot];
    if (id) {
      ids.push(id);
    }
  }
  for (const id of champion.inventory.backpack) {
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

/** Cursor weight belongs to the living leader, independent of the inventory being viewed. */
export function championLoadTenths(state: GameState, champion: ChampionState): number {
  const ids = championItemIds(champion);
  const isLeader = champion.alive && state.party.champions[state.party.leaderIndex]?.id === champion.id;
  if (isLeader && state.handItem && !ids.includes(state.handItem)) ids.push(state.handItem);
  return ids.reduce((sum, id) => sum + itemWeightTenths(state, id), 0);
}

/** Numeric equipment facts verified against ScummVM engines/dm/champion.cpp (apply modifiers).
 * Base attributes stay immutable: equip/swap/unequip are reflected by each derived read.
 */
export function effectiveChampionAttributes(state: GameState, champion: ChampionState): ChampionAttributes {
  const result = { ...champion.attributes };
  for (const slot of ALL_EQUIP_SLOTS) {
    const id = champion.inventory.slots[slot], item = id ? state.items[id] : undefined;
    if (!item) continue;
    const def = defOf(item);
    if (item.cursed && (def.category === 'WEAPON' || def.category === 'CLOTHES')) { result.luck -= 3; continue; }
    const name = def.name;
    if (name === "RABBIT'S FOOT") result.luck += 10;
    if (slot === 'rightHand' && name === 'MACE OF ORDER') result.strength += 5;
    if (slot === 'legs' && name === 'POWERTOWERS') result.strength += 10;
    if (slot === 'head' && name === 'CROWN OF NERRA') result.wisdom += 10;
    if (slot === 'head' && name === 'DEXHELM') result.dexterity += 10;
    if (slot === 'torso' && name === 'FLAMEBAIN') result.antiFire += 12;
    if ((slot === 'torso' || slot === 'neck') && name === 'CLOAK OF NIGHT') result.dexterity += 8;
    if (slot === 'neck' && name === 'JEWEL SYMAL') result.antiMagic += 15;
  }
  for (const id of champion.inventory.backpack) if (id && state.items[id] && defOf(state.items[id]!).name === "RABBIT'S FOOT") result.luck += 10;
  return result;
}

/** Aggregate worn armor strength, including shields in hands; stored armor supplies no protection. */
export function championArmorRating(state: GameState, champion: ChampionState): number {
  let armor = 0;
  for (const slot of ['head', 'torso', 'legs', 'feet', 'leftHand', 'rightHand'] as const) {
    const id = champion.inventory.slots[slot], item = id ? state.items[id] : undefined;
    if (!item) continue;
    const def = defOf(item);
    const body = slot !== 'leftHand' && slot !== 'rightHand';
    if (def.category === 'CLOTHES' && (body || def.name.includes('SHIELD') || def.name === 'BUCKLER')) armor += def.armorStrength;
  }
  return armor;
}

/** Effective mana capacity from verified action-hand magical implements and neck Moonstone. */
export function effectiveChampionMaxMana(state: GameState, champion: ChampionState): number {
  const bonuses: Readonly<Record<string, number>> = { DELTA: 1, WAND: 1, 'THE INQUISITOR': 2, STAFF: 2,
    'VORPAL BLADE': 4, 'YEW STAFF': 4, TEOWAND: 6, 'STAFF OF MANAR': 10, 'SNAKE STAFF': 8,
    'THE CONDUIT': 16, 'DRAGON SPIT': 7, 'SCEPTRE OF LYF': 5, 'STAFF OF CLAWS': 4 };
  const id = champion.inventory.slots.rightHand, item = id ? state.items[id] : undefined;
  const neckId = champion.inventory.slots.neck, neck = neckId ? state.items[neckId] : undefined;
  return champion.maxMana + (item && !item.cursed ? bonuses[defOf(item).name] ?? 0 : 0)
    + (neck && defOf(neck).name === 'MOONSTONE' ? 3 : 0);
}

/** Max carry in 1/10 kg: 10 kg + 0.8 kg/STR, reduced up to 50% as stamina drains. */
export function maxLoadTenths(champion: ChampionState, state?: GameState): number {
  const attributes = state ? effectiveChampionAttributes(state, champion) : champion.attributes;
  const base = attributes.strength * 8 + 100;
  const staminaFrac = champion.maxStamina > 0 ? Math.max(0, Math.min(1, champion.stamina / champion.maxStamina)) : 1;
  return Math.round(base * (0.5 + 0.5 * staminaFrac));
}

/** 0 = fine, 1 = burdened (>75%), 2 = overloaded (>100%) for the most strained living champion. */
export function encumbranceLevel(state: GameState): 0 | 1 | 2 {
  let level: 0 | 1 | 2 = 0;
  for (const c of state.party.champions) {
    if (!c.alive) {
      continue;
    }
    const ratio = championLoadTenths(state, c) / Math.max(1, maxLoadTenths(c, state));
    if (ratio > OVERLOADED_RATIO) {
      return 2;
    }
    if (ratio > BURDENED_RATIO) {
      level = 1;
    }
  }
  return level;
}

/** Extra move-cooldown ticks caused by encumbrance. */
export function encumbranceCooldownPenalty(state: GameState): number {
  return encumbranceLevel(state);
}

/**
 * Light bonus (0..5) from lit torches in living champions' hands (charges > 0) and Illumulets
 * worn at the neck.
 */
export function itemLightBonus(state: GameState): number {
  let best = 0;
  for (const c of state.party.champions) {
    if (!c.alive) {
      continue;
    }
    const lightSlots: EquipSlotId[] = ['leftHand', 'rightHand', 'neck'];
    for (const slot of lightSlots) {
      const id = c.inventory.slots[slot];
      const item = id ? state.items[id] : undefined;
      if (!item) {
        continue;
      }
      const def = defOf(item);
      if (def.lightBonus > 0 && (def.name !== 'TORCH' || item.charges > 0)) {
        best = Math.max(best, def.lightBonus);
      }
    }
  }
  return Math.min(5, best);
}

/** Effective party light bonus: the stronger of base/sconce torchLight and equipped item light. */
export function partyLightBonus(state: GameState): number {
  return Math.max(state.party.torchLight, itemLightBonus(state));
}

function pushMessage(state: GameState, text: string, events: EngineEvent[]): GameState {
  events.push({ type: 'MESSAGE_LOGGED', text });
  const next = [...state.messages, text];
  return { ...state, messages: next.length > 24 ? next.slice(next.length - 24) : next };
}

function soundAtParty(state: GameState, cue: 'ITEM_PICKUP' | 'GULP' | 'LOCK_CLICK', events: EngineEvent[]): void {
  events.push({
    type: 'SOUND_CUE',
    cue,
    sourceLevel: state.party.level,
    sourceX: state.party.x,
    sourceY: state.party.y
  });
}

function withChampion(
  state: GameState,
  index: number,
  fn: (c: ChampionState) => ChampionState
): GameState {
  const champions = state.party.champions.map((c, i) => (i === index ? fn(c) : c));
  return { ...state, party: { ...state.party, champions } };
}

function syncHandLabels(state: GameState, c: ChampionState): ChampionState {
  const nameOf = (id: ItemInstanceId | null): string | null => (id ? (state.items[id]?.name ?? null) : null);
  return {
    ...c,
    leftHand: nameOf(c.inventory.slots.leftHand),
    rightHand: nameOf(c.inventory.slots.rightHand)
  };
}

function resolveChampion(state: GameState, index: number): ChampionState | null {
  const c = state.party.champions[index];
  return c && c.alive ? c : null;
}

function setSlot(c: ChampionState, slot: EquipSlotId, id: ItemInstanceId | null): ChampionState {
  return { ...c, inventory: { ...c.inventory, slots: { ...c.inventory.slots, [slot]: id } } };
}

function setBackpack(c: ChampionState, slotIndex: number, id: ItemInstanceId | null): ChampionState {
  const backpack = c.inventory.backpack.map((v, i) => (i === slotIndex ? id : v));
  return { ...c, inventory: { ...c.inventory, backpack } };
}

function clickEquipSlot(
  state: GameState,
  championIndex: number,
  slot: EquipSlotId,
  events: EngineEvent[]
): GameState {
  const champ = resolveChampion(state, championIndex);
  if (!champ) {
    return state;
  }
  const held = state.handItem ? state.items[state.handItem] : undefined;
  const occupant = champ.inventory.slots[slot];

  if (held && !slotAcceptsDef(slot, defOf(held))) {
    return pushMessage(state, CANNOT_EQUIP, events);
  }
  if (!held && !occupant) {
    return state;
  }

  events.push({
    type: 'ITEM_EQUIPPED',
    championId: champ.id,
    slot,
    itemId: state.handItem
  });
  soundAtParty(state, 'ITEM_PICKUP', events);

  const next = withChampion(state, championIndex, (c) => syncHandLabels(state, setSlot(c, slot, state.handItem)));
  return { ...next, handItem: occupant };
}

function clickBackpackSlot(
  state: GameState,
  championIndex: number,
  slotIndex: number,
  events: EngineEvent[]
): GameState {
  const champ = resolveChampion(state, championIndex);
  if (!champ || slotIndex < 0 || slotIndex >= BACKPACK_SLOT_COUNT) {
    return state;
  }
  const occupant = champ.inventory.backpack[slotIndex] ?? null;
  if (!state.handItem && !occupant) {
    return state;
  }
  soundAtParty(state, 'ITEM_PICKUP', events);
  const next = withChampion(state, championIndex, (c) => setBackpack(c, slotIndex, state.handItem));
  return { ...next, handItem: occupant };
}

function clickContainerSlot(state: GameState, slotIndex: number, events: EngineEvent[]): GameState {
  const containerId = state.openContainerId;
  const container = containerId ? state.items[containerId] : undefined;
  if (!containerId || !container || slotIndex < 0 || slotIndex >= CHEST_SLOT_COUNT) {
    return state;
  }
  const contents = [...(container.contents ?? [])];
  const occupant = contents[slotIndex] ?? null;
  const held = state.handItem ? state.items[state.handItem] : undefined;

  if (held) {
    const def = defOf(held);
    if (isChest(held) || (def.equipMask & EQUIP_MASK.CHEST_FIT) === 0) {
      return pushMessage(state, 'IT WON\'T FIT IN THE CHEST', events);
    }
  } else if (!occupant) {
    return state;
  }

  let nextContents: ItemInstanceId[];
  if (held && state.handItem) {
    if (occupant) {
      contents[slotIndex] = state.handItem;
      nextContents = contents;
    } else if (contents.length < CHEST_SLOT_COUNT) {
      nextContents = [...contents, state.handItem];
    } else {
      return pushMessage(state, 'THE CHEST IS FULL', events);
    }
  } else {
    nextContents = contents.filter((_, i) => i !== slotIndex);
  }

  soundAtParty(state, 'ITEM_PICKUP', events);
  const nextItem: ItemInstance = { ...container, contents: nextContents };
  return {
    ...state,
    items: { ...state.items, [containerId]: nextItem },
    handItem: occupant
  };
}

function inspectHandItem(state: GameState, events: EngineEvent[]): GameState {
  const held = state.handItem ? state.items[state.handItem] : undefined;
  if (!held || !state.handItem) {
    return state;
  }
  const def = defOf(held);
  if (def.category === 'CHEST') {
    return { ...state, openContainerId: state.openContainerId === held.instanceId ? null : held.instanceId };
  }
  if (def.category === 'SCROLL' && held.scrollText && held.scrollText.length > 0) {
    let next = state;
    for (const line of held.scrollText) {
      next = pushMessage(next, line, events);
    }
    return { ...next, openContainerId: held.instanceId };
  }
  return pushMessage(state, `${held.name} (${(itemWeightTenths(state, held.instanceId) / 10).toFixed(1)} KG)`, events);
}

function consumeHandItem(state: GameState, championIndex: number, events: EngineEvent[]): GameState {
  const champ = resolveChampion(state, championIndex);
  const held = state.handItem ? state.items[state.handItem] : undefined;
  if (!champ || !held || !state.handItem) {
    return state;
  }
  const def = defOf(held);
  const edible = (def.equipMask & EQUIP_MASK.MOUTH) !== 0 && (def.nutritionValue > 0 || def.waterValue > 0);
  if (!edible) {
    return pushMessage(state, 'YOU CANNOT EAT OR DRINK THAT', events);
  }

  const isVessel = def.name === 'WATERSKIN';
  if (isVessel && held.charges <= 0) {
    return pushMessage(state, 'THE WATERSKIN IS EMPTY', events);
  }

  const next = withChampion(state, championIndex, (c) => ({
    ...c,
    food: Math.min(MAX_FOOD_WATER, c.food + def.nutritionValue),
    water: Math.min(MAX_FOOD_WATER, c.water + def.waterValue)
  }));
  events.push({ type: 'ITEM_CONSUMED', championId: champ.id, itemName: held.name });
  soundAtParty(state, 'GULP', events);

  if (isVessel) {
    return {
      ...next,
      items: { ...next.items, [held.instanceId]: { ...held, charges: held.charges - 1 } }
    };
  }
  const { [held.instanceId]: _consumed, ...rest } = next.items;
  void _consumed;
  return { ...next, items: rest, handItem: null };
}

function pickupOrDropFloor(state: GameState, quadrant: SubTileQuadrant, events: EngineEvent[]): GameState {
  const { level, x, y } = state.party;
  const lvl = state.levels.find((l) => l.id === level);
  const tile = lvl?.tiles[y]?.[x];
  if (!tile || tile.type === 'WALL') {
    return state;
  }
  const stacks = tile.floorItems ?? { 0: [], 1: [], 2: [], 3: [] };
  const stack = [...(stacks[quadrant] ?? [])];

  if (state.handItem) {
    const held = state.items[state.handItem];
    if (!held) {
      return state;
    }
    stack.push(state.handItem);
    events.push({ type: 'ITEM_DROPPED', itemId: held.instanceId, name: held.name });
    soundAtParty(state, 'ITEM_PICKUP', events);
    const levels = updateTileInLevels(state.levels, level, x, y, (t) => ({
      ...t,
      floorItems: { ...stacks, [quadrant]: stack }
    }));
    return { ...state, levels, handItem: null };
  }

  const topId = stack.pop();
  if (!topId) {
    return state;
  }
  const picked = state.items[topId];
  if (!picked) {
    return state;
  }
  events.push({ type: 'ITEM_PICKED_UP', itemId: topId, name: picked.name });
  soundAtParty(state, 'ITEM_PICKUP', events);
  const levels = updateTileInLevels(state.levels, level, x, y, (t) => ({
    ...t,
    floorItems: { ...stacks, [quadrant]: stack }
  }));
  return { ...state, levels, handItem: topId };
}

/**
 * Applies an inventory-domain command. Returns handled=false for commands owned by other engines.
 */
export function applyInventoryCommand(
  state: GameState,
  command: GameCommand,
  events: EngineEvent[]
): InventoryResult {
  switch (command.type) {
    case 'TOGGLE_INVENTORY': {
      const idx = command.championIndex;
      if (idx === null || state.openInventoryChampionIndex === idx) {
        return { state: { ...state, openInventoryChampionIndex: null, openContainerId: null }, handled: true };
      }
      if (!resolveChampion(state, idx)) {
        return { state, handled: true };
      }
      return { state: { ...state, openInventoryChampionIndex: idx, openContainerId: null }, handled: true };
    }
    case 'SELECT_LEADER': {
      if (!resolveChampion(state, command.championIndex)) {
        return { state, handled: true };
      }
      return {
        state: { ...state, party: { ...state.party, leaderIndex: command.championIndex } },
        handled: true
      };
    }
    case 'CLICK_EQUIP_SLOT':
      return { state: clickEquipSlot(state, command.championIndex, command.slot, events), handled: true };
    case 'CLICK_BACKPACK_SLOT':
      return { state: clickBackpackSlot(state, command.championIndex, command.slotIndex, events), handled: true };
    case 'CLICK_CONTAINER_SLOT':
      return { state: clickContainerSlot(state, command.slotIndex, events), handled: true };
    case 'INSPECT_HAND_ITEM':
      return { state: inspectHandItem(state, events), handled: true };
    case 'CONSUME_HAND_ITEM':
      return { state: consumeHandItem(state, command.championIndex, events), handled: true };
    case 'PICKUP_OR_DROP_FLOOR':
      return { state: pickupOrDropFloor(state, command.quadrant, events), handled: true };
    default:
      return { state, handled: false };
  }
}

/**
 * Creates item instances for a recruited champion's starting kit and auto-equips them into the
 * first compatible empty slot (hands last), falling back to the backpack.
 * Uses startingGearDefs (real Dungeon.dat chains) when present, else legacy startingItems names.
 */
export function grantStartingGear(
  items: Readonly<Record<ItemInstanceId, ItemInstance>>,
  champion: ChampionState
): { readonly items: Readonly<Record<ItemInstanceId, ItemInstance>>; readonly champion: ChampionState } {
  const specs: { def: ItemDef; charges: number }[] = [];
  if ((champion.startingGearDefs ?? []).length > 0) {
    for (const g of champion.startingGearDefs ?? []) {
      const def = findItemDef(g.category, g.subtype);
      specs.push({ def, charges: g.charges ?? defaultCharges(def) });
    }
  } else {
    for (const name of champion.startingItems) {
      const def = findItemDefByLegacyName(name);
      specs.push({ def, charges: defaultCharges(def) });
    }
  }

  const nextItems: Record<ItemInstanceId, ItemInstance> = { ...items };
  let slots = { ...champion.inventory.slots };
  const backpack = [...champion.inventory.backpack];
  const bodyFirst: EquipSlotId[] = [
    'head', 'neck', 'torso', 'legs', 'feet', 'pouch1', 'pouch2',
    'quiver1', 'quiver2', 'quiver3', 'quiver4', 'rightHand', 'leftHand'
  ];
  // Starting weapons/tools go to the hands first so they are ready to use.
  const handsFirst: EquipSlotId[] = [
    'rightHand', 'leftHand', 'quiver1', 'quiver2', 'quiver3', 'quiver4',
    'head', 'neck', 'torso', 'legs', 'feet', 'pouch1', 'pouch2'
  ];

  specs.forEach((spec, n) => {
    const instanceId = `gear_${champion.id}_${n}`;
    nextItems[instanceId] = {
      instanceId,
      defId: spec.def.defId,
      iconIndex: spec.def.name === 'TORCH' ? torchIconForCharges(spec.charges) : spec.def.iconIndex,
      name: spec.def.name,
      charges: spec.charges
    };
    const order = spec.def.category === 'WEAPON' ? handsFirst : bodyFirst;
    const slot = order.find((s) => slots[s] === null && slotAcceptsDef(s, spec.def));
    if (slot) {
      slots = { ...slots, [slot]: instanceId };
      return;
    }
    const free = backpack.indexOf(null);
    if (free >= 0) {
      backpack[free] = instanceId;
    }
  });

  const placed: ChampionState = { ...champion, inventory: { slots, backpack } };
  const labelOf = (id: ItemInstanceId | null): string | null => (id ? (nextItems[id]?.name ?? null) : null);
  return {
    items: nextItems,
    champion: {
      ...placed,
      leftHand: labelOf(slots.leftHand),
      rightHand: labelOf(slots.rightHand)
    }
  };
}

function defaultCharges(def: ItemDef): number {
  if (def.name === 'TORCH') {
    return 15;
  }
  if (def.name === 'WATERSKIN') {
    return 3;
  }
  return 0;
}
