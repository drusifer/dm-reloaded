/**
 * Pure deterministic simulation reducer for Dungeon Master (Amiga Trilogy).
 *
 * TLDR:
 *   Implements createInitialGameState, dispatchCommand, and effectiveLightLevel with
 *   zero browser/DOM coupling. Handles movement cooldowns, wall bumps ("OOF!"), fake walls,
 *   multi-tick doors, wall buttons, floor pressure plates, pits, stairs, teleporters,
 *   starter torches, Champion Mirror Resurrect/Reincarnate/Cancel, and Purist/QoL toggles.
 */

import { applyActuatorSignal, stepDoorsOnLevels, updateTileInLevels } from './actuators';
import { nextRandom } from './clock';
import {
  DIRECTION_DELTAS,
  type Actuator,
  type CampaignBundle,
  type ChampionDefinition,
  type ChampionState,
  type Direction,
  type DungeonLevel,
  type EngineEvent,
  type GameCommand,
  type GameState,
  type MoveDirection,
  type PendingActuatorOp,
  type RecruitMode,
  type SimulationStepResult,
  type Tile
} from './types';

export const BASE_MOVE_COOLDOWN_TICKS = 1;
export const MAX_PARTY_CHAMPIONS = 4;
export const MAX_MESSAGE_LOG = 24;

export function tileKey(level: number, x: number, y: number): string {
  return `${level}:${x},${y}`;
}

export function getTile(
  levels: readonly DungeonLevel[],
  levelId: number,
  x: number,
  y: number
): Tile | undefined {
  const lvl = levels.find((l) => l.id === levelId);
  if (!lvl || x < 0 || y < 0 || x >= lvl.width || y >= lvl.height) {
    return undefined;
  }
  return lvl.tiles[y]?.[x];
}

/**
 * Computes effective light level [0..5] on the party's current dungeon floor.
 */
export function effectiveLightLevel(state: GameState): number {
  const lvl = state.levels.find((l) => l.id === state.party.level);
  const ambient = lvl ? lvl.ambientLight : 0;
  return Math.max(0, Math.min(5, ambient + state.party.torchLight));
}

/**
 * Determines whether the party can step onto a given tile.
 * Doors block movement when > 1/4 closed (progress >= 2, unless bashed === 5).
 */
export function isTilePassable(tile: Tile | undefined): boolean {
  if (!tile) {
    return false;
  }
  switch (tile.type) {
    case 'WALL':
      return false;
    case 'FLOOR':
    case 'PIT':
    case 'STAIRS':
    case 'TELEPORTER':
      return true;
    case 'DOOR':
      if (!tile.door) {
        return true;
      }
      return tile.door.progress <= 1 || tile.door.progress === 5;
    case 'TRICK_WALL':
      if (!tile.trickWall) {
        return true;
      }
      return tile.trickWall.open || tile.trickWall.illusionary;
  }
}

export function createInitialGameState(bundle: CampaignBundle): GameState {
  const { dungeon } = bundle;
  const startKey = tileKey(dungeon.startLevel, dungeon.startX, dungeon.startY);
  return {
    campaignId: dungeon.campaignId,
    tick: 0,
    rngState: dungeon.seed || 99,
    levels: dungeon.levels,
    championsCatalog: dungeon.champions,
    party: {
      level: dungeon.startLevel,
      x: dungeon.startX,
      y: dungeon.startY,
      facing: dungeon.startFacing,
      stepParity: 0,
      moveCooldownTicks: 0,
      torchLight: 3, // Starter torchlight so descent into Level 1 is never pitch-black (HCI #5)
      champions: [],
      visitedTiles: { [startKey]: true }
    },
    activeMirror: null,
    pendingActuators: [],
    messages: ['ENTER THE HALL OF CHAMPIONS.'],
    settings: {
      qolMode: false, // 1988 Purist Mode default (ADR-004)
      automapOpen: false,
      audioMuted: false
    }
  };
}

function appendMessage(messages: readonly string[], text: string, events: EngineEvent[]): readonly string[] {
  events.push({ type: 'MESSAGE_LOGGED', text });
  const next = [...messages, text];
  return next.length > MAX_MESSAGE_LOG ? next.slice(next.length - MAX_MESSAGE_LOG) : next;
}

