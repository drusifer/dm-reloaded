/**
 * Evidence-gated map from DM1 monster type ids to original graphics.dat sprite indices.
 *
 * TLDR:
 *   Groups were identified on index-labelled review sheets (atlas 446..532, monster-type order, up to four views:
 *   front, side, back, attack) and cross-checked against where each type appears in the real Dungeon.dat.
 *   `confidence` gates rendering: only 'high' and 'medium' groups are drawn; 'low' keeps the placeholder.
 */

export type MonsterSpriteConfidence = 'high' | 'medium' | 'low';

export interface MonsterSpriteGroup {
  readonly typeId: number;
  /** Atlas indices in view order: front, side, back, attack (fewer when the original has fewer). */
  readonly indices: readonly number[];
  readonly confidence: MonsterSpriteConfidence;
}

const G = (typeId: number, first: number, last: number, confidence: MonsterSpriteConfidence): MonsterSpriteGroup => ({
  typeId,
  indices: Array.from({ length: last - first + 1 }, (_, i) => first + i),
  confidence
});

export const DM1_MONSTER_SPRITES: readonly MonsterSpriteGroup[] = [
  G(0, 446, 449, 'high'),   // Giant Scorpion
  G(1, 450, 451, 'medium'), // Swamp Slime
  G(2, 452, 455, 'medium'), // Giggler
  G(3, 456, 457, 'high'),   // Wizard Eye
  G(4, 458, 461, 'high'),   // Pain Rat
  G(5, 462, 464, 'medium'), // Ruster
  G(6, 465, 466, 'high'),   // Screamer
  G(7, 467, 468, 'high'),   // Rock Pile
  G(8, 469, 470, 'high'),   // Ghost
  G(9, 471, 474, 'high'),   // Stone Golem
  G(10, 475, 478, 'high'),  // Mummy
  G(11, 479, 480, 'high'),  // Black Flame
  G(12, 481, 484, 'high'),  // Skeleton
  G(13, 485, 488, 'high'),  // Couatl
  G(14, 489, 492, 'high'),  // Vexirk
  G(15, 493, 496, 'high'),  // Magenta Worm
  G(16, 497, 500, 'high'),  // Trolin
  G(17, 501, 504, 'high'),  // Giant Wasp
  G(18, 505, 508, 'high'),  // Animated Armour
  G(19, 509, 512, 'low'),   // Materializer: faint ghostly sprites, not clearly identified
  G(20, 513, 514, 'low'),   // Water Elemental: not clearly identified
  G(21, 515, 518, 'high'),  // Oitu
  G(22, 519, 522, 'high'),  // Demon
  G(23, 523, 526, 'high'),  // Lord Chaos
  G(24, 527, 530, 'high'),  // Red Dragon
  G(25, 531, 531, 'high'),  // Lord Order
  G(26, 532, 532, 'high')   // Grey Lord
];

export function monsterSpriteGroup(typeId: number): MonsterSpriteGroup | undefined {
  return Number.isInteger(typeId) ? DM1_MONSTER_SPRITES[typeId] : undefined;
}

/** The front-view atlas index to draw, or undefined when the type is unmapped or not confident enough. */
export function monsterFrontSprite(typeId: number): number | undefined {
  const group = monsterSpriteGroup(typeId);
  return group && group.confidence !== 'low' ? group.indices[0] : undefined;
}

/** Transparent key of a sprite: its dominant colour on the outer border ring (each creature has its own key). */
export function spriteBorderKey(width: number, height: number, pixels: Uint8Array): { key: number; share: number } {
  const counts = new Map<number, number>();
  let total = 0;
  const add = (x: number, y: number): void => {
    const v = pixels[y * width + x]!;
    counts.set(v, (counts.get(v) ?? 0) + 1);
    total++;
  };
  for (let x = 0; x < width; x++) {
    add(x, 0);
    if (height > 1) add(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    add(0, y);
    if (width > 1) add(width - 1, y);
  }
  let key = 0;
  let best = -1;
  for (const [value, count] of counts) if (count > best) { best = count; key = value; }
  return { key, share: total === 0 ? 0 : best / total };
}
