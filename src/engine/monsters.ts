/**
 * Pure deterministic monster ecology: perception, bounded pathing, subcell formation, attacks,
 * kill resolution, door crushing and generators.
 *
 * TLDR:
 *   stepMonsters(state, events) runs once per tick after projectiles. Monsters are CombatTargetState
 *   entries carrying `monster` runtime data. Path distance comes from one bounded BFS field from the
 *   party tile; monsters descend the field. RNG draws are fixed (2 per attack).
 */

import { monsterTypeDef, type MonsterTypeDef } from '../data/monsterCatalog';
import { findItemDefByLegacyName } from '../data/itemCatalog';
import { effectiveChampionAttributes, championArmorRating } from './inventory';
import { nextRandom } from './rng';
import { killChampion } from './survival';
import { getTile, isTilePassable } from './simulation';
import { laneOfSubcell, expandMonsterGroup } from './monsterSpawn';
import {
  DIRECTION_DELTAS,
  type CombatTargetState,
  type Direction,
  type EngineEvent,
  type GameState,
  type ItemInstance,
  type SubTileQuadrant,
  type Tile
} from './types';

export const LORD_CHAOS_TYPE_ID = 23;
export const SCENT_RANGE_BONUS = 4;
export const MAX_MONSTERS_PER_TILE = 4;
export const MAX_LIVE_MONSTERS_PER_LEVEL = 24;
export const DOOR_CRUSH_DAMAGE = 40;
const MAX_MESSAGE_LOG = 24;
const DIRS: readonly Direction[] = [0, 1, 2, 3];

function pushMessage(state: GameState, text: string, events: EngineEvent[]): GameState {
  events.push({ type: 'MESSAGE_LOGGED', text });
  const messages = [...state.messages, text];
  return { ...state, messages: messages.length > MAX_MESSAGE_LOG ? messages.slice(-MAX_MESSAGE_LOG) : messages };
}

const key = (x: number, y: number): string => `${x},${y}`;

/** Single passability authority shared by AI and generators (M3). Ignores occupancy. */
export function monsterCanEnterTerrain(tile: Tile | undefined, flying: boolean): boolean {
  if (!tile) return false;
  switch (tile.type) {
    case 'STAIRS':
    case 'TELEPORTER':
    case 'WALL':
      return false;
    case 'PIT':
      return flying || !(tile.pit?.open ?? false);
    default:
      return isTilePassable(tile);
  }
}

/** Path-distance field (in tiles) from the party tile; radius-bounded breadth-first search. */
export function buildDistanceField(
  state: GameState,
  flying: boolean,
  radius: number
): Map<string, number> {
  const field = new Map<string, number>();
  const { x, y, level } = state.party;
  field.set(key(x, y), 0);
  let frontier: [number, number][] = [[x, y]];
  for (let d = 1; d <= radius; d++) {
    const nextFrontier: [number, number][] = [];
    for (const [cx, cy] of frontier) {
      for (const dir of DIRS) {
        const nx = cx + DIRECTION_DELTAS[dir].dx;
        const ny = cy + DIRECTION_DELTAS[dir].dy;
        const k = key(nx, ny);
        if (field.has(k)) continue;
        if (!monsterCanEnterTerrain(getTile(state.levels, level, nx, ny), flying)) continue;
        field.set(k, d);
        nextFrontier.push([nx, ny]);
      }
    }
    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }
  return field;
}

function liveMonsters(targets: readonly CombatTargetState[]): CombatTargetState[] {
  return targets.filter((t) => t.monster && !t.defeated);
}

function freeSubcell(targets: readonly CombatTargetState[], self: CombatTargetState, level: number, x: number, y: number): 0 | 1 | 2 | 3 | null {
  const used = new Set<number>();
  for (const t of targets) {
    if (t.monster && !t.defeated && t.id !== self.id && t.level === level && t.x === x && t.y === y) used.add(t.monster.subcell);
  }
  if (used.size >= MAX_MONSTERS_PER_TILE) return null;
  const preferred = self.monster!.subcell;
  if (!used.has(preferred)) return preferred;
  for (const c of [0, 1, 2, 3] as const) if (!used.has(c)) return c;
  return null;
}

function directionBetween(fromX: number, fromY: number, toX: number, toY: number): Direction {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 1 : 3;
  return dy >= 0 ? 2 : 0;
}

/** Which champion indexes are exposed to an attacker standing in the given absolute direction. */
export function exposedChampionIndexes(partyFacing: Direction, attackerDir: Direction): readonly number[] {
  const rel = (attackerDir - partyFacing + 4) % 4;
  return rel === 0 ? [0, 1] : rel === 2 ? [2, 3] : rel === 1 ? [1, 3] : [0, 2];
}

