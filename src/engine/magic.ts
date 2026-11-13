/** Pure rune editing, invocation, brewing, and potion transactions. */
import { POTION_RECIPES, SPELL_RECIPES } from '../data/magicCatalog';
import { updateTileInLevels } from './actuators';
import { awardSkillExperience, rankForExperience } from './progression';
import { nextRandom } from './rng';
import {
  ALL_EQUIP_SLOTS, DIRECTION_DELTAS,
  type ChampionState, type EngineEvent, type GameCommand, type GameState,
  type ItemInstanceId, type MagicFailureReason, type ProjectileState, type RuneId
} from './types';

const WIZARD_FIRE = 12;
const PRIEST_POTION = 8;
const MAX_FORMULA_RUNES = 4;
const POWER_RUNES: readonly RuneId[] = ['LO', 'UM', 'ON', 'POWER_EE', 'PAL', 'MON'];

type MagicCommand = Extract<GameCommand, { type: 'ADD_RUNE' | 'REMOVE_RUNE' | 'CLEAR_RUNES' | 'SELECT_BREW_FLASK' | 'INVOKE_RUNES' | 'CONSUME_POTION' }>;

function appendMessage(state: GameState, text: string, events: EngineEvent[]): GameState {
  events.push({ type: 'MESSAGE_LOGGED', text });
  const messages = [...state.messages, text];
  return { ...state, messages: messages.length > 24 ? messages.slice(-24) : messages };
}

function replaceChampion(state: GameState, index: number, champion: ChampionState): GameState {
  return { ...state, party: { ...state.party, champions: state.party.champions.map((value, i) => i === index ? champion : value) } };
}

function reject(state: GameState, reason: MagicFailureReason, events: EngineEvent[]): GameState {
  const text = `MAGIC REJECTED: ${reason.replaceAll('_', ' ')}.`;
  events.push({ type: 'SPELL_REJECTED', reason, text });
  return appendMessage(state, text, events);
}

function formulaFor(state: GameState, champion: ChampionState): readonly RuneId[] {
  return state.runeFormulas[champion.id] ?? [];
}

function setFormula(state: GameState, champion: ChampionState, formula: readonly RuneId[]): GameState {
  return { ...state, runeFormulas: { ...state.runeFormulas, [champion.id]: formula } };
}

function reachableFlask(champion: ChampionState, itemId: ItemInstanceId): boolean {
  const { slots, backpack } = champion.inventory;
  return slots.leftHand === itemId || slots.rightHand === itemId || slots.pouch1 === itemId ||
    slots.pouch2 === itemId || backpack.includes(itemId);
}

function ownsItem(champion: ChampionState, itemId: ItemInstanceId): boolean {
  return ALL_EQUIP_SLOTS.some((slot) => champion.inventory.slots[slot] === itemId) || champion.inventory.backpack.includes(itemId);
}

function removeOwnedItem(state: GameState, championIndex: number, itemId: ItemInstanceId): GameState {
  const champion = state.party.champions[championIndex];
  if (!champion) return state;
  const slots = { ...champion.inventory.slots };
  for (const slot of ALL_EQUIP_SLOTS) if (slots[slot] === itemId) slots[slot] = null;
  const backpack = champion.inventory.backpack.map((value) => value === itemId ? null : value);
  const { [itemId]: removed, ...items } = state.items;
  void removed;
  return replaceChampion({ ...state, items, handItem: state.handItem === itemId ? null : state.handItem }, championIndex, {
    ...champion, inventory: { slots, backpack },
    leftHand: champion.leftHand === itemId ? null : champion.leftHand,
    rightHand: champion.rightHand === itemId ? null : champion.rightHand
  });
}

function sameRunes(actual: readonly RuneId[], expected: readonly RuneId[]): boolean {
  return actual.length === expected.length && actual.every((rune, index) => rune === expected[index]);
}

function resolveFormula(formula: readonly RuneId[]):
  | { readonly kind: 'SPELL'; readonly id: string }
  | { readonly kind: 'POTION'; readonly id: string; readonly rune: RuneId }
  | null {
  if (formula.length < 2 || !POWER_RUNES.includes(formula[0]!)) return null;
  const suffix = formula.slice(1);
  const spell = SPELL_RECIPES.find((recipe) => sameRunes(suffix, recipe.suffix));
  if (spell) return { kind: 'SPELL', id: spell.id };
  const potion = POTION_RECIPES.find((recipe) => sameRunes(suffix, [recipe.rune]));
  return potion ? { kind: 'POTION', id: potion.id, rune: potion.rune } : null;
}

