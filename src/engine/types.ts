/**
 * Core domain types for the headless Amiga Dungeon Master simulation engine.
 *
 * TLDR:
 *   Defines pure, serializable TypeScript interfaces for DungeonData, Tiles, Actuators,
 *   Champions, PartyState, GameState, GameCommand, EngineEvent, and CampaignBundle.
 *   Zero DOM, Canvas, or WebAudio dependencies so all simulation logic runs headlessly.
 */

export type Direction = 0 | 1 | 2 | 3; // 0=North, 1=East, 2=South, 3=West

export const DIRECTION_NAMES: readonly ['NORTH', 'EAST', 'SOUTH', 'WEST'] = [
  'NORTH',
  'EAST',
  'SOUTH',
  'WEST'
];

export const DIRECTION_DELTAS: Readonly<Record<Direction, { readonly dx: number; readonly dy: number }>> = {
  0: { dx: 0, dy: -1 }, // North
  1: { dx: 1, dy: 0 },  // East
  2: { dx: 0, dy: 1 },  // South
  3: { dx: -1, dy: 0 }  // West
};

export type MoveDirection = 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT';
export type TurnDirection = 'LEFT' | 'RIGHT';

export type TileType = 'WALL' | 'FLOOR' | 'PIT' | 'STAIRS' | 'DOOR' | 'TELEPORTER' | 'TRICK_WALL';

export type DoorMaterial = 'IRON_GRATE' | 'WOODEN' | 'METAL' | 'RA_MAGIC';

/**
 * Door openness ranges from 0 (fully open) through 1..3 (animating) to 4 (fully closed), or 5 (bashed open).
 */
export type DoorProgress = 0 | 1 | 2 | 3 | 4 | 5;

export interface DoorState {
  readonly orientation: 'WEST_EAST' | 'NORTH_SOUTH';
  readonly material: DoorMaterial;
  readonly progress: DoorProgress;
  readonly targetProgress: 0 | 4;
  readonly hasButton: boolean;
  readonly bashable: boolean;
  readonly fireballDestructible: boolean;
  readonly opensHorizontally?: boolean;
}

export interface PitState {
  readonly open: boolean;
  readonly illusionary: boolean;
  readonly hiddenOutline: boolean;
}

export interface StairsState {
  readonly direction: 'DOWN' | 'UP';
  readonly orientation: 'WEST_EAST' | 'NORTH_SOUTH';
}

export interface TeleporterState {
  readonly active: boolean;
  readonly visibleHaze: boolean;
  readonly destLevel: number;
  readonly destX: number;
  readonly destY: number;
  readonly rotation: Direction;
  readonly absoluteRotation: boolean;
  readonly scope: 'OBJECTS' | 'MONSTERS' | 'PARTY_AND_OBJECTS' | 'ALL';
  readonly playSound: boolean;
}

export interface TrickWallState {
  readonly open: boolean;
  readonly illusionary: boolean;
}

export type ActuatorAction = 'SET' | 'CLEAR' | 'TOGGLE' | 'HOLD';

export interface Actuator {
  readonly id: number;
  readonly face: Direction;
  readonly rawType: number;
  readonly value: number;
  readonly action: ActuatorAction;
  readonly targetLevel: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly delayTicks: number;
  readonly onceOnly: boolean;
  readonly triggered: boolean;
  readonly playSound: boolean;
  readonly graphicIndex: number;
  readonly isLocal: boolean;
}

export type WallFeatureKind = 'INSCRIPTION' | 'CHAMPION_MIRROR' | 'BUTTON' | 'SCONCE' | 'ALCOVE';

export interface WallFeature {
  readonly face: Direction;
  readonly kind: WallFeatureKind;
  readonly text?: string;
  readonly championId?: string;
  readonly portraitIndex?: number;
  readonly hasTorch?: boolean;
  readonly actuatorId?: number;
  readonly graphicIndex?: number;
}

export interface Tile {
  readonly type: TileType;
  readonly rawFlags: number;
  readonly door?: DoorState;
  readonly pit?: PitState;
  readonly stairs?: StairsState;
  readonly teleporter?: TeleporterState;
  readonly trickWall?: TrickWallState;
  readonly wallFeatures: readonly WallFeature[];
  readonly actuators: readonly Actuator[];
  readonly itemNames: readonly string[];
}

export interface DungeonLevel {
  readonly id: number;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly depth: number;
  readonly ambientLight: number; // 0 (pitch black) .. 5 (bright Hall of Champions)
  readonly tiles: readonly (readonly Tile[])[]; // Indexed as tiles[y][x]
}

export interface ChampionAttributes {
  readonly luck: number;
  readonly strength: number;
  readonly dexterity: number;
  readonly wisdom: number;
  readonly vitality: number;
  readonly antiMagic: number;
  readonly antiFire: number;
}

export interface ChampionDefinition {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly gender: 'M' | 'F';
  readonly portraitIndex: number;
  readonly maxHealth: number;
  readonly maxStamina: number; // Display units (e.g. 65 for Daroou)
  readonly maxMana: number;
  readonly attributes: ChampionAttributes;
  readonly skills: readonly number[]; // 16 hidden sub-skills (0..15 ranks)
  readonly startingItems: readonly string[];
}