function chooseVictim(state: GameState, attackerDir: Direction, lane: 'LEFT' | 'RIGHT'): number {
  const champions = state.party.champions;
  const candidates = exposedChampionIndexes(state.party.facing, attackerDir);
  const alive = candidates.filter((i) => champions[i]?.alive);
  const laneMatch = alive.find((i) => (i % 2 === 0 ? 'LEFT' : 'RIGHT') === lane);
  if (laneMatch !== undefined) return laneMatch;
  if (alive.length > 0) return alive[0]!;
  return champions.findIndex((c) => c.alive);
}

function replaceTarget(state: GameState, target: CombatTargetState): GameState {
  return { ...state, combatTargets: state.combatTargets.map((t) => (t.id === target.id ? target : t)) };
}

function attackParty(
  state: GameState,
  target: CombatTargetState,
  def: MonsterTypeDef,
  attackerDir: Direction,
  events: EngineEvent[]
): GameState {
  const victimIndex = chooseVictim(state, attackerDir, target.lane);
  const victim = state.party.champions[victimIndex];
  if (!victim || !victim.alive) return state;
  const hitDraw = nextRandom(state.rngState);
  const dmgDraw = nextRandom(hitDraw.nextState);
  const attrs = effectiveChampionAttributes(state, victim);
  const hitChance = Math.max(0.35, Math.min(0.9, 0.85 - (attrs.dexterity + attrs.luck) / 400));
  const armor = championArmorRating(state, victim);
  const hit = hitDraw.value < hitChance;
  const raw = Math.floor(def.attack / 2) + Math.floor(dmgDraw.value * (def.attack / 2));
  const amount = hit ? Math.max(1, raw - Math.floor(armor / 2)) : 0;
  let next: GameState = { ...state, rngState: dmgDraw.nextState };
  events.push({ type: 'MONSTER_ATTACKED', monsterId: target.id, typeId: def.typeId, championId: victim.id, hit, amount });
  events.push({ type: 'SOUND_CUE', cue: 'MONSTER_ATTACK', sourceLevel: target.level, sourceX: target.x, sourceY: target.y });
  if (!hit) return pushMessage(next, `${def.name} MISSES ${victim.name}.`, events);
  const health = victim.health - amount;
  if (next.party.sleeping) {
    next = { ...next, party: { ...next.party, sleeping: false } };
    events.push({ type: 'SLEEP_STATE_CHANGED', sleeping: false });
  }
  events.push({ type: 'DAMAGE_APPLIED', targetId: victim.id, ownerChampionId: `monster:${target.id}`, amount });
  next = pushMessage(next, `${def.name} HITS ${victim.name} FOR ${amount}.`, events);
  if (health <= 0) {
    return killChampion(next, victimIndex, events);
  }
  return {
    ...next,
    party: {
      ...next.party,
      champions: next.party.champions.map((c, i) => (i === victimIndex ? { ...c, health, hurtUntilTick: next.tick + 6 } : c))
    }
  };
}

function lineClear(state: GameState, target: CombatTargetState): boolean {
  const { x, y, level } = state.party;
  if (target.x !== x && target.y !== y) return false;
  const dir = directionBetween(target.x, target.y, x, y);
  let cx = target.x + DIRECTION_DELTAS[dir].dx;
  let cy = target.y + DIRECTION_DELTAS[dir].dy;
  while (cx !== x || cy !== y) {
    if (!monsterCanEnterTerrain(getTile(state.levels, level, cx, cy), true)) return false;
    cx += DIRECTION_DELTAS[dir].dx;
    cy += DIRECTION_DELTAS[dir].dy;
  }
  return true;
}

function dropItem(state: GameState, target: CombatTargetState, def: MonsterTypeDef): GameState {
  if (!def.dropItem) return state;
  let found;
  try {
    found = findItemDefByLegacyName(def.dropItem);
  } catch {
    return state;
  }
  const id = `drop_${target.id}`;
  if (state.items[id]) return state;
  const inst: ItemInstance = { instanceId: id, defId: found.defId, iconIndex: found.iconIndex, name: found.name, charges: 0 };
  const quadrant = (target.monster!.subcell % 4) as SubTileQuadrant;
  const levels = state.levels.map((lvl) => {
    if (lvl.id !== target.level) return lvl;
    const tiles = lvl.tiles.map((row, ry) => ry !== target.y ? row : row.map((tile, rx) => {
      if (rx !== target.x) return tile;
      const stacks = tile.floorItems ?? { 0: [], 1: [], 2: [], 3: [] };
      return { ...tile, floorItems: { ...stacks, [quadrant]: [...(stacks[quadrant] ?? []), id] } };
    }));
    return { ...lvl, tiles };
  });
  return { ...state, levels, items: { ...state.items, [id]: inst } };
}