function invoke(state: GameState, championIndex: number, events: EngineEvent[]): GameState {
  const champion = state.party.champions[championIndex];
  if (!champion?.alive) return reject(state, 'INVALID_ACTOR', events);
  const formula = formulaFor(state, champion);
  const resolved = resolveFormula(formula);
  if (!resolved) return reject(state, 'INVALID_FORMULA', events);
  const power = POWER_RUNES.indexOf(formula[0]!);
  const subskill = resolved.kind === 'POTION' ? PRIEST_POTION : WIZARD_FIRE;
  const rank = rankForExperience(champion.progression.experience[subskill] ?? 0);
  if (rank < power + 1) return reject(state, 'INSUFFICIENT_SKILL', events);
  const manaCost = power + 1 + 2 * (formula.length - 1);
  if (champion.mana < manaCost) return reject(state, 'INSUFFICIENT_MANA', events);
  const selectedFlask = state.selectedBrewFlasks[champion.id] ?? null;
  if (resolved.kind === 'POTION' && (!selectedFlask || !reachableFlask(champion, selectedFlask) || state.items[selectedFlask]?.name !== 'EMPTY FLASK')) {
    return reject(state, 'INVALID_FLASK', events);
  }

  const draw = nextRandom(state.rngState);
  let next = replaceChampion({ ...state, rngState: draw.nextState }, championIndex, { ...champion, mana: champion.mana - manaCost });
  next = setFormula(next, champion, []);
  const successThreshold = Math.min(0.9, 0.55 + rank * 0.05);
  if (draw.value >= successThreshold) {
    if (draw.value < 0.85) {
      events.push({ type: 'SPELL_FIZZLED', championId: champion.id });
      return appendMessage(next, `${champion.name}'S MAGIC FIZZLES.`, events);
    }
    const damage = 2 + power + Math.floor(draw.value * 4);
    const charged = next.party.champions[championIndex]!;
    next = replaceChampion(next, championIndex, { ...charged, health: Math.max(0, charged.health - damage) });
    if (resolved.kind === 'POTION' && selectedFlask) {
      next = removeOwnedItem(next, championIndex, selectedFlask);
      next = { ...next, selectedBrewFlasks: { ...next.selectedBrewFlasks, [champion.id]: null } };
    }
    events.push({ type: 'SPELL_BACKFIRED', championId: champion.id, damage });
    return appendMessage(next, `${champion.name}'S MAGIC BACKFIRES!`, events);
  }

  if (resolved.kind === 'POTION' && selectedFlask) {
    const item = next.items[selectedFlask]!;
    next = {
      ...next,
      items: { ...next.items, [selectedFlask]: { ...item, name: `${formula[0] === 'POWER_EE' ? 'EE' : formula[0]} ${resolved.id} POTION`, potion: { recipeId: resolved.id, power: power as 0 | 1 | 2 | 3 | 4 | 5 } } },
      selectedBrewFlasks: { ...next.selectedBrewFlasks, [champion.id]: null }
    };
    events.push({ type: 'POTION_BREWED', championId: champion.id, recipeId: resolved.id, itemId: selectedFlask });
  } else {
    next = applySpell(next, championIndex, resolved.id, power, events);
    events.push({ type: 'SPELL_SUCCEEDED', spellId: resolved.id, championId: champion.id });
  }
  const awarded = awardSkillExperience(next, champion.id, subskill, 12 + power * 4);
  events.push(...awarded.events);
  return appendMessage(awarded.state, resolved.kind === 'POTION' ? `${champion.name} BREWS ${resolved.id}.` : `${champion.name} CASTS ${resolved.id}.`, events);
}