function resolveMoveVector(facing: Direction, move: MoveDirection): { readonly dx: number; readonly dy: number } {
  switch (move) {
    case 'FORWARD':
      return DIRECTION_DELTAS[facing];
    case 'BACKWARD':
      return DIRECTION_DELTAS[((facing + 2) % 4) as Direction];
    case 'STRAFE_LEFT':
      return DIRECTION_DELTAS[((facing + 3) % 4) as Direction];
    case 'STRAFE_RIGHT':
      return DIRECTION_DELTAS[((facing + 1) % 4) as Direction];
  }
}

function mapCoordsBetweenLevels(
  levels: readonly DungeonLevel[],
  fromLevelId: number,
  toLevelId: number,
  x: number,
  y: number
): { readonly x: number; readonly y: number } {
  const fromLvl = levels.find((l) => l.id === fromLevelId);
  const toLvl = levels.find((l) => l.id === toLevelId);
  if (!fromLvl || !toLvl) {
    return { x, y };
  }
  const worldX = fromLvl.offsetX + x;
  const worldY = fromLvl.offsetY + y;
  const mappedX = Math.max(0, Math.min(toLvl.width - 1, worldX - toLvl.offsetX));
  const mappedY = Math.max(0, Math.min(toLvl.height - 1, worldY - toLvl.offsetY));
  return { x: mappedX, y: mappedY };
}

function triggerActuatorList(
  state: GameState,
  levelId: number,
  tileX: number,
  tileY: number,
  actuators: readonly Actuator[],
  events: EngineEvent[]
): GameState {
  let nextLevels = state.levels;
  const nextPending: PendingActuatorOp[] = [...state.pendingActuators];

  for (const act of actuators) {
    if (act.onceOnly && act.triggered) {
      continue;
    }
    if (act.isLocal || act.rawType === 127) {
      continue;
    }

    if (act.onceOnly) {
      nextLevels = updateTileInLevels(nextLevels, levelId, tileX, tileY, (t) => ({
        ...t,
        actuators: t.actuators.map((a) => (a.id === act.id ? { ...a, triggered: true } : a))
      }));
    }

    if (act.playSound) {
      events.push({
        type: 'SOUND_CUE',
        cue: 'SWITCH_CLICK',
        sourceLevel: levelId,
        sourceX: tileX,
        sourceY: tileY
      });
    }

    if (act.delayTicks > 0) {
      nextPending.push({
        dueTick: state.tick + act.delayTicks,
        action: act.action,
        targetLevel: act.targetLevel,
        targetX: act.targetX,
        targetY: act.targetY,
        playSound: act.playSound
      });
    } else {
      nextLevels = applyActuatorSignal(
        nextLevels,
        act.targetLevel,
        act.targetX,
        act.targetY,
        act.action,
        events
      );
    }
  }

  return {
    ...state,
    levels: nextLevels,
    pendingActuators: nextPending
  };
}

