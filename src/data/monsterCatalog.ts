/**
 * Monster catalog for the 27 Dungeon Master type slots.
 *
 * TLDR:
 *   Ids and names follow the DM1 creature order read from Dungeon.dat; numeric stats are a
 *   clean-room approximation (CLEAN_ROOM_STATS) so gameplay is data-driven but never claims
 *   original-data identity. Unknown ids return undefined.
 */

export type MonsterTrait = 'NON_MATERIAL' | 'FLYING' | 'RANGED' | 'THIEF' | 'TOUGH_TO_HIT' | 'SLOW' | 'FAST';

export interface MonsterTypeDef {
  readonly typeId: number;
  readonly name: string;
  readonly health: number;
  readonly attack: number;
  readonly defense: number;
  readonly moveTicks: number;
  readonly attackTicks: number;
  readonly sight: number;
  readonly maxGroup: 1 | 2 | 3 | 4;
  readonly traits: readonly MonsterTrait[];
  /** Silhouette fill colour used by the placeholder painter (never original art). */
  readonly color: string;
  readonly dropItem?: string;
}

export const CLEAN_ROOM_STATS = true;
export const MONSTER_TYPE_COUNT = 27;

type Row = readonly [
  name: string, health: number, attack: number, defense: number,
  moveTicks: number, attackTicks: number, sight: number, maxGroup: 1 | 2 | 3 | 4,
  traits: readonly MonsterTrait[], color: string, dropItem?: string
];

const ROWS: readonly Row[] = [
  ['GIANT SCORPION', 45, 12, 20, 6, 8, 4, 2, [], '#a0522d'],
  ['SWAMP SLIME', 35, 8, 10, 10, 10, 3, 4, ['SLOW'], '#3cb371'],
  ['GIGGLER', 20, 3, 25, 4, 6, 5, 2, ['THIEF', 'FAST'], '#daa520'],
  ['WIZARD EYE', 30, 10, 30, 5, 9, 6, 1, ['FLYING', 'RANGED', 'NON_MATERIAL'], '#8a2be2'],
  ['PAIN RAT', 30, 9, 15, 4, 6, 4, 4, ['FAST'], '#808080'],
  ['RUSTER', 40, 6, 25, 7, 9, 3, 3, [], '#b7410e'],
  ['SCREAMER', 55, 10, 20, 8, 9, 3, 3, [], '#6b8e23', 'SCREAMER SLICE'],
  ['ROCK PILE', 90, 16, 40, 12, 12, 2, 2, ['SLOW', 'TOUGH_TO_HIT'], '#696969'],
  ['GHOST', 60, 14, 50, 6, 8, 6, 1, ['FLYING', 'NON_MATERIAL', 'TOUGH_TO_HIT'], '#e6e6fa'],
  ['STONE GOLEM', 120, 24, 55, 12, 14, 3, 1, ['SLOW', 'TOUGH_TO_HIT'], '#778899'],
  ['MUMMY', 80, 18, 35, 9, 11, 4, 2, [], '#d2b48c'],
  ['BLACK FLAME', 40, 16, 60, 5, 8, 5, 1, ['FLYING', 'NON_MATERIAL', 'TOUGH_TO_HIT'], '#ff4500'],
  ['SKELETON', 60, 16, 30, 7, 9, 5, 3, [], '#f5f5dc'],
  ['COUATL', 85, 20, 40, 6, 9, 6, 1, ['FLYING', 'RANGED'], '#20b2aa'],
  ['VEXIRK', 90, 22, 45, 7, 10, 6, 2, ['RANGED'], '#4169e1'],
  ['MAGENTA WORM', 70, 14, 15, 8, 10, 3, 3, [], '#c71585', 'WORM ROUND'],
  ['TROLIN', 75, 17, 30, 6, 8, 5, 3, [], '#cd853f'],
  ['GIANT WASP', 30, 12, 35, 3, 6, 6, 4, ['FLYING', 'FAST'], '#ffd700'],
  ['ANIMATED ARMOUR', 150, 26, 60, 9, 11, 4, 2, ['TOUGH_TO_HIT'], '#c0c0c0'],
  ['MATERIALIZER', 110, 22, 50, 8, 10, 6, 1, ['RANGED', 'NON_MATERIAL', 'TOUGH_TO_HIT'], '#9370db'],
  ['WATER ELEMENTAL', 130, 26, 55, 8, 11, 5, 2, [], '#1e90ff'],
  ['OITU', 160, 30, 60, 6, 9, 7, 2, ['FAST'], '#556b2f'],
  ['DEMON', 180, 36, 60, 7, 10, 7, 1, [], '#dc143c'],
  ['LORD CHAOS', 400, 45, 80, 6, 9, 8, 1, ['RANGED', 'TOUGH_TO_HIT'], '#4b0082'],
  ['RED DRAGON', 450, 55, 70, 8, 12, 8, 1, ['RANGED', 'TOUGH_TO_HIT'], '#b22222', 'DRAGON STEAK'],
  ['LORD ORDER', 400, 45, 80, 6, 9, 8, 1, ['RANGED', 'TOUGH_TO_HIT'], '#f0e68c'],
  ['GREY LORD', 500, 50, 85, 6, 9, 8, 1, ['RANGED', 'TOUGH_TO_HIT'], '#a9a9a9']
];

export const MONSTER_CATALOG: readonly MonsterTypeDef[] = ROWS.map((row, typeId) => ({
  typeId,
  name: row[0],
  health: row[1],
  attack: row[2],
  defense: row[3],
  moveTicks: row[4],
  attackTicks: row[5],
  sight: row[6],
  maxGroup: row[7],
  traits: row[8],
  color: row[9],
  ...(row[10] ? { dropItem: row[10] } : {})
}));

export function monsterTypeDef(typeId: number): MonsterTypeDef | undefined {
  return Number.isInteger(typeId) ? MONSTER_CATALOG[typeId] : undefined;
}

export function monsterHasTrait(typeId: number, trait: MonsterTrait): boolean {
  return monsterTypeDef(typeId)?.traits.includes(trait) ?? false;
}
