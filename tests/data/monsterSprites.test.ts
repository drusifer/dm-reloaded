import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DM1_MONSTER_SPRITES, MONSTER_TYPE_COUNT, monsterFrontSprite, monsterSpriteGroup, parseDungeonDat, parseGraphicsDat, spriteBorderKey
} from '../../src/data';

const GFX = resolve(process.cwd(), 'public/assets/extracted/dm1/graphics.dat');
const DUNGEON = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');

describe('S9-1 monster sprite map (structure)', () => {
  it('covers every catalog type exactly once, in order, with contiguous ascending indices', () => {
    expect(DM1_MONSTER_SPRITES).toHaveLength(MONSTER_TYPE_COUNT);
    let previousLast = 445;
    DM1_MONSTER_SPRITES.forEach((group, typeId) => {
      expect(group.typeId).toBe(typeId);
      expect(group.indices.length).toBeGreaterThanOrEqual(1);
      expect(group.indices.length).toBeLessThanOrEqual(4);
      expect(group.indices[0]).toBe(previousLast + 1);
      group.indices.forEach((index, i) => expect(index).toBe(group.indices[0]! + i));
      previousLast = group.indices[group.indices.length - 1]!;
    });
    expect(previousLast).toBe(532);
  });

  it('only exposes confident groups for drawing and fails safely for unknown ids', () => {
    expect(monsterFrontSprite(6)).toBe(465);
    expect(monsterFrontSprite(24)).toBe(527);
    expect(monsterFrontSprite(19)).toBeUndefined();
    expect(monsterFrontSprite(20)).toBeUndefined();
    expect(monsterFrontSprite(27)).toBeUndefined();
    expect(monsterFrontSprite(-1)).toBeUndefined();
    expect(monsterFrontSprite(1.5)).toBeUndefined();
    expect(monsterSpriteGroup(99)).toBeUndefined();
    expect(DM1_MONSTER_SPRITES.filter((g) => g.confidence === 'low').map((g) => g.typeId)).toEqual([19, 20]);
  });
});

describe.skipIf(!existsSync(GFX))('S9-1 evidence against the real graphics.dat', () => {
  const graphics = parseGraphicsDat(new Uint8Array(readFileSync(GFX)));

  it('every mapped index is a real decoded sprite of creature size', () => {
    for (const group of DM1_MONSTER_SPRITES) {
      for (const index of group.indices) {
        const sprite = graphics.sprites.get(index);
        expect(sprite, `sprite ${index}`).toBeDefined();
        expect(sprite!.width).toBeGreaterThanOrEqual(16);
        expect(sprite!.height).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('drawn front sprites have a dominant border colour to use as the transparent key', () => {
    const shares: string[] = [];
    for (const group of DM1_MONSTER_SPRITES.filter((g) => g.confidence !== 'low')) {
      const sprite = graphics.sprites.get(group.indices[0]!)!;
      const { share } = spriteBorderKey(sprite.width, sprite.height, sprite.pixels);
      shares.push(`${group.typeId}:${share.toFixed(2)}`);
      expect(share, `type ${group.typeId}`).toBeGreaterThanOrEqual(0.55);
    }
    expect(shares.length).toBe(25);
  });

  it.skipIf(!existsSync(DUNGEON))('real dungeon depths agree with the type order (deep monsters only deep)', () => {
    const groups = parseDungeonDat(new Uint8Array(readFileSync(DUNGEON))).dungeon.monsterGroups ?? [];
    for (const typeId of [18, 19, 21, 22, 23, 24]) {
      const levels = groups.filter((g) => g.typeId === typeId).map((g) => g.level);
      expect(levels.length).toBeGreaterThan(0);
      expect(Math.min(...levels), `type ${typeId}`).toBeGreaterThanOrEqual(10);
    }
    const screamers = groups.filter((g) => g.typeId === 6).map((g) => g.level);
    expect(Math.max(...screamers)).toBeLessThanOrEqual(4);
  });
});