function resolvePostStepHazards(state: GameState, events: EngineEvent[]): GameState {
  let current = state;

  // Floor pressure plates on destination tile (Floor tiles with non-local actuators)
  const steppedTile = getTile(current.levels, current.party.level, current.party.x, current.party.y);
  if (steppedTile && steppedTile.type !== 'WALL' && steppedTile.actuators.length > 0) {
    current = triggerActuatorList(
      current,
      current.party.level,
      current.party.x,
      current.party.y,
      steppedTile.actuators,
      events
    );
  }

  // Up to 4 chained hazard transitions (teleporter -> pit, pit -> pit, stairs)
  for (let hop = 0; hop < 4; hop++) {
    const tile = getTile(current.levels, current.party.level, current.party.x, current.party.y);
    if (!tile) {
      break;
    }

    if (
      tile.type === 'TELEPORTER' &&
      tile.teleporter &&
      tile.teleporter.active &&
      (tile.teleporter.scope === 'PARTY_AND_OBJECTS' || tile.teleporter.scope === 'ALL')
    ) {
      const tp = tile.teleporter;
      const fromLevel = current.party.level;
      const nextFacing: Direction = tp.absoluteRotation
        ? tp.rotation
        : (((current.party.facing + tp.rotation) % 4) as Direction);
      const destKey = tileKey(tp.destLevel, tp.destX, tp.destY);

      events.push({
        type: 'TELEPORTED',
        fromLevel,
        toLevel: tp.destLevel,
        x: tp.destX,
        y: tp.destY
      });
      if (tp.playSound) {
        events.push({
          type: 'SOUND_CUE',
          cue: 'TELEPORT_BUZZ',
          sourceLevel: tp.destLevel,
          sourceX: tp.destX,
          sourceY: tp.destY
        });
      }

      const sameSpot =
        fromLevel === tp.destLevel && current.party.x === tp.destX && current.party.y === tp.destY;
      current = {
        ...current,
        party: {
          ...current.party,
          level: tp.destLevel,
          x: tp.destX,
          y: tp.destY,
          facing: nextFacing,
          visitedTiles: { ...current.party.visitedTiles, [destKey]: true }
        }
      };
      if (sameSpot) {
        break;
      }
      continue;
    }

    if (tile.type === 'PIT' && tile.pit && tile.pit.open && !tile.pit.illusionary) {
      const fromLevel = current.party.level;
      const toLevel = fromLevel + 1;
      const hasBelow = current.levels.some((l) => l.id === toLevel);
      if (!hasBelow) {
        break;
      }
      const mapped = mapCoordsBetweenLevels(current.levels, fromLevel, toLevel, current.party.x, current.party.y);
      const destKey = tileKey(toLevel, mapped.x, mapped.y);
      events.push({
        type: 'PIT_FALLEN',
        fromLevel,
        toLevel,
        x: mapped.x,
        y: mapped.y
      });
      events.push({
        type: 'SOUND_CUE',
        cue: 'PIT_FALL',
        sourceLevel: toLevel,
        sourceX: mapped.x,
        sourceY: mapped.y
      });
      const nextMessages = appendMessage(current.messages, 'YOU FALL DOWN A PIT!', events);
      current = {
        ...current,
        messages: nextMessages,
        party: {
          ...current.party,
          level: toLevel,
          x: mapped.x,
          y: mapped.y,
          visitedTiles: { ...current.party.visitedTiles, [destKey]: true }
        }
      };
      continue;
    }

    if (tile.type === 'STAIRS' && tile.stairs) {
      const fromLevel = current.party.level;
      const toLevel = tile.stairs.direction === 'DOWN' ? fromLevel + 1 : fromLevel - 1;
      const destLevelObj = current.levels.find((l) => l.id === toLevel);
      if (!destLevelObj) {
        break;
      }
      const mapped = mapCoordsBetweenLevels(current.levels, fromLevel, toLevel, current.party.x, current.party.y);
      const destKey = tileKey(toLevel, mapped.x, mapped.y);
      events.push({
        type: 'STAIRS_TAKEN',
        fromLevel,
        toLevel,
        x: mapped.x,
        y: mapped.y
      });
      events.push({
        type: 'SOUND_CUE',
        cue: 'FOOTSTEP',
        sourceLevel: toLevel,
        sourceX: mapped.x,
        sourceY: mapped.y
      });
      current = {
        ...current,
        party: {
          ...current.party,
          level: toLevel,
          x: mapped.x,
          y: mapped.y,
          visitedTiles: { ...current.party.visitedTiles, [destKey]: true }
        }
      };
      break;
    }

    break;
  }

  return current;
}