/** Removes defeated monsters once, emitting kill credit, a message, drops and a sound cue. */
function reapDefeated(state: GameState, events: EngineEvent[], cause: 'COMBAT' | 'CRUSHED'): GameState {
  let next = state;
  const dead = state.combatTargets.filter((t) => t.monster && t.defeated);
  if (dead.length === 0) return state;
  for (const target of dead) {
    const def = monsterTypeDef(target.monster!.typeId);
    if (!def) continue;
    const killer = cause === 'COMBAT' ? (target.monster!.lastHitBy ?? null) : null;
    events.push({ type: 'MONSTER_KILLED', monsterId: target.id, typeId: def.typeId, killerChampionId: killer, cause });
    events.push({ type: 'SOUND_CUE', cue: 'MONSTER_DEATH', sourceLevel: target.level, sourceX: target.x, sourceY: target.y });
    next = pushMessage(next, cause === 'CRUSHED' ? `${def.name} IS CRUSHED BY A DOOR.` : `${def.name} DIES.`, events);
    next = dropItem(next, target, def);
    if (def.typeId === LORD_CHAOS_TYPE_ID && cause === 'COMBAT' && !next.victory) {
      events.push({ type: 'VICTORY', tick: next.tick });
      next = pushMessage({ ...next, victory: true }, 'LORD CHAOS IS DEFEATED. VICTORY!', events);
    }
  }
  const deadIds = new Set(dead.map((t) => t.id));
  return { ...next, combatTargets: next.combatTargets.filter((t) => !deadIds.has(t.id)) };
}

function crushOnDoors(state: GameState, events: EngineEvent[]): GameState {
  let next = state;
  for (const target of liveMonsters(state.combatTargets)) {
    const tile = getTile(state.levels, target.level, target.x, target.y);
    const door = tile?.type === 'DOOR' ? tile.door : undefined;
    if (!door || door.targetProgress !== 4 || door.progress !== 2) continue;
    const health = Math.max(0, target.health - DOOR_CRUSH_DAMAGE);
    events.push({ type: 'DAMAGE_APPLIED', targetId: target.id, ownerChampionId: 'door', amount: target.health - health });
    next = replaceTarget(next, { ...target, health, defeated: health === 0 });
  }
  return reapDefeated(next, events, 'CRUSHED');
}

function stepGenerators(state: GameState, events: EngineEvent[]): GameState {
  if (state.monsterGenerators.length === 0) return state;
  let next = state;
  const generators = state.monsterGenerators.map((g) => {
    if (g.remaining <= 0 || g.nextSpawnTick > next.tick) return g;
    const def = monsterTypeDef(g.typeId);
    const tile = getTile(next.levels, g.level, g.x, g.y);
    const partyAdjacent = next.party.level === g.level
      && Math.abs(next.party.x - g.x) + Math.abs(next.party.y - g.y) <= 1;
    const live = liveMonsters(next.combatTargets).filter((t) => t.level === g.level);
    const onTile = live.filter((t) => t.x === g.x && t.y === g.y).length;
    const blockedByParty = next.party.level === g.level && next.party.x === g.x && next.party.y === g.y;
    if (!def || !monsterCanEnterTerrain(tile, def.traits.includes('FLYING'))
      || partyAdjacent || blockedByParty || onTile >= MAX_MONSTERS_PER_TILE
      || live.length >= MAX_LIVE_MONSTERS_PER_LEVEL) {
      return { ...g, nextSpawnTick: next.tick + g.intervalTicks };
    }
    const spawnId = `${g.id}_s${g.remaining}`;
    const spawned = expandMonsterGroup({
      id: spawnId, typeId: g.typeId, level: g.level, x: g.x, y: g.y, facing: 0, healths: [def.health]
    }, next.tick).map((t) => ({ ...t, monster: { ...t.monster!, subcell: (onTile % 4) as 0 | 1 | 2 | 3, awake: true } }));
    for (const s of spawned) {
      events.push({ type: 'MONSTER_SPAWNED', monsterId: s.id, typeId: g.typeId, level: g.level, x: g.x, y: g.y });
    }
    next = { ...next, combatTargets: [...next.combatTargets, ...spawned] };
    return { ...g, remaining: g.remaining - 1, nextSpawnTick: next.tick + g.intervalTicks };
  });
  return { ...next, monsterGenerators: generators };
}

