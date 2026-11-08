/**
 * Core domain types for the headless Amiga Dungeon Master simulation engine.
 *
 * TLDR:
 *   Defines pure, serializable TypeScript interfaces for DungeonData, Tiles, Actuators,
 *   ItemDef/ItemInstance, ChampionInventory, Projectiles, Champions, PartyState, GameState,
 *   GameCommand, EngineEvent, and CampaignBundle. Zero DOM, Canvas, or WebAudio dependencies.
 */

export type Direction = 0 | 1 | 2 | 3; // 0=North, 1=East, 2=South, 3=West

/**
 * 2-bit tile quadrant for floor item stacks: 0=NW, 1=NE, 2=SE, 3=SW.
 */
export type SubTileQuadrant = 0 | 1 | 2 | 3;

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

export type WallFeatureKind =
  | 'INSCRIPTION'
  | 'CHAMPION_MIRROR'
  | 'BUTTON'
  | 'SCONCE'
  | 'ALCOVE'
  | 'VI_ALTAR'
  | 'FOUNTAIN'
  | 'KEYHOLE';

export interface WallFeature {
  readonly face: Direction;
  readonly kind: WallFeatureKind;
  readonly text?: string;
  readonly championId?: string;
  readonly portraitIndex?: number;
  readonly hasTorch?: boolean;
  readonly actuatorId?: number;
  readonly graphicIndex?: number;
  readonly ornamentId?: number;
  readonly requiredItemIcon?: number;
  readonly consumesKey?: boolean;
  readonly unlocked?: boolean;
}

export type ItemCategory = 'WEAPON' | 'CLOTHES' | 'SCROLL' | 'POTION' | 'CHEST' | 'MISC';

export type EquipSlotId =
  | 'head'
  | 'neck'
  | 'torso'
  | 'legs'
  | 'feet'
  | 'leftHand'
  | 'rightHand'
  | 'pouch1'
  | 'pouch2'
  | 'quiver1'
  | 'quiver2'
  | 'quiver3'
  | 'quiver4';

export const ALL_EQUIP_SLOTS: readonly EquipSlotId[] = [
  'head',
  'neck',
  'torso',
  'legs',
  'feet',
  'leftHand',
  'rightHand',
  'pouch1',
  'pouch2',
  'quiver1',
  'quiver2',
  'quiver3',
  'quiver4'
];

export const BACKPACK_SLOT_COUNT = 17;
export const CHEST_SLOT_COUNT = 8;

export interface ItemDef {
  readonly defId: number; // 0..179 ObjectDescriptor index
  readonly category: ItemCategory;
  readonly subtype: number;
  readonly iconIndex: number; // 0..198 icon & name index
  readonly name: string;
  readonly equipMask: number; // FTL 16-bit compatibility bitmask
  readonly floorSpriteIndex: number;
  readonly weightTenthsKg: number; // 10 = 1.0 kg
  readonly armorStrength: number;
  readonly nutritionValue: number;
  readonly waterValue: number;
  readonly passThroughGrate: boolean;
  readonly lightBonus: number;
}

export type ItemInstanceId = string;

export interface ItemInstance {
  readonly instanceId: ItemInstanceId;
  readonly defId: number;
  readonly iconIndex: number;
  readonly name: string;
  readonly charges: number;
  readonly poisoned?: boolean;
  readonly cursed?: boolean;
  readonly broken?: boolean;
  readonly scrollText?: readonly string[];
  readonly contents?: readonly ItemInstanceId[];
  readonly bonesChampionId?: string;
  readonly potion?: { readonly recipeId: string; readonly power: 0 | 1 | 2 | 3 | 4 | 5 };
}

export type RuneId =
  | 'LO' | 'UM' | 'ON' | 'POWER_EE' | 'PAL' | 'MON'
  | 'YA' | 'VI' | 'OH' | 'FUL' | 'DES' | 'ZO'
  | 'VEN' | 'EW' | 'KATH' | 'IR' | 'BRO' | 'GOR'
  | 'KU' | 'ROS' | 'DAIN' | 'NETA' | 'RA' | 'SAR';