function handleMove(state: GameState, direction: MoveDirection, events: EngineEvent[]): GameState {
  if (state.activeMirror) {
    return state;
  }
  if (state.party.moveCooldownTicks > 0) {
    return state;
  }

  const { dx, dy } = resolveMoveVector(state.party.facing, direction);
  const targetX = state.party.x + dx;
  const targetY = state.party.y + dy;
  const targetTile = getTile(state.levels, state.party.level, targetX, targetY);

  if (!isTilePassable(targetTile)) {
    events.push({ type: 'WALL_BUMPED', targetX, targetY });
    events.push({
      type: 'SOUND_CUE',
      cue: 'WALL_BUMP',
      sourceLevel: state.party.level,
      sourceX: targetX,
      sourceY: targetY
    });
    const nextMessages = appendMessage(state.messages, 'OOF!', events);
    return {
      ...state,
      messages: nextMessages,
      party: { ...state.party, moveCooldownTicks: BASE_MOVE_COOLDOWN_TICKS }
    };
  }

  const nextParity: 0 | 1 = state.party.stepParity === 0 ? 1 : 0;
  const visitedKey = tileKey(state.party.level, targetX, targetY);
  events.push({ type: 'STEP_TAKEN', level: state.party.level, x: targetX, y: targetY });
  events.push({
    type: 'SOUND_CUE',
    cue: 'FOOTSTEP',
    sourceLevel: state.party.level,
    sourceX: targetX,
    sourceY: targetY
  });

  // Check if floor has wall/floor inscription text (non-mirror wall plaques are read via INTERACT_AHEAD)
  const movedState: GameState = {
    ...state,
    party: {
      ...state.party,
      x: targetX,
      y: targetY,
      stepParity: nextParity,
      moveCooldownTicks: BASE_MOVE_COOLDOWN_TICKS,
      visitedTiles: { ...state.party.visitedTiles, [visitedKey]: true }
    }
  };

  return resolvePostStepHazards(movedState, events);
}

function handleInteractAhead(state: GameState, events: EngineEvent[]): GameState {
  if (state.activeMirror) {
    return state;
  }

  const { dx, dy } = DIRECTION_DELTAS[state.party.facing];
  const aheadX = state.party.x + dx;
  const aheadY = state.party.y + dy;
  const aheadTile = getTile(state.levels, state.party.level, aheadX, aheadY);
  if (!aheadTile) {
    return state;
  }

  // 1. Door ahead with a button: toggle targetProgress (0 <-> 4)
  if (aheadTile.type === 'DOOR' && aheadTile.door && aheadTile.door.hasButton && aheadTile.door.progress !== 5) {
    const nextTarget: 0 | 4 = aheadTile.door.targetProgress === 0 ? 4 : 0;
    events.push({
      type: 'SWITCH_TOGGLED',
      level: state.party.level,
      x: aheadX,
      y: aheadY
    });
    events.push({
      type: 'SOUND_CUE',
      cue: 'SWITCH_CLICK',
      sourceLevel: state.party.level,
      sourceX: aheadX,
      sourceY: aheadY
    });
    const nextLevels = updateTileInLevels(state.levels, state.party.level, aheadX, aheadY, (t) =>
      t.door ? { ...t, door: { ...t.door, targetProgress: nextTarget } } : t
    );
    return { ...state, levels: nextLevels };
  }

  // Face of the ahead wall that points back toward the party:
  const oppositeFace = ((state.party.facing + 2) % 4) as Direction;
  const facingFeatures = aheadTile.wallFeatures.filter((f) => f.face === oppositeFace);

  // 2. Champion Mirror on ahead wall
  const mirrorFeature = facingFeatures.find((f) => f.kind === 'CHAMPION_MIRROR' && f.championId);
  if (mirrorFeature && mirrorFeature.championId) {
    const champ = state.championsCatalog[mirrorFeature.championId];
    if (champ) {
      if (state.party.champions.length >= MAX_PARTY_CHAMPIONS) {
        const msgs = appendMessage(state.messages, 'YOUR PARTY IS ALREADY FULL (4 CHAMPIONS).', events);
        return { ...state, messages: msgs };
      }
      events.push({ type: 'MIRROR_OPENED', championId: champ.id, name: champ.name });
      return {
        ...state,
        activeMirror: {
          wallX: aheadX,
          wallY: aheadY,
          face: oppositeFace,
          champion: champ
        }
      };
    }
  }

  // 3. Torch sconce on ahead wall
  const torchSconce = facingFeatures.find((f) => f.kind === 'SCONCE' && f.hasTorch);
  if (torchSconce) {
    events.push({ type: 'TORCH_TAKEN', wallX: aheadX, wallY: aheadY });
    events.push({
      type: 'SOUND_CUE',
      cue: 'SWITCH_CLICK',
      sourceLevel: state.party.level,
      sourceX: aheadX,
      sourceY: aheadY
    });
    const nextLevels = updateTileInLevels(state.levels, state.party.level, aheadX, aheadY, (t) => ({
      ...t,
      wallFeatures: t.wallFeatures.map((f) =>
        f.face === oppositeFace && f.kind === 'SCONCE' ? { ...f, hasTorch: false } : f
      )
    }));
    const msgs = appendMessage(state.messages, 'TORCH TAKEN — THE FLAME BRIGHTENS YOUR PATH.', events);
    return {
      ...state,
      levels: nextLevels,
      messages: msgs,
      party: { ...state.party, torchLight: Math.min(5, state.party.torchLight + 2) }
    };
  }

  // 4. Wall inscription plaque
  const inscription = facingFeatures.find((f) => f.kind === 'INSCRIPTION' && f.text);
  if (inscription && inscription.text) {
    const cleanText = inscription.text.replace(/\n+/g, ' - ').trim();
    const msgs = appendMessage(state.messages, cleanText, events);
    return { ...state, messages: msgs };
  }

  // 5. Wall actuators (buttons/levers) on oppositeFace
  const facingActuators = aheadTile.actuators.filter(
    (a) => a.face === oppositeFace && a.rawType !== 127
  );
  if (facingActuators.length > 0) {
    events.push({
      type: 'SWITCH_TOGGLED',
      level: state.party.level,
      x: aheadX,
      y: aheadY
    });
    return triggerActuatorList(state, state.party.level, aheadX, aheadY, facingActuators, events);
  }

  return state;
}

