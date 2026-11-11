import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDungeonDat } from '../../src/data';
import { createInitialGameState, dispatchCommand } from '../../src/engine';
import type { GameState } from '../../src/engine/types';

const DAT = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');

describe.skipIf(!existsSync(DAT))('Sprint 4 independent UAT: real Amiga dungeon', () => {
  const bundle = parseDungeonDat(new Uint8Array(readFileSync(DAT)));

  function nearGroup(levelId: number): GameState {
    const base = createInitialGameState(bundle);
    const level = base.levels.find((l) => l.id === levelId)!;
    const group = (bundle.dungeon.monsterGroups ?? []).find((g) => g.level === levelId
      && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => level.tiles[g.y + dy!]?.[g.x + dx!]?.type === 'FLOOR'))!;
    // Put the party on any walkable neighbour of the group.
    const spots = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
    const spot = spots.map(([dx, dy]) => [group.x + dx, group.y + dy] as const)
      .find(([x, y]) => level.tiles[y]?.[x]?.type === 'FLOOR')!;
    const champion = Object.values(bundle.dungeon.champions)[0]!;
    let state: GameState = {
      ...base,
      party: { ...base.party, level: levelId, x: spot[0], y: spot[1], facing: 0 }
    };
    state = { ...state, activeMirror: { wallX: 0, wallY: 0, face: 2, champion } };
    state = dispatchCommand(state, { type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' }).state;
    return state;
  }

  it('simulates every monster-bearing level for 300 ticks without errors, invalid states, or overlaps', () => {
    const levels = [...new Set((bundle.dungeon.monsterGroups ?? []).map((g) => g.level))];
    expect(levels.length).toBeGreaterThanOrEqual(5);
    for (const levelId of levels) {
      let state = nearGroup(levelId);
      const started = Date.now();
      state = dispatchCommand(state, { type: 'TICK', count: 300 }).state;
      expect(Date.now() - started).toBeLessThan(4000);
      const seen = new Set<string>();
      for (const t of state.combatTargets.filter((v) => v.monster && !v.defeated)) {
        const tile = state.levels.find((l) => l.id === t.level)!.tiles[t.y]![t.x]!;
        expect(tile.type).not.toBe('WALL');
        const k = `${t.level},${t.x},${t.y},${t.monster!.subcell}`;
        expect(seen.has(k)).toBe(false);
        seen.add(k);
        expect(t.health).toBeGreaterThan(0);
        expect(t.health).toBeLessThanOrEqual(t.maxHealth);
      }
      for (const champion of state.party.champions) expect(champion.health).toBeGreaterThanOrEqual(0);
    }
  });

  it('is deterministic and monsters near the party eventually engage it', () => {
    const run = () => dispatchCommand(nearGroup(1), { type: 'TICK', count: 200 });
    const a = run();
    const b = run();
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
    expect(a.events.some((e) => e.type === 'MONSTER_ATTACKED' || e.type === 'MONSTER_MOVED')).toBe(true);
  });
});
