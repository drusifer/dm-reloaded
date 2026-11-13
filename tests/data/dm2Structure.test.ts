import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MONSTER_TYPE_COUNT, parseDungeonDat, parseGraphicsDat } from '../../src/data';

const DUNGEON = resolve(process.cwd(), 'public/assets/extracted/dm2/DUNGEON.DAT');
const GRAPHICS = resolve(process.cwd(), 'public/assets/extracted/dm2/GRAPHICS.DAT');

/** Pins the facts recorded in docs/DM2_DATA.md. These are observations, not rule claims. */
describe.skipIf(!existsSync(DUNGEON))('S7-2 DM2 DUNGEON.DAT structural facts', () => {
  const buf = new Uint8Array(readFileSync(DUNGEON));
  const u16 = (o: number) => (buf[o]! << 8) | buf[o + 1]!;
  const counts = Array.from({ length: 16 }, (_, i) => u16(12 + 2 * i));
  const sizes = [4, 6, 4, 8, 16, 4, 4, 4, 4, 8, 4, 0, 0, 0, 0, 0];

  it('has the DM1-style container header with the documented values', () => {
    expect(buf.length).toBe(39411);
    expect(u16(0)).toBe(0);
    expect(u16(2)).toBe(12603);
    expect(buf[4]).toBe(44);
    expect(u16(6)).toBe(28);
    expect(u16(8)).toBe(257);
    expect(u16(10)).toBe(2353);
    expect(counts.slice(0, 11)).toEqual([53, 217, 576, 1020, 299, 173, 202, 9, 83, 24, 256]);
  });

  it('closes the file-size arithmetic exactly (DB records end, then map data)', () => {
    const d = parseDungeonDat(buf).dungeon;
    const columns = d.levels.reduce((sum, level) => sum + level.width, 0);
    const dbStart = 44 + 44 * 16 + columns * 2 + u16(10) * 2 + u16(6) * 2;
    const dbEnd = dbStart + counts.reduce((sum, c, i) => sum + c * sizes[i]!, 0);
    expect(dbEnd).toBe(26806);
    expect(dbEnd + u16(2)).toBe(39409);
    expect(buf.length - (dbEnd + u16(2))).toBe(2);
  });

  it('parses to 44 levels with no champion mirrors and a start position', () => {
    const d = parseDungeonDat(buf).dungeon;
    expect(d.levels).toHaveLength(44);
    expect(Object.keys(d.champions)).toHaveLength(0);
    expect([d.startLevel, d.startX, d.startY]).toEqual([0, 1, 8]);
    expect(d.levels.every((l) => l.tiles.length === l.height && l.tiles.every((row) => row.length === l.width))).toBe(true);
  });

  it('uses creature ids beyond the DM1 catalog, which are ignored rather than mis-typed', () => {
    const columns = parseDungeonDat(buf).dungeon.levels.reduce((sum, level) => sum + level.width, 0);
    const dbStart = 44 + 44 * 16 + columns * 2 + u16(10) * 2 + u16(6) * 2;
    const creatureStart = dbStart + counts.slice(0, 4).reduce((sum, c, i) => sum + c * sizes[i]!, 0);
    let beyond = 0;
    for (let i = 0; i < counts[4]!; i++) if (buf[creatureStart + i * 16 + 4]! >= MONSTER_TYPE_COUNT) beyond++;
    expect(beyond).toBeGreaterThan(50);
    const groups = parseDungeonDat(buf).dungeon.monsterGroups ?? [];
    expect(groups.every((g) => g.typeId < MONSTER_TYPE_COUNT)).toBe(true);
  });

  it.skipIf(!existsSync(GRAPHICS))('the DM1 graphics parser decodes no sprites from the AGA GRAPHICS.DAT', () => {
    const graphics = parseGraphicsDat(new Uint8Array(readFileSync(GRAPHICS)));
    expect(graphics.sprites.size).toBe(0);
  });
});