function buildRecruitedChampion(
  def: ChampionDefinition,
  mode: RecruitMode,
  rngState: number
): { readonly champion: ChampionState; readonly nextRng: number } {
  if (mode === 'RESURRECT') {
    return {
      nextRng: rngState,
      champion: {
        ...def,
        health: def.maxHealth,
        stamina: def.maxStamina,
        mana: def.maxMana,
        mode: 'RESURRECTED',
        leftHand: def.startingItems[0] ?? null,
        rightHand: def.startingItems[1] ?? null
      }
    };
  }

  // REINCARNATE: Strip pre-existing skill ranks to 0 and grant slight randomized base stat boosts
  const r1 = nextRandom(rngState);
  const r2 = nextRandom(r1.nextState);
  const bonus = 2 + Math.floor(r1.value * 3);
  const hpBonus = 3 + Math.floor(r2.value * 5);

  return {
    nextRng: r2.nextState,
    champion: {
      ...def,
      maxHealth: def.maxHealth + hpBonus,
      health: def.maxHealth + hpBonus,
      stamina: def.maxStamina,
      mana: def.maxMana,
      attributes: {
        ...def.attributes,
        strength: def.attributes.strength + bonus,
        dexterity: def.attributes.dexterity + bonus,
        wisdom: def.attributes.wisdom + bonus,
        vitality: def.attributes.vitality + bonus
      },
      skills: new Array<number>(16).fill(0),
      mode: 'REINCARNATED',
      leftHand: def.startingItems[0] ?? null,
      rightHand: def.startingItems[1] ?? null
    }
  };
}

function stepSingleTick(state: GameState, events: EngineEvent[]): GameState {
  const nextTick = state.tick + 1;
  const nextCooldown = Math.max(0, state.party.moveCooldownTicks - 1);

  // 1. Flush due delayed actuators
  const dueOps = state.pendingActuators.filter((op) => op.dueTick <= nextTick);
  const remainingOps = state.pendingActuators.filter((op) => op.dueTick > nextTick);
  let nextLevels = state.levels;
  for (const op of dueOps) {
    nextLevels = applyActuatorSignal(
      nextLevels,
      op.targetLevel,
      op.targetX,
      op.targetY,
      op.action,
      events
    );
  }

  // 2. Step animating doors
  nextLevels = stepDoorsOnLevels(nextLevels, events);

  return {
    ...state,
    tick: nextTick,
    levels: nextLevels,
    pendingActuators: remainingOps,
    party: {
      ...state.party,
      moveCooldownTicks: nextCooldown
    }
  };
}

/**
 * Pure simulation reducer processing a single GameCommand and returning { state, events }.
 */