export interface ChampionState extends ChampionDefinition {
  readonly health: number;
  readonly stamina: number;
  readonly mana: number;
  readonly mode: 'RESURRECTED' | 'REINCARNATED';
  readonly leftHand: string | null;
  readonly rightHand: string | null;
}

export interface MirrorModalState {
  readonly wallX: number;
  readonly wallY: number;
  readonly face: Direction;
  readonly champion: ChampionDefinition;
}

export interface PendingActuatorOp {
  readonly dueTick: number;
  readonly action: ActuatorAction;
  readonly targetLevel: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly playSound: boolean;
}

export interface PartyState {
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly facing: Direction;
  readonly stepParity: 0 | 1;
  readonly moveCooldownTicks: number;
  readonly torchLight: number; // 0..5 bonus light from party torches/spells
  readonly champions: readonly ChampionState[];
  readonly visitedTiles: Readonly<Record<string, true>>;
}

export interface SettingsState {
  readonly qolMode: boolean; // false = 1988 Purist Mode default; true = QWEASD + Automap
  readonly automapOpen: boolean;
  readonly audioMuted: boolean;
}

export interface DungeonData {
  readonly campaignId: string;
  readonly title: string;
  readonly seed: number;
  readonly startLevel: number;
  readonly startX: number;
  readonly startY: number;
  readonly startFacing: Direction;
  readonly levels: readonly DungeonLevel[];
  readonly champions: Readonly<Record<string, ChampionDefinition>>;
}

export interface CampaignBundle {
  readonly dungeon: DungeonData;
  readonly source: 'AMIGA_DAT' | 'CLEAN_ROOM';
}

export interface CampaignProvider {
  loadCampaign(): Promise<CampaignBundle>;
}

export interface GameState {
  readonly campaignId: string;
  readonly tick: number;
  readonly rngState: number;
  readonly levels: readonly DungeonLevel[];
  readonly championsCatalog: Readonly<Record<string, ChampionDefinition>>;
  readonly party: PartyState;
  readonly activeMirror: MirrorModalState | null;
  readonly pendingActuators: readonly PendingActuatorOp[];
  readonly messages: readonly string[];
  readonly settings: SettingsState;
}

export type RecruitMode = 'RESURRECT' | 'REINCARNATE';

export type GameCommand =
  | { readonly type: 'MOVE'; readonly direction: MoveDirection }
  | { readonly type: 'TURN'; readonly direction: TurnDirection }
  | { readonly type: 'INTERACT_AHEAD' }
  | { readonly type: 'RECRUIT_CHAMPION'; readonly mode: RecruitMode }
  | { readonly type: 'CANCEL_MIRROR' }
  | { readonly type: 'TICK'; readonly count?: number }
  | { readonly type: 'TOGGLE_QOL_MODE' }
  | { readonly type: 'TOGGLE_AUTOMAP' }
  | { readonly type: 'SET_AUDIO_MUTED'; readonly muted: boolean };

export type SoundCueId =
  | 'FOOTSTEP'
  | 'WALL_BUMP'
  | 'SWITCH_CLICK'
  | 'DOOR_CLANK'
  | 'PIT_FALL'
  | 'TELEPORT_BUZZ'
  | 'CHAMPION_REVIVE';

export type EngineEvent =
  | { readonly type: 'STEP_TAKEN'; readonly level: number; readonly x: number; readonly y: number }
  | { readonly type: 'TURNED'; readonly facing: Direction }
  | { readonly type: 'WALL_BUMPED'; readonly targetX: number; readonly targetY: number }
  | { readonly type: 'SWITCH_TOGGLED'; readonly level: number; readonly x: number; readonly y: number }
  | {
      readonly type: 'DOOR_STATE_CHANGED';
      readonly level: number;
      readonly x: number;
      readonly y: number;
      readonly progress: DoorProgress;
    }
  | { readonly type: 'PIT_FALLEN'; readonly fromLevel: number; readonly toLevel: number; readonly x: number; readonly y: number }
  | { readonly type: 'STAIRS_TAKEN'; readonly fromLevel: number; readonly toLevel: number; readonly x: number; readonly y: number }
  | { readonly type: 'TELEPORTED'; readonly fromLevel: number; readonly toLevel: number; readonly x: number; readonly y: number }
  | { readonly type: 'MIRROR_OPENED'; readonly championId: string; readonly name: string }
  | { readonly type: 'MIRROR_CANCELLED' }
  | { readonly type: 'CHAMPION_RECRUITED'; readonly championId: string; readonly name: string; readonly mode: RecruitMode }
  | { readonly type: 'TORCH_TAKEN'; readonly wallX: number; readonly wallY: number }
  | { readonly type: 'SOUND_CUE'; readonly cue: SoundCueId; readonly sourceLevel: number; readonly sourceX: number; readonly sourceY: number }
  | { readonly type: 'MESSAGE_LOGGED'; readonly text: string };

export interface SimulationStepResult {
  readonly state: GameState;
  readonly events: readonly EngineEvent[];
}
