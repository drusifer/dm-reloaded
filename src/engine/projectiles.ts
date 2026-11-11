/**
 * Pure 6 Hz ProjectileEngine: typed physical/magical flight, collisions and impacts.
 *
 * TLDR:
 *   Free item throws, ranged ammunition and spells share one lane-aware tick path. Geometry, doors,
 *   pits and object teleporters retain their existing behavior; typed impacts resolve once, physical
 *   payloads remain inventory-owned, and explosions deduplicate targets. Zero DOM; deterministic.
 */

import { effectiveChampionAttributes } from './inventory';
import { ITEM_CATALOG_180, findItemDef } from '../data/itemCatalog';
import { COMBAT_ACTIONS } from '../data/combatCatalog';
import { mapCoordsBetweenLevels, triggerActuatorList, updateTileInLevels } from './actuators';
import { damageTarget } from './combat';
import { awardSkillExperience } from './progression';
import {
  DIRECTION_DELTAS,
  type ChampionState,
  type Direction,
  type DungeonLevel,
  type EngineEvent,
  type GameState,
  type ItemDef,
  type ItemInstanceId,
  type ProjectileState,
  type SubTileQuadrant,
  type Tile
} from './types';

export const MAX_THROW_TILES = 8;

/** Tiles a thrown item flies: stronger throwers and lighter items go farther (1..8). */
export function throwRangeTiles(strength: number, weightTenthsKg: number): number {
  return Math.max(1, Math.min(MAX_THROW_TILES, Math.floor((strength * 10) / (weightTenthsKg + 10))));
}

/** Far-lane quadrant for an item travelling `direction`: LEFT = d, RIGHT = (d + 1) & 3. */
export function laneQuadrant(direction: Direction, lane: 'LEFT' | 'RIGHT'): SubTileQuadrant {
  return (lane === 'LEFT' ? direction : (direction + 1) & 3) as SubTileQuadrant;
}

function tileAt(levels: readonly DungeonLevel[], levelId: number, x: number, y: number): Tile | undefined {
  const lvl = levels.find((l) => l.id === levelId);
  if (!lvl || x < 0 || y < 0 || x >= lvl.width || y >= lvl.height) {
    return undefined;
  }
  return lvl.tiles[y]?.[x];
}

function defOfItem(state: GameState, itemId: ItemInstanceId): ItemDef | undefined {
  const item = state.items[itemId];
  return item ? (ITEM_CATALOG_180[item.defId] ?? findItemDef('MISC', 0)) : undefined;
}

function pickThrower(state: GameState): number {
  const lead = state.party.champions[state.party.leaderIndex];
  if (lead?.alive) {
    return state.party.leaderIndex;
  }
  return state.party.champions.findIndex((c) => c.alive);
}

/**
 * Lands an in-world item on a tile's floor quadrant (top of stack) and fires that tile's floor
 * actuators (pressure plates) if it is not a wall tile.
 */
export function landItem(
  state: GameState,
  itemId: ItemInstanceId,
  level: number,
  x: number,
  y: number,
  quadrant: SubTileQuadrant,
  events: EngineEvent[]
): GameState {
  const tile = tileAt(state.levels, level, x, y);
  const item = state.items[itemId];
  if (!tile || !item) {
    return state;
  }
  const stacks = tile.floorItems ?? { 0: [], 1: [], 2: [], 3: [] };
  const levels = updateTileInLevels(state.levels, level, x, y, (t) => ({
    ...t,
    floorItems: { ...stacks, [quadrant]: [...(stacks[quadrant] ?? []), itemId] }
  }));
  events.push({ type: 'ITEM_DROPPED', itemId, name: item.name });
  let next: GameState = { ...state, levels };
  if (tile.type !== 'WALL' && tile.actuators.length > 0) {
    next = triggerActuatorList(next, level, x, y, tile.actuators, events);
  }
  return next;
}