function applySpell(state: GameState, championIndex: number, spellId: string, power: number, events: EngineEvent[]): GameState {
  const champion = state.party.champions[championIndex]!;
  if (spellId === 'FIREBALL' || spellId === 'WEAKEN') {
    const projectile: ProjectileState = {
      id: `spell_${state.tick}_${state.projectiles.length}_${champion.id}`,
      itemId: null, ownerChampionId: champion.id, level: state.party.level, x: state.party.x, y: state.party.y,
      direction: state.party.facing, lane: championIndex % 2 === 0 ? 'LEFT' : 'RIGHT', power: 4 + power * 2,
      kineticEnergy: 4 + power * 2, stepEnergyCost: 1,
      payload: { kind: 'SPELL', spellId, effectId: spellId === 'FIREBALL' ? 'FIRE' : 'WEAKEN', explosive: spellId === 'FIREBALL' }
    };
    events.push({ type: 'PROJECTILE_LAUNCHED', projectileId: projectile.id, ownerChampionId: champion.id });
    return { ...state, projectiles: [...state.projectiles, projectile] };
  }
  if (spellId === 'OPEN_DOOR') {
    const delta = DIRECTION_DELTAS[state.party.facing];
    return { ...state, levels: updateTileInLevels(state.levels, state.party.level, state.party.x + delta.dx, state.party.y + delta.dy, (tile) =>
      tile.door ? { ...tile, door: { ...tile.door, progress: 0, targetProgress: 0 } } : tile) };
  }
  const kind = spellId === 'LIGHT' ? 'LIGHT' : 'SHIELD';
  const effect = { kind, magnitude: power + 1, expiresAtTick: state.tick + 12 * (power + 1), sourceChampionId: champion.id } as const;
  if (kind === 'SHIELD') {
    const champions = state.party.champions.map((active) => {
      if (!active.alive) return active;
      events.push({ type: 'STATUS_EFFECT_CHANGED', championId: active.id, effect: kind, active: true });
      return { ...active, effects: [...active.effects.filter((value) => value.kind !== kind), effect] };
    });
    return { ...state, party: { ...state.party, champions } };
  }
  const active = state.party.champions[championIndex]!;
  events.push({ type: 'STATUS_EFFECT_CHANGED', championId: champion.id, effect: kind, active: true });
  return replaceChampion(state, championIndex, { ...active, effects: [...active.effects.filter((value) => value.kind !== kind), effect] });
}

function consumePotion(state: GameState, championIndex: number, itemId: ItemInstanceId, events: EngineEvent[]): GameState {
  const champion = state.party.champions[championIndex];
  const item = state.items[itemId];
  const recipe = item?.potion && POTION_RECIPES.find((value) => value.id === item.potion!.recipeId);
  if (!champion?.alive || !item?.potion || !recipe || (!ownsItem(champion, itemId) && state.handItem !== itemId)) return reject(state, 'INVALID_POTION', events);
  const amount = 12 * (item.potion.power + 1);
  let updated: ChampionState = champion;
  switch (recipe.effect) {
    case 'HEALTH': updated = { ...champion, health: Math.min(champion.maxHealth, champion.health + amount) }; break;
    case 'STAMINA': updated = { ...champion, stamina: Math.min(champion.maxStamina, champion.stamina + amount) }; break;
    case 'MANA': updated = { ...champion, mana: Math.min(champion.maxMana, champion.mana + amount) }; break;
    case 'CURE_POISON': updated = { ...champion, poisonSeverity: Math.max(0, champion.poisonSeverity - 4 * (item.potion.power + 1)) }; break;
    case 'STRENGTH': {
      const effect = { kind: 'STRENGTH', magnitude: item.potion.power + 1, expiresAtTick: state.tick + amount, sourceChampionId: champion.id } as const;
      updated = { ...champion, effects: [...champion.effects.filter((value) => value.kind !== 'STRENGTH'), effect] };
      events.push({ type: 'STATUS_EFFECT_CHANGED', championId: champion.id, effect: 'STRENGTH', active: true });
      break;
    }
  }
  let next = replaceChampion(state, championIndex, updated);
  next = removeOwnedItem(next, championIndex, itemId);
  events.push({ type: 'POTION_CONSUMED', championId: champion.id, recipeId: recipe.id, itemId });
  return appendMessage(next, `${champion.name} DRINKS ${recipe.id}.`, events);
}

export function applyMagicCommand(state: GameState, command: MagicCommand, events: EngineEvent[]): GameState {
  const champion = state.party.champions[command.championIndex];
  if (command.type === 'INVOKE_RUNES') return invoke(state, command.championIndex, events);
  if (command.type === 'CONSUME_POTION') return consumePotion(state, command.championIndex, command.itemId, events);
  if (!champion) return state;
  if (command.type === 'ADD_RUNE') {
    const formula = formulaFor(state, champion);
    return formula.length >= MAX_FORMULA_RUNES ? state : setFormula(state, champion, [...formula, command.rune]);
  }
  if (command.type === 'REMOVE_RUNE') return setFormula(state, champion, formulaFor(state, champion).slice(0, -1));
  if (command.type === 'CLEAR_RUNES') return setFormula(state, champion, []);
  return { ...state, selectedBrewFlasks: { ...state.selectedBrewFlasks, [champion.id]: command.flaskId } };
}
