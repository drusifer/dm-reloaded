import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MONSTER_CATALOG, MONSTER_TYPE_COUNT, monsterHasTrait, monsterTypeDef, parseDungeonDat, createCleanRoomBundle } from '../../src/data';
import { createInitialGameState } from '../../src/engine';
import { expandMonsterGroup } from '../../src/engine/monsterSpawn';

const DAT = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');

describe('S4-1 monster catalog', () => {
  it('has 27 ordered entries with sane stats', () => {
    expect(MONSTER_CATALOG).toHaveLength(MONSTER_TYPE_COUNT);
    MONSTER_CATALOG.forEach((def, index) => {
      expect(def.typeId).toBe(index);
      expect(def.health).toBeGreaterThan(0);
      expect(def.moveTicks).toBeGreaterThan(0);
      expect(def.attackTicks).toBeGreaterThan(0);
      expect(def.sight).toBeGreaterThan(0);
      expect(def.maxGroup).toBeGreaterThanOrEqual(1);
    });
    expect(MONSTER_CATALOG[6]!.name).toBe('SCREAMER');
    expect(MONSTER_CATALOG[24]!.name).toBe('RED DRAGON');
  });

  it('fails safely for unknown ids and exposes traits', () => {
    expect(monsterTypeDef(27)).toBeUndefined();
    expect(monsterTypeDef(-1)).toBeUndefined();
    expect(monsterTypeDef(1.5)).toBeUndefined();
    expect(monsterHasTrait(8, 'NON_MATERIAL')).toBe(true);
    expect(monsterHasTrait(6, 'NON_MATERIAL')).toBe(false);
  });
});

describe('S4-2 group expansion', () => {
  it('limits to catalog group size, assigns unique subcells and lanes, drops unknown types', () => {
    const base = { id: 'g', level: 1, x: 2, y: 2, facing: 0 as const };
    const slime = expandMonsterGroup({ ...base, typeId: 1, healths: [10, 0, 99999, 20] });
    expect(slime).toHaveLength(4);
    expect(new Set(slime.map((t) => t.monster!.subcell)).size).toBe(4);
    expect(slime[1]!.health).toBe(MONSTER_CATALOG[1]!.health);
    expect(slime[2]!.health).toBe(MONSTER_CATALOG[1]!.health);
    expect(slime.map((t) => t.lane)).toEqual(['LEFT', 'RIGHT', 'LEFT', 'RIGHT']);
    const golem = expandMonsterGroup({ ...base, typeId: 9, healths: [50, 50, 50] });
    expect(golem).toHaveLength(1);
    expect(expandMonsterGroup({ ...base, typeId: 99, healths: [5] })).toEqual([]);
  });
});

describe('S4-2 real Dungeon.dat creature gate', () => {
  const available = existsSync(DAT);
  it.skipIf(!available)('parses plausible deterministic groups on walkable tiles', () => {
    const raw = new Uint8Array(readFileSync(DAT));
    const a = parseDungeonDat(raw).dungeon;
    const b = parseDungeonDat(raw).dungeon;
    const groups = a.monsterGroups ?? [];
    expect(groups.length).toBeGreaterThanOrEqual(150);
    expect(groups).toEqual(b.monsterGroups);
    for (const group of groups) {
      expect(group.typeId).toBeLessThan(27);
      const tile = a.levels[group.level]?.tiles[group.y]?.[group.x];
      expect(tile).toBeDefined();
      expect(tile!.type).not.toBe('WALL');
      expect(group.healths.length).toBeGreaterThanOrEqual(1);
      expect(group.healths.length).toBeLessThanOrEqual(4);
    }
    expect(createInitialGameState({ source: 'AMIGA_DAT', dungeon: a }).combatTargets.length).toBeGreaterThan(150);
  });
});

describe('clean-room bundle without monsters', () => {
  it('still starts with a valid empty monster state', () => {
    const state = createInitialGameState(createCleanRoomBundle());
    expect(state.monsterGenerators).toEqual([]);
  });
});
