import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDungeonDat } from '../../src/data';

const DAT = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');

describe.skipIf(!existsSync(DAT))('S5-4 real 14-level campaign integrity', () => {
  const raw = new Uint8Array(readFileSync(DAT));
  const dungeon = parseDungeonDat(raw).dungeon;

  it('has 14 levels, a walkable start, deterministic parse', () => {
    expect(dungeon.levels).toHaveLength(14);
    expect(dungeon.levels.map((l) => l.id)).toEqual(Array.from({ length: 14 }, (_, i) => i));
    const start = dungeon.levels[dungeon.startLevel]!.tiles[dungeon.startY]![dungeon.startX]!;
    expect(start.type).not.toBe('WALL');
    expect(parseDungeonDat(raw).dungeon).toEqual(dungeon);
  });

  it('every level has stairs and level depths ascend', () => {
    for (const level of dungeon.levels) {
      const stairs = level.tiles.flat().filter((t) => t.type === 'STAIRS');
      expect(stairs.length, `level ${level.id} stairs`).toBeGreaterThan(0);
    }
    const depths = dungeon.levels.map((l) => l.depth);
    expect([...depths].sort((a, b) => a - b)).toEqual(depths);
  });

  it('DOWN stairs on each level have an UP stairs partner on the next level', () => {
    const report: string[] = [];
    let pairs = 0;
    for (let n = 0; n < dungeon.levels.length - 1; n++) {
      const here = dungeon.levels[n]!;
      const next = dungeon.levels[n + 1]!;
      for (let y = 0; y < here.height; y++) for (let x = 0; x < here.width; x++) {
        const tile = here.tiles[y]![x]!;
        if (tile.type !== 'STAIRS' || tile.stairs?.direction !== 'DOWN') continue;
        pairs++;
        const nx = x - next.offsetX + here.offsetX;
        const ny = y - next.offsetY + here.offsetY;
        const partner = next.tiles[ny]?.[nx];
        if (partner?.type !== 'STAIRS' || partner.stairs?.direction !== 'UP') {
          report.push(`L${n} (${x},${y}) -> L${n + 1} (${nx},${ny}) ${partner?.type ?? 'OUT_OF_BOUNDS'}`);
        }
      }
    }
    expect(pairs).toBeGreaterThanOrEqual(10);
    expect(report, report.join('\n')).toEqual([]);
  });

  it('monster groups and floor items sit in bounds on non-wall tiles', () => {
    for (const g of dungeon.monsterGroups ?? []) {
      const level = dungeon.levels[g.level]!;
      expect(g.x).toBeLessThan(level.width);
      expect(g.y).toBeLessThan(level.height);
      expect(level.tiles[g.y]![g.x]!.type).not.toBe('WALL');
    }
    for (const level of dungeon.levels) {
      for (const tile of level.tiles.flat()) {
        if (tile.floorItems && tile.type === 'WALL') throw new Error(`floor items inside wall on level ${level.id}`);
      }
    }
  });
});