/** One deterministic monster tick; cheap when no live monster is on the party level. */
export function stepMonsters(input: GameState, events: EngineEvent[]): GameState {
  let state = input.victory ? input : stepGenerators(input, events);
  state = reapDefeated(state, events, 'COMBAT');
  state = crushOnDoors(state, events);
  if (state.gameOver || state.victory || state.party.champions.length === 0) return state;

  const onLevel = liveMonsters(state.combatTargets).filter((t) => t.level === state.party.level);
  if (onLevel.length === 0) return state;

  let radius = 0;
  let needAir = false;
  for (const t of onLevel) {
    const def = monsterTypeDef(t.monster!.typeId);
    if (!def) continue;
    radius = Math.max(radius, def.sight + SCENT_RANGE_BONUS);
    if (def.traits.includes('FLYING')) needAir = true;
  }
  const ground = buildDistanceField(state, false, radius);
  const air = needAir ? buildDistanceField(state, true, radius) : ground;

  const ordered = [...onLevel].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const original of ordered) {
    const current = state.combatTargets.find((t) => t.id === original.id);
    if (!current || current.defeated || !current.monster || state.gameOver) continue;
    const def = monsterTypeDef(current.monster.typeId);
    if (!def) continue;
    const flying = def.traits.includes('FLYING');
    const field = flying ? air : ground;
    const dist = field.get(key(current.x, current.y));
    let m = current.monster;
    const hurt = current.health < current.maxHealth;
    if (!m.awake && ((dist !== undefined && dist <= def.sight) || hurt)) {
      m = { ...m, awake: true };
      state = replaceTarget(state, { ...current, monster: m });
    }
    if (!m.awake || dist === undefined) continue;

    if (dist === 1) {
      const dir = directionBetween(current.x, current.y, state.party.x, state.party.y);
      const attackDir = directionBetween(state.party.x, state.party.y, current.x, current.y);
      if (state.tick >= m.nextAttackTick) {
        m = { ...m, facing: dir, nextAttackTick: state.tick + def.attackTicks };
        state = replaceTarget(state, { ...current, monster: m });
        state = attackParty(state, state.combatTargets.find((t) => t.id === current.id)!, def, attackDir, events);
      } else if (m.facing !== dir) {
        state = replaceTarget(state, { ...current, monster: { ...m, facing: dir } });
      }
      continue;
    }

    if (def.traits.includes('RANGED') && dist <= def.sight && lineClear(state, current)
      && (current.x === state.party.x || current.y === state.party.y)) {
      if (state.tick >= m.nextAttackTick) {
        const attackDir = directionBetween(state.party.x, state.party.y, current.x, current.y);
        m = { ...m, facing: directionBetween(current.x, current.y, state.party.x, state.party.y), nextAttackTick: state.tick + def.attackTicks };
        state = replaceTarget(state, { ...current, monster: m });
        state = attackParty(state, state.combatTargets.find((t) => t.id === current.id)!, { ...def, attack: Math.floor(def.attack * 0.7) }, attackDir, events);
      }
      continue;
    }

    if (state.tick < m.nextMoveTick) continue;
    let moved = false;
    for (const dir of DIRS) {
      const nx = current.x + DIRECTION_DELTAS[dir].dx;
      const ny = current.y + DIRECTION_DELTAS[dir].dy;
      const nd = field.get(key(nx, ny));
      if (nd === undefined || nd >= dist || nd === 0) continue;
      const subcell = freeSubcell(state.combatTargets, current, current.level, nx, ny);
      if (subcell === null) continue;
      const slow = def.moveTicks;
      const arrived: CombatTargetState = {
        ...current,
        x: nx,
        y: ny,
        lane: laneOfSubcell(subcell),
        monster: {
          ...m,
          subcell,
          facing: dir,
          lastX: current.x,
          lastY: current.y,
          nextMoveTick: state.tick + slow,
          nextAttackTick: Math.max(m.nextAttackTick, state.tick + Math.ceil(def.attackTicks / 2))
        }
      };
      state = replaceTarget(state, arrived);
      events.push({ type: 'MONSTER_MOVED', monsterId: current.id, level: current.level, x: nx, y: ny });
      moved = true;
      break;
    }
    if (!moved) state = replaceTarget(state, { ...current, monster: { ...m, nextMoveTick: state.tick + 1 } });
  }
  return state;
}
