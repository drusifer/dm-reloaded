/** Pure atomic player-combat transactions and passive Sprint 3 targets. */

import { COMBAT_ACTIONS, actionSupportsItem, type CombatActionDefinition, type CombatActionId } from '../data/combatCatalog';
import { ITEM_CATALOG_180, findItemDef } from '../data/itemCatalog';
import { effectiveChampionAttributes } from './inventory';
import { awardSkillExperience } from './progression';
import { nextRandom } from './rng';
import {
  DIRECTION_DELTAS,
  type ChampionState,
  type CombatFailureReason,
  type CombatTargetState,
  type EngineEvent,
  type EquipSlotId,
  type GameState,
  type ProjectileState
} from './types';

const QUIVER_SLOTS = ['quiver1', 'quiver2', 'quiver3', 'quiver4'] as const;
const MAX_MESSAGE_LOG = 24;

function reject(
  state: GameState,
  reason: CombatFailureReason,
  events: EngineEvent[]
): GameState {
  const text = `ACTION BLOCKED: ${reason.replaceAll('_', ' ')}.`;
  events.push({ type: 'ACTION_REJECTED', reason, text });
  events.push({ type: 'MESSAGE_LOGGED', text });
  const messages = [...state.messages, text];
  return { ...state, messages: messages.length > MAX_MESSAGE_LOG ? messages.slice(-MAX_MESSAGE_LOG) : messages };
}

function itemDef(state: GameState, itemId: string) {
  const item = state.items[itemId];
  return item ? (ITEM_CATALOG_180[item.defId] ?? findItemDef('MISC', 0)) : undefined;
}

function championLane(championIndex: number): 'LEFT' | 'RIGHT' {
  return championIndex % 2 === 0 ? 'LEFT' : 'RIGHT';
}

function targetAhead(
  state: GameState,
  lane: 'LEFT' | 'RIGHT',
  ranged: boolean
): CombatTargetState | undefined {
  const { dx, dy } = DIRECTION_DELTAS[state.party.facing];
  return state.combatTargets
    .filter((target) => target.level === state.party.level && target.lane === lane && !target.defeated)
    .filter((target) => {
      const tx = target.x - state.party.x;
      const ty = target.y - state.party.y;
      const distance = tx * dx + ty * dy;
      return distance >= 1 && (ranged ? distance <= 8 : distance === 1) && tx * dy === ty * dx;
    })
    .sort((a, b) => Math.abs(a.x - state.party.x) + Math.abs(a.y - state.party.y)
      - (Math.abs(b.x - state.party.x) + Math.abs(b.y - state.party.y)))[0];
}

function replaceChampion(state: GameState, championIndex: number, champion: ChampionState): GameState {
  return {
    ...state,
    party: {
      ...state.party,
      champions: state.party.champions.map((value, index) => index === championIndex ? champion : value)
    }
  };
}

function damageTarget(
  state: GameState,
  targetId: string,
  amount: number,
  ownerChampionId: string,
  events: EngineEvent[],
  magical = false
): GameState {
  const immune = !magical && amount > 0
    && state.combatTargets.some((t) => t.id === targetId && !t.defeated && t.traits.includes('NON_MATERIAL'));
  if (immune) {
    const text = 'THE BLOW PASSES THROUGH THE NON-MATERIAL FOE.';
    events.push({ type: 'DAMAGE_APPLIED', targetId, ownerChampionId, amount: 0 });
    events.push({ type: 'MESSAGE_LOGGED', text });
    const messages = [...state.messages, text];
    return { ...state, messages: messages.length > MAX_MESSAGE_LOG ? messages.slice(-MAX_MESSAGE_LOG) : messages };
  }
  let applied = false;
  const targets = state.combatTargets.map((target) => {
    if (applied || target.id !== targetId || target.defeated || amount <= 0) return target;
    applied = true;
    const health = Math.max(0, target.health - amount);
    events.push({ type: 'DAMAGE_APPLIED', targetId, ownerChampionId, amount: target.health - health });
    return {
      ...target,
      health,
      defeated: health === 0,
      ...(target.monster ? { monster: { ...target.monster, awake: true, lastHitBy: ownerChampionId } } : {})
    };
  });
  return { ...state, combatTargets: targets };
}

function findAmmunition(state: GameState, champion: ChampionState, names: readonly string[]) {
  for (const slot of QUIVER_SLOTS) {
    const id = champion.inventory.slots[slot];
    if (id && names.includes(state.items[id]?.name ?? '')) return { slot, id };
  }
  return null;
}

export interface ExecuteCombatActionCommand {
  readonly championIndex: number;
  readonly hand: Extract<EquipSlotId, 'leftHand' | 'rightHand'>;
  readonly actionId: CombatActionId;
}