/** Throws the cursor-hand item down the left/right lane of the corridor the party faces. */
export function launchProjectile(
  state: GameState,
  side: 'LEFT' | 'RIGHT',
  events: EngineEvent[]
): GameState {
  if (
    !state.handItem ||
    state.activeMirror ||
    state.openInventoryChampionIndex !== null ||
    state.party.sleeping ||
    state.gameOver
  ) {
    return state;
  }
  const throwerIndex = pickThrower(state);
  const thrower = state.party.champions[throwerIndex];
  const item = state.items[state.handItem];
  const def = defOfItem(state, state.handItem);
  if (!thrower || !item || !def) {
    return state;
  }

  const range = throwRangeTiles(effectiveChampionAttributes(state, thrower).strength, def.weightTenthsKg);
  const staminaCost = 1 + Math.floor(def.weightTenthsKg / 20);
  const champions: readonly ChampionState[] = state.party.champions.map((c, i) =>
    i === throwerIndex ? { ...c, stamina: Math.max(0, c.stamina - staminaCost) } : c
  );

  const projectile: ProjectileState = {
    id: `proj_${state.tick}_${state.projectiles.length}_${item.instanceId}`,
    itemId: item.instanceId,
    ownerChampionId: thrower.id,
    level: state.party.level,
    x: state.party.x,
    y: state.party.y,
    direction: state.party.facing,
    lane: side,
    power: range,
    kineticEnergy: range,
    stepEnergyCost: 1,
    payload: { kind: 'ITEM', itemId: item.instanceId }
  };

  events.push({ type: 'ITEM_THROWN', itemId: item.instanceId, side });
  events.push({
    type: 'SOUND_CUE',
    cue: 'THROW_SWOOSH',
    sourceLevel: state.party.level,
    sourceX: state.party.x,
    sourceY: state.party.y
  });

  return {
    ...state,
    handItem: null,
    projectiles: [...state.projectiles, projectile],
    party: { ...state.party, champions }
  };
}

interface StepResult {
  readonly state: GameState;
  readonly projectile: ProjectileState | null;
}

function payloadItemId(projectile: ProjectileState): ItemInstanceId | null {
  return projectile.payload.kind === 'SPELL' ? null : projectile.payload.itemId;
}

function resolveImpact(
  cur: GameState,
  projectile: ProjectileState,
  level: number,
  x: number,
  y: number,
  events: EngineEvent[]
): GameState {
  events.push({ type: 'PROJECTILE_IMPACT', projectileId: projectile.id, level, x, y });
  let next: GameState = {
    ...cur,
    impactMarkers: [...cur.impactMarkers, { level, x, y, lane: projectile.lane, expiresAtTick: cur.tick + 2 }]
  };
  const hitTargets = next.combatTargets.filter(
    (target) => target.level === level && target.x === x && target.y === y
      && target.lane === projectile.lane && !target.defeated
  );

  if (projectile.payload.kind === 'SPELL' && projectile.payload.explosive) {
    const seenTargetIds = new Set<string>();
    const unique = next.combatTargets.filter((target) => {
      if (target.level !== level || target.defeated
        || Math.abs(target.x - x) + Math.abs(target.y - y) > 1
        || seenTargetIds.has(target.id)) return false;
      seenTargetIds.add(target.id);
      return true;
    });
    const affected: string[] = [];
    for (const target of unique) {
      const center = target.x === x && target.y === y && target.lane === projectile.lane;
      const amount = center ? projectile.power : Math.floor(projectile.power / 2);
      if (amount <= 0) continue;
      next = damageTarget(next, target.id, amount, projectile.ownerChampionId, events, true);
      affected.push(target.id);
    }
    events.push({ type: 'EXPLOSION_RESOLVED', projectileId: projectile.id, targetIds: affected });
  } else if (hitTargets[0] && projectile.power > 0) {
    next = damageTarget(next, hitTargets[0].id, projectile.power, projectile.ownerChampionId, events, projectile.payload.kind === 'SPELL');
  }

  if (hitTargets[0] && projectile.power > 0 && projectile.payload.kind !== 'SPELL') {
    const action = projectile.payload.kind === 'AMMUNITION'
      ? COMBAT_ACTIONS[projectile.payload.actionId as keyof typeof COMBAT_ACTIONS]
      : COMBAT_ACTIONS.SHOOT;
    const awarded = awardSkillExperience(next, projectile.ownerChampionId, action?.subskill ?? 4, action?.experience ?? 6);
    next = awarded.state;
    events.push(...awarded.events);
  }

  const itemId = payloadItemId(projectile);
  return itemId
    ? landItem(next, itemId, level, x, y, laneQuadrant(projectile.direction, projectile.lane), events)
    : next;
}

