/**
 * Pure actuator target mutation and door tick animation helpers for Dungeon Master.
 *
 * TLDR:
 *   Applies SET, CLEAR, TOGGLE, and HOLD actuator signals to Doors, Pits, Teleporters,
 *   and TrickWalls, and advances multi-tick door animations (0=Open .. 4=Closed).
 *   Key functions: applyActuatorSignal, stepDoorsOnLevels, updateTileInLevels.
 */

import type {
  ActuatorAction,
  DoorProgress,
  DungeonLevel,
  EngineEvent,
  Tile
} from './types';

export function updateTileInLevels(
  levels: readonly DungeonLevel[],
  levelId: number,
  x: number,
  y: number,
  updater: (tile: Tile) => Tile
): readonly DungeonLevel[] {
  return levels.map((lvl) => {
    if (lvl.id !== levelId || y < 0 || y >= lvl.height || x < 0 || x >= lvl.width) {
      return lvl;
    }
    const row = lvl.tiles[y];
    const current = row?.[x];
    if (!row || !current) {
      return lvl;
    }
    const updated = updater(current);
    if (updated === current) {
      return lvl;
    }
    const nextRow = row.map((cell, cx) => (cx === x ? updated : cell));
    const nextTiles = lvl.tiles.map((r, cy) => (cy === y ? nextRow : r));
    return { ...lvl, tiles: nextTiles };
  });
}

function resolveBooleanSignal(currentActive: boolean, action: ActuatorAction): boolean {
  switch (action) {
    case 'SET':
      return true;
    case 'CLEAR':
      return false;
    case 'TOGGLE':
    case 'HOLD':
      return !currentActive;
  }
}

/**
 * Applies an actuator signal to a target tile at (targetLevel, targetX, targetY).
 * Note: In FTL Dungeon Master, SET on a Door opens it (targetProgress = 0) and CLEAR closes it (targetProgress = 4).
 */
export function applyActuatorSignal(
  levels: readonly DungeonLevel[],
  targetLevel: number,
  targetX: number,
  targetY: number,
  action: ActuatorAction,
  events: EngineEvent[]
): readonly DungeonLevel[] {
  return updateTileInLevels(levels, targetLevel, targetX, targetY, (tile) => {
    if (tile.type === 'DOOR' && tile.door && tile.door.progress !== 5) {
      let nextTarget: 0 | 4 = tile.door.targetProgress;
      if (action === 'SET') {
        nextTarget = 0;
      } else if (action === 'CLEAR') {
        nextTarget = 4;
      } else {
        nextTarget = tile.door.targetProgress === 0 ? 4 : 0;
      }
      if (nextTarget === tile.door.targetProgress) {
        return tile;
      }
      events.push({
        type: 'SOUND_CUE',
        cue: 'DOOR_CLANK',
        sourceLevel: targetLevel,
        sourceX: targetX,
        sourceY: targetY
      });
      return {
        ...tile,
        door: { ...tile.door, targetProgress: nextTarget }
      };
    }

    if (tile.type === 'PIT' && tile.pit) {
      const nextOpen = resolveBooleanSignal(tile.pit.open, action);
      return {
        ...tile,
        pit: { ...tile.pit, open: nextOpen }
      };
    }

    if (tile.type === 'TELEPORTER' && tile.teleporter) {
      const nextActive = resolveBooleanSignal(tile.teleporter.active, action);
      return {
        ...tile,
        teleporter: { ...tile.teleporter, active: nextActive }
      };
    }

    if (tile.type === 'TRICK_WALL' && tile.trickWall) {
      const nextOpen = resolveBooleanSignal(tile.trickWall.open, action);
      return {
        ...tile,
        trickWall: { ...tile.trickWall, open: nextOpen }
      };
    }

    return tile;
  });
}

/**
 * Advances animating doors by 1 step toward their targetProgress (0=Open .. 4=Closed) per tick.
 */
export function stepDoorsOnLevels(
  levels: readonly DungeonLevel[],
  events: EngineEvent[]
): readonly DungeonLevel[] {
  return levels.map((lvl) => {
    let levelChanged = false;
    const nextTiles = lvl.tiles.map((row, y) => {
      let rowChanged = false;
      const nextRow = row.map((tile, x) => {
        if (tile.type !== 'DOOR' || !tile.door || tile.door.progress === 5) {
          return tile;
        }
        const { progress, targetProgress } = tile.door;
        if (progress === targetProgress) {
          return tile;
        }
        const nextProgress = (
          progress < targetProgress ? progress + 1 : progress - 1
        ) as DoorProgress;
        rowChanged = true;
        levelChanged = true;
        events.push({
          type: 'DOOR_STATE_CHANGED',
          level: lvl.id,
          x,
          y,
          progress: nextProgress
        });
        events.push({
          type: 'SOUND_CUE',
          cue: 'DOOR_CLANK',
          sourceLevel: lvl.id,
          sourceX: x,
          sourceY: y
        });
        return {
          ...tile,
          door: { ...tile.door, progress: nextProgress }
        };
      });
      return rowChanged ? nextRow : row;
    });
    return levelChanged ? { ...lvl, tiles: nextTiles } : lvl;
  });
}
