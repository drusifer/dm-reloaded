/**
 * Pure 6 Hz ProjectileEngine: corridor item throws, flight, collisions and landing.
 *
 * TLDR:
 *   launchProjectile turns the cursor-hand item into a ProjectileState travelling down the LEFT or
 *   RIGHT lane of the party's facing corridor (range from thrower Strength vs. item weight).
 *   stepProjectiles advances every projectile one tile per tick: walls, stairs and closed doors stop
 *   it (items pass through closed IRON_GRATE when slender), active object teleporters redirect it,
 *   open pits drop it a level, and it lands in the tile's floorItems[quadrant] stack, firing any
 *   floor pressure plate on that tile. Zero DOM; deterministic.
 */

import { effectiveChampionAttributes } from './inventory';
import { ITEM_CATALOG_180, findItemDef } from '../data/itemCatalog';
import { mapCoordsBetweenLevels, triggerActuatorList, updateTileInLevels } from './actuators';
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
    level: state.party.level,
    x: state.party.x,
    y: state.party.y,
    direction: state.party.facing,
    lane: side,
    kineticEnergy: range,
    stepEnergyCost: 1
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

function stepOne(cur: GameState, p: ProjectileState, events: EngineEvent[]): StepResult {
  const def = defOfItem(cur, p.itemId);
  if (!def) {
    return { state: cur, projectile: null };
  }
  const quadrant = laneQuadrant(p.direction, p.lane);
  const landHere = (): StepResult => ({
    state: landItem(cur, p.itemId, p.level, p.x, p.y, quadrant, events),
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
        const slips = door.material === 'IRON_GRATE' && def.passThroughGrate;
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
        return {
          state: landItem(cur, p.itemId, below, mapped.x, mapped.y, quadrant, events),
          projectile: null
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
            state: landItem(cur, p.itemId, tp.destLevel, tp.destX, tp.destY, laneQuadrant(nextDir, p.lane), events),
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

  const energy = p.kineticEnergy - p.stepEnergyCost;
  if (energy <= 0) {
    return {
      state: landItem(cur, p.itemId, p.level, nx, ny, quadrant, events),
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