export function dispatchCommand(state: GameState, command: GameCommand): SimulationStepResult {
  const events: EngineEvent[] = [];

  switch (command.type) {
    case 'TURN': {
      if (state.activeMirror) {
        return { state, events };
      }
      const delta = command.direction === 'LEFT' ? 3 : 1;
      const nextFacing = ((state.party.facing + delta) % 4) as Direction;
      events.push({ type: 'TURNED', facing: nextFacing });
      return {
        state: {
          ...state,
          party: { ...state.party, facing: nextFacing }
        },
        events
      };
    }

    case 'MOVE': {
      const nextState = handleMove(state, command.direction, events);
      return { state: nextState, events };
    }

    case 'INTERACT_AHEAD': {
      const nextState = handleInteractAhead(state, events);
      return { state: nextState, events };
    }

    case 'CANCEL_MIRROR': {
      if (!state.activeMirror) {
        return { state, events };
      }
      events.push({ type: 'MIRROR_CANCELLED' });
      return {
        state: { ...state, activeMirror: null },
        events
      };
    }

    case 'RECRUIT_CHAMPION': {
      if (!state.activeMirror || state.party.champions.length >= MAX_PARTY_CHAMPIONS) {
        return { state, events };
      }
      const { wallX, wallY, face, champion } = state.activeMirror;
      const { champion: recruited, nextRng } = buildRecruitedChampion(
        champion,
        command.mode,
        state.rngState
      );

      // Remove mirror from wall after champion steps out (1988 Amiga rule)
      let nextLevels = updateTileInLevels(state.levels, state.party.level, wallX, wallY, (t) => ({
        ...t,
        wallFeatures: t.wallFeatures.filter(
          (f) => !(f.face === face && f.kind === 'CHAMPION_MIRROR' && f.championId === champion.id)
        )
      }));

      // Also follows classic DM1 Hall of Champions entrance rule: once >= 1 champion is recruited,
      // ensure the Hall entrance wooden door at (1, 14) or stairs access can be opened!
      // (In DM1, recruiting your first champion triggers the mirror's target actuator!)
      const wallTile = getTile(state.levels, state.party.level, wallX, wallY);
      const mirrorActuators =
        wallTile?.actuators.filter((a) => a.face === face && a.rawType === 127 && !a.isLocal) ?? [];
      for (const ma of mirrorActuators) {
        nextLevels = applyActuatorSignal(
          nextLevels,
          ma.targetLevel,
          ma.targetX,
          ma.targetY,
          ma.action,
          events
        );
      }

      events.push({
        type: 'CHAMPION_RECRUITED',
        championId: recruited.id,
        name: recruited.name,
        mode: command.mode
      });
      events.push({
        type: 'SOUND_CUE',
        cue: 'CHAMPION_REVIVE',
        sourceLevel: state.party.level,
        sourceX: wallX,
        sourceY: wallY
      });

      const verb = command.mode === 'RESURRECT' ? 'RESURRECTED' : 'REINCARNATED';
      const msgs = appendMessage(
        state.messages,
        `${recruited.name} ${recruited.title ? `(${recruited.title}) ` : ''}${verb}!`,
        events
      );

      return {
        state: {
          ...state,
          rngState: nextRng,
          levels: nextLevels,
          activeMirror: null,
          messages: msgs,
          party: {
            ...state.party,
            champions: [...state.party.champions, recruited]
          }
        },
        events
      };
    }

    case 'TICK': {
      const count = Math.max(1, command.count ?? 1);
      let cur = state;
      for (let i = 0; i < count; i++) {
        cur = stepSingleTick(cur, events);
      }
      return { state: cur, events };
    }

    case 'TOGGLE_QOL_MODE': {
      const nextQol = !state.settings.qolMode;
      return {
        state: {
          ...state,
          settings: {
            ...state.settings,
            qolMode: nextQol,
            // Purist mode hides automap automatically
            automapOpen: nextQol ? state.settings.automapOpen : false
          }
        },
        events
      };
    }

    case 'TOGGLE_AUTOMAP': {
      if (!state.settings.qolMode) {
        return { state, events };
      }
      return {
        state: {
          ...state,
          settings: {
            ...state.settings,
            automapOpen: !state.settings.automapOpen
          }
        },
        events
      };
    }

    case 'SET_AUDIO_MUTED': {
      return {
        state: {
          ...state,
          settings: {
            ...state.settings,
            audioMuted: command.muted
          }
        },
        events
      };
    }
  }
}