export type TimedEffectKind = 'LIGHT' | 'SHIELD' | 'STRENGTH';
export interface TimedEffect {
  readonly kind: TimedEffectKind;
  readonly magnitude: number;
  readonly expiresAtTick: number;
  readonly sourceChampionId: string;
}

export interface StartingGearSpec {
  readonly category: ItemCategory;
  readonly subtype: number;
  readonly charges?: number;
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
  readonly floorItems?: Readonly<Record<SubTileQuadrant, readonly ItemInstanceId[]>>;
  readonly wallItems?: Readonly<Record<Direction, readonly ItemInstanceId[]>>;
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
  readonly startingGearDefs?: readonly StartingGearSpec[];
}

export interface ChampionInventory {
  readonly slots: Readonly<Record<EquipSlotId, ItemInstanceId | null>>;
  readonly backpack: readonly (ItemInstanceId | null)[]; // 17 slots
}

export interface ChampionProgression {
  readonly experience: readonly number[]; // Exactly 16 subskill XP tracks.
}

export interface ChampionState extends ChampionDefinition {
  readonly alive: boolean;
  readonly health: number;
  readonly stamina: number;
  readonly mana: number;
  readonly food: number;  // -1024 .. 2048 (healthy default 1500)
  readonly water: number; // -1024 .. 2048 (healthy default 1500)
  readonly mode: 'RESURRECTED' | 'REINCARNATED';
  readonly progression: ChampionProgression;
  readonly actionCooldowns: Readonly<Record<string, number>>;
  readonly poisonSeverity: number;
  readonly effects: readonly TimedEffect[];
  readonly leftHand: string | null;
  readonly rightHand: string | null;
  readonly inventory: ChampionInventory;
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

export type ProjectilePayload =
  | { readonly kind: 'ITEM'; readonly itemId: ItemInstanceId }
  | { readonly kind: 'AMMUNITION'; readonly itemId: ItemInstanceId; readonly actionId: string }
  | { readonly kind: 'SPELL'; readonly spellId: string; readonly effectId: string; readonly explosive: boolean };

export interface ProjectileState {
  readonly id: string;
  /** Compatibility projection for existing item rendering; null for spells. */
  readonly itemId: ItemInstanceId | null;
  readonly ownerChampionId: string;
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly direction: Direction;
  readonly lane: 'LEFT' | 'RIGHT';
  readonly power: number;
  readonly kineticEnergy: number;
  readonly stepEnergyCost: number;
  readonly payload: ProjectilePayload;
}

export interface CombatTargetState {
  readonly id: string;
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly lane: 'LEFT' | 'RIGHT';
  readonly traits: readonly string[];
  readonly maxHealth: number;
  readonly health: number;
  readonly defeated: boolean;
}

export interface ImpactMarkerState {
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly lane: 'LEFT' | 'RIGHT';
  readonly expiresAtTick: number;
}

export interface PartyState {
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly facing: Direction;
  readonly stepParity: 0 | 1;
  readonly moveCooldownTicks: number;
  readonly torchLight: number; // 0..5 bonus light from party torches/spells/illumulet
  readonly sleeping: boolean;
  readonly leaderIndex: number;
  readonly champions: readonly ChampionState[];
  readonly visitedTiles: Readonly<Record<string, true>>;
}

export interface SettingsState {
  readonly qolMode: boolean; // false = 1988 Purist Mode default; true = QWEASD + 1-4 + Z + Automap
  readonly automapOpen: boolean;
  readonly audioMuted: boolean;
}

export type InteractionState =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'ACTION_MENU'; readonly championIndex: number; readonly hand: Extract<EquipSlotId, 'leftHand' | 'rightHand'> }
  | { readonly kind: 'RUNE_PANEL'; readonly championIndex: number }
  | { readonly kind: 'PROGRESSION_VIEW'; readonly championIndex: number };

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
  readonly initialItems?: Readonly<Record<ItemInstanceId, ItemInstance>>;
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
  readonly items: Readonly<Record<ItemInstanceId, ItemInstance>>;
  readonly handItem: ItemInstanceId | null;
  readonly openInventoryChampionIndex: number | null;
  readonly openContainerId: ItemInstanceId | null;
  readonly projectiles: readonly ProjectileState[];
  readonly combatTargets: readonly CombatTargetState[];
  readonly impactMarkers: readonly ImpactMarkerState[];
  readonly runeFormulas: Readonly<Record<string, readonly RuneId[]>>;
  readonly selectedBrewFlasks: Readonly<Record<string, ItemInstanceId | null>>;
  readonly gameOver: boolean;
  readonly party: PartyState;
  readonly activeMirror: MirrorModalState | null;
  readonly pendingActuators: readonly PendingActuatorOp[];
  readonly messages: readonly string[];
  readonly settings: SettingsState;
  readonly interaction: InteractionState;
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
  | { readonly type: 'SET_AUDIO_MUTED'; readonly muted: boolean }
  | { readonly type: 'TOGGLE_INVENTORY'; readonly championIndex: number | null }
  | { readonly type: 'SELECT_LEADER'; readonly championIndex: number }
  | { readonly type: 'CLICK_EQUIP_SLOT'; readonly championIndex: number; readonly slot: EquipSlotId }
  | { readonly type: 'CLICK_BACKPACK_SLOT'; readonly championIndex: number; readonly slotIndex: number }
  | { readonly type: 'CLICK_CONTAINER_SLOT'; readonly slotIndex: number }
  | { readonly type: 'INSPECT_HAND_ITEM'; readonly championIndex: number }
  | { readonly type: 'CONSUME_HAND_ITEM'; readonly championIndex: number }
  | { readonly type: 'PICKUP_OR_DROP_FLOOR'; readonly quadrant: SubTileQuadrant }
  | { readonly type: 'THROW_HAND_ITEM'; readonly side: 'LEFT' | 'RIGHT' }
  | {
      readonly type: 'EXECUTE_COMBAT_ACTION';
      readonly championIndex: number;
      readonly hand: Extract<EquipSlotId, 'leftHand' | 'rightHand'>;
      readonly actionId: 'SWING' | 'SHOOT';
    }
  | { readonly type: 'ADD_RUNE'; readonly championIndex: number; readonly rune: RuneId }
  | { readonly type: 'REMOVE_RUNE'; readonly championIndex: number }
  | { readonly type: 'CLEAR_RUNES'; readonly championIndex: number }
  | { readonly type: 'SELECT_BREW_FLASK'; readonly championIndex: number; readonly flaskId: ItemInstanceId | null }
  | { readonly type: 'INVOKE_RUNES'; readonly championIndex: number }
  | { readonly type: 'CONSUME_POTION'; readonly championIndex: number; readonly itemId: ItemInstanceId }
  | { readonly type: 'OPEN_ACTION_MENU'; readonly championIndex: number; readonly hand: Extract<EquipSlotId, 'leftHand' | 'rightHand'> }
  | { readonly type: 'OPEN_RUNE_PANEL'; readonly championIndex: number }
  | { readonly type: 'OPEN_PROGRESSION_VIEW'; readonly championIndex: number }
  | { readonly type: 'CLOSE_INTERACTION' }
  | { readonly type: 'SET_SLEEPING'; readonly sleeping: boolean };