function stepOne(cur: GameState, p: ProjectileState, events: EngineEvent[]): StepResult {
  const itemId = payloadItemId(p);
  const def = itemId ? defOfItem(cur, itemId) : undefined;
  if (itemId && !def) {
    return { state: cur, projectile: null };
  }
  const landHere = (): StepResult => ({
    state: resolveImpact(cur, p, p.level, p.x, p.y, events),
    projectile: null
  });

  const { dx, dy } = DIRECTION_DELTAS[p.direction];
  const nx = p.x + dx;
  const ny = p.y + dy;
  const tile = tileAt(cur.levels, p.level, nx, ny);
  if (!tile) {
    return landHere();
  }

  switch (tile.type) {
    case 'WALL':
    case 'STAIRS':
      return landHere();
    case 'TRICK_WALL':
      if (tile.trickWall && !tile.trickWall.open && !tile.trickWall.illusionary) {
        return landHere();
      }
      break;
    case 'DOOR': {
      const door = tile.door;
      if (door && !(door.progress <= 1 || door.progress === 5)) {
        const slips = door.material === 'IRON_GRATE'
          && (p.payload.kind === 'SPELL' || Boolean(def?.passThroughGrate));
        if (!slips) {
          return landHere();
        }
      }
      break;
    }
    case 'PIT': {
      if (tile.pit && tile.pit.open && !tile.pit.illusionary) {
        const below = p.level + 1;
        if (!cur.levels.some((l) => l.id === below)) {
          return landHere();
        }
        const mapped = mapCoordsBetweenLevels(cur.levels, p.level, below, nx, ny);
        if (p.payload.kind !== 'SPELL') {
          return {
            state: resolveImpact(cur, p, below, mapped.x, mapped.y, events),
            projectile: null
          };
        }
        return {
          state: cur,
          projectile: { ...p, level: below, x: mapped.x, y: mapped.y }
        };
      }
      break;
    }
    case 'TELEPORTER': {
      const tp = tile.teleporter;
      if (tp && tp.active && (tp.scope === 'OBJECTS' || tp.scope === 'PARTY_AND_OBJECTS' || tp.scope === 'ALL')) {
        const nextDir: Direction = tp.absoluteRotation
          ? tp.rotation
          : (((p.direction + tp.rotation) % 4) as Direction);
        const energy = p.kineticEnergy - p.stepEnergyCost;
        const moved: ProjectileState = {
          ...p,
          level: tp.destLevel,
          x: tp.destX,
          y: tp.destY,
          direction: nextDir,
          kineticEnergy: energy
        };
        if (energy <= 0) {
          return {
            state: resolveImpact(cur, moved, tp.destLevel, tp.destX, tp.destY, events),
            projectile: null
          };
        }
        return { state: cur, projectile: moved };
      }
      break;
    }
    default:
      break;
  }

  const target = cur.combatTargets.find(
    (candidate) => candidate.level === p.level && candidate.x === nx && candidate.y === ny
      && candidate.lane === p.lane && !candidate.defeated
  );
  if (target) {
    return { state: resolveImpact(cur, p, p.level, nx, ny, events), projectile: null };
  }

  const energy = p.kineticEnergy - p.stepEnergyCost;
  if (energy <= 0) {
    return {
      state: resolveImpact(cur, p, p.level, nx, ny, events),
      projectile: null
    };
  }
  return { state: cur, projectile: { ...p, x: nx, y: ny, kineticEnergy: energy } };
}

/** Advances every in-flight projectile by one tile (one 6 Hz tick). */
export function stepProjectiles(state: GameState, events: EngineEvent[]): GameState {
  if (state.projectiles.length === 0) {
    return state;
  }
  let cur: GameState = { ...state, projectiles: [] };
  const survivors: ProjectileState[] = [];
  for (const p of state.projectiles) {
    const res = stepOne(cur, p, events);
    cur = res.state;
    if (res.projectile) {
      survivors.push(res.projectile);
    }
  }
  return { ...cur, projectiles: survivors };
}