type AmmunitionSelection = { readonly slot: typeof QUIVER_SLOTS[number]; readonly id: string };
type CombatValidationResult =
  | { readonly ok: false; readonly reason: CombatFailureReason }
  | {
      readonly ok: true;
      readonly champion: ChampionState;
      readonly action: CombatActionDefinition;
      readonly lane: 'LEFT' | 'RIGHT';
      readonly target: CombatTargetState;
      readonly ammunition: AmmunitionSelection | null;
    };

/** Canonical pure combat eligibility authority used by reducer and presentation. */
export function validateCombatAction(state: GameState, command: ExecuteCombatActionCommand): CombatValidationResult {
  const champion = state.party.champions[command.championIndex];
  if (!champion?.alive || state.gameOver || state.party.sleeping || state.activeMirror) {
    return { ok: false, reason: 'INVALID_ACTOR' };
  }
  const action = COMBAT_ACTIONS[command.actionId];
  const heldId = champion.inventory.slots[command.hand];
  const heldDef = heldId ? itemDef(state, heldId) : undefined;
  if (!heldId || !heldDef || !action || !actionSupportsItem(action, heldDef)) {
    return { ok: false, reason: 'INVALID_ITEM' };
  }
  if ((champion.actionCooldowns[action.id] ?? 0) > state.tick) return { ok: false, reason: 'COOLDOWN' };
  if (champion.stamina < action.staminaCost) return { ok: false, reason: 'INSUFFICIENT_STAMINA' };
  if (action.kind === 'MELEE' && command.championIndex >= 2) return { ok: false, reason: 'OUT_OF_REACH' };
  const lane = championLane(command.championIndex);
  const target = targetAhead(state, lane, action.kind === 'RANGED');
  if (!target) return { ok: false, reason: 'INVALID_TARGET' };
  const ammunition = action.kind === 'RANGED' ? findAmmunition(state, champion, action.ammunitionNames) : null;
  if (action.kind === 'RANGED' && !ammunition) return { ok: false, reason: 'MISSING_AMMUNITION' };
  return { ok: true, champion, action, lane, target, ammunition };
}

export function combatActionFailureReason(
  state: GameState,
  command: ExecuteCombatActionCommand
): CombatFailureReason | null {
  const result = validateCombatAction(state, command);
  return result.ok ? null : result.reason;
}

export function executeCombatAction(
  state: GameState,
  command: ExecuteCombatActionCommand,
  events: EngineEvent[]
): GameState {
  const validation = validateCombatAction(state, command);
  if (!validation.ok) return reject(state, validation.reason, events);
  const { champion, action, lane, target, ammunition } = validation;

  const hitDraw = nextRandom(state.rngState);
  const damageDraw = nextRandom(hitDraw.nextState);
  const attributes = effectiveChampionAttributes(state, champion);
  const hit = hitDraw.value < Math.min(0.95, 0.65 + attributes.dexterity / 200);
  const damage = hit
    ? action.baseDamage + Math.floor(attributes.strength / 10) + Math.floor(damageDraw.value * 6)
    : 0;
  let nextChampion: ChampionState = {
    ...champion,
    stamina: champion.stamina - action.staminaCost,
    actionCooldowns: { ...champion.actionCooldowns, [action.id]: state.tick + action.cooldownTicks }
  };
  let next = replaceChampion({ ...state, rngState: damageDraw.nextState }, command.championIndex, nextChampion);
  events.push({ type: 'ACTION_EXECUTED', championId: champion.id, actionId: action.id, hit });
  events.push({ type: 'COOLDOWN_STARTED', championId: champion.id, actionId: action.id, readyAtTick: state.tick + action.cooldownTicks });

  if (action.kind === 'MELEE') {
    if (hit) {
      next = damageTarget(next, target.id, damage, champion.id, events);
      const awarded = awardSkillExperience(next, champion.id, action.subskill, action.experience);
      next = awarded.state;
      events.push(...awarded.events);
    }
    return next;
  }

  const ammo = ammunition!;
  nextChampion = next.party.champions[command.championIndex]!;
  nextChampion = {
    ...nextChampion,
    inventory: {
      ...nextChampion.inventory,
      slots: { ...nextChampion.inventory.slots, [ammo.slot]: null }
    }
  };
  next = replaceChampion(next, command.championIndex, nextChampion);
  const projectile: ProjectileState = {
    id: `proj_${state.tick}_${state.projectiles.length}_${ammo.id}`,
    itemId: ammo.id,
    ownerChampionId: champion.id,
    level: state.party.level,
    x: state.party.x,
    y: state.party.y,
    direction: state.party.facing,
    lane,
    power: damage,
    kineticEnergy: 8,
    stepEnergyCost: 1,
    payload: { kind: 'AMMUNITION', itemId: ammo.id, actionId: action.id }
  };
  events.push({ type: 'PROJECTILE_LAUNCHED', projectileId: projectile.id, ownerChampionId: champion.id });
  return { ...next, projectiles: [...next.projectiles, projectile] };
}

export { damageTarget };