export type MagicFailureReason =
  | 'INVALID_ACTOR' | 'INVALID_FORMULA' | 'INSUFFICIENT_MANA' | 'INSUFFICIENT_SKILL'
  | 'INVALID_FLASK' | 'INVALID_POTION';

export type CombatFailureReason =
  | 'INVALID_ACTOR'
  | 'INVALID_ITEM'
  | 'COOLDOWN'
  | 'INSUFFICIENT_STAMINA'
  | 'OUT_OF_REACH'
  | 'MISSING_AMMUNITION'
  | 'INVALID_TARGET';

export type SoundCueId =
  | 'FOOTSTEP'
  | 'WALL_BUMP'
  | 'SWITCH_CLICK'
  | 'DOOR_CLANK'
  | 'PIT_FALL'
  | 'TELEPORT_BUZZ'
  | 'CHAMPION_REVIVE'
  | 'ITEM_PICKUP'
  | 'THROW_SWOOSH'
  | 'GULP'
  | 'LOCK_CLICK'
  | 'CHAMPION_DEATH';

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
  | { readonly type: 'ITEM_PICKED_UP'; readonly itemId: ItemInstanceId; readonly name: string }
  | { readonly type: 'ITEM_DROPPED'; readonly itemId: ItemInstanceId; readonly name: string }
  | { readonly type: 'ITEM_EQUIPPED'; readonly championId: string; readonly slot: EquipSlotId; readonly itemId: ItemInstanceId | null }
  | { readonly type: 'ITEM_THROWN'; readonly itemId: ItemInstanceId; readonly side: 'LEFT' | 'RIGHT' }
  | { readonly type: 'ITEM_CONSUMED'; readonly championId: string; readonly itemName: string }
  | { readonly type: 'FOUNTAIN_USED'; readonly refilledItem: string | null }
  | { readonly type: 'LOCK_UNLOCKED'; readonly x: number; readonly y: number; readonly itemName: string }
  | { readonly type: 'CHAMPION_DIED'; readonly championId: string; readonly name: string }
  | { readonly type: 'CHAMPION_REVIVED_AT_ALTAR'; readonly championId: string; readonly name: string }
  | { readonly type: 'ACTION_REJECTED'; readonly reason: CombatFailureReason; readonly text: string }
  | { readonly type: 'ACTION_EXECUTED'; readonly championId: string; readonly actionId: string; readonly hit: boolean }
  | { readonly type: 'COOLDOWN_STARTED'; readonly championId: string; readonly actionId: string; readonly readyAtTick: number }
  | { readonly type: 'DAMAGE_APPLIED'; readonly targetId: string; readonly ownerChampionId: string; readonly amount: number }
  | { readonly type: 'PROJECTILE_LAUNCHED'; readonly projectileId: string; readonly ownerChampionId: string }
  | { readonly type: 'PROJECTILE_IMPACT'; readonly projectileId: string; readonly level: number; readonly x: number; readonly y: number }
  | { readonly type: 'EXPLOSION_RESOLVED'; readonly projectileId: string; readonly targetIds: readonly string[] }
  | { readonly type: 'SPELL_REJECTED'; readonly reason: MagicFailureReason; readonly text: string }
  | { readonly type: 'SPELL_SUCCEEDED'; readonly spellId: string; readonly championId: string }
  | { readonly type: 'SPELL_FIZZLED'; readonly championId: string }
  | { readonly type: 'SPELL_BACKFIRED'; readonly championId: string; readonly damage: number }
  | { readonly type: 'POTION_BREWED'; readonly championId: string; readonly recipeId: string; readonly itemId: ItemInstanceId }
  | { readonly type: 'POTION_CONSUMED'; readonly championId: string; readonly recipeId: string; readonly itemId: ItemInstanceId }
  | { readonly type: 'STATUS_EFFECT_CHANGED'; readonly championId: string; readonly effect: TimedEffectKind; readonly active: boolean }
  | {
      readonly type: 'SKILL_XP_AWARDED';
      readonly championId: string;
      readonly subskill: number;
      readonly amount: number;
      readonly total: number;
    }
  | {
      readonly type: 'SKILL_RANK_GAINED';
      readonly championId: string;
      readonly subskill: number;
      readonly previousRank: number;
      readonly rank: number;
      readonly rankName: string;
    }
  | { readonly type: 'SLEEP_STATE_CHANGED'; readonly sleeping: boolean }
  | { readonly type: 'SOUND_CUE'; readonly cue: SoundCueId; readonly sourceLevel: number; readonly sourceX: number; readonly sourceY: number }
  | { readonly type: 'MESSAGE_LOGGED'; readonly text: string };

export interface SimulationStepResult {
  readonly state: GameState;
  readonly events: readonly EngineEvent[];
}
