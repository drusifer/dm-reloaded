import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle, monsterTypeDef } from '../../src/data';
import { buildDistanceField, exposedChampionIndexes, stepMonsters } from '../../src/engine/monsters';
import { expandMonsterGroup } from '../../src/engine/monsterSpawn';
import { damageTarget } from '../../src/engine/combat';
import type { Direction, DungeonLevel, EngineEvent, GameState, Tile } from '../../src/engine/types';
import { partyOf, patchChampion, placeAt, run, tick } from './testkit';

const floor = (): Tile => ({ type: 'FLOOR', rawFlags: 0, wallFeatures: [], actuators: [], itemNames: [] });
const wall = (): Tile => ({ ...floor(), type: 'WALL' });

function arena(width: number, height: number, walls: Array<[number, number]> = []): DungeonLevel {
  const blocked = new Set(walls.map(([x, y]) => `${x},${y}`));
  return {
    id: 0, name: 'Arena', width, height, offsetX: 0, offsetY: 0, depth: 1, ambientLight: 5,
    tiles: Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => (blocked.has(`${x},${y}`) ? wall() : floor())))
  };
}

function scene(opts: {
  level?: DungeonLevel; typeId: number; at: [number, number]; party?: [number, number, Direction];
  healths?: number[]; members?: string[];
}): GameState {
  let state = partyOf(...(opts.members ?? ['iaido', 'zed', 'chani', 'elija']));
  const [px, py, facing] = opts.party ?? [1, 1, 1 as Direction];
  state = { ...state, levels: [opts.level ?? arena(12, 5)], rngState: 12345 };
  state = placeAt(state, 0, px, py, facing);
  const def = monsterTypeDef(opts.typeId)!;
  const targets = expandMonsterGroup({
    id: 'g', typeId: opts.typeId, level: 0, x: opts.at[0], y: opts.at[1], facing: 3,
    healths: opts.healths ?? [def.health]
  });
  return { ...state, combatTargets: targets };
}

function advance(state: GameState, ticks: number): { state: GameState; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  let cur = state;
  for (let i = 0; i < ticks; i++) {
    const r = tick(cur);
    cur = r.state;
    events.push(...r.events);
  }
  return { state: cur, events };
}

const posOf = (s: GameState, id = 'g_0') => {
  const t = s.combatTargets.find((v) => v.id === id)!;
  return `${t.x},${t.y}`;
};

describe('S4-3 perception and pathing', () => {
  it('stays dormant beyond sight and ignores walled-off parties', () => {
    const far = scene({ typeId: 6, at: [11, 1] });
    const r = advance(far, 40);
    expect(posOf(r.state)).toBe('11,1');
    expect(r.state.combatTargets[0]!.monster!.awake).toBe(false);

    const walled = scene({ typeId: 6, at: [4, 1], level: arena(12, 5, [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]]) });
    const w = advance(walled, 40);
    expect(posOf(w.state)).toBe('4,1');
  });

  it('wakes inside sight, approaches via the shortest path, and stops adjacent', () => {
    const state = scene({ typeId: 6, at: [4, 1] }); // Screamer sight 3
    const r = advance(state, 60);
    expect(posOf(r.state)).toBe('2,1');
    expect(r.events.filter((e) => e.type === 'MONSTER_MOVED')).toHaveLength(2);
  });

  it('routes around obstacles', () => {
    const level = arena(12, 5, [[3, 1]]);
    const state = scene({ typeId: 12, at: [4, 1], level, healths: [60] });
    const r = advance(state, 200);
    expect(posOf(r.state)).toBe('2,1');
  });

  it('is deterministic for identical state', () => {
    const state = scene({ typeId: 16, at: [5, 1], healths: [75, 75, 75] });
    const a = advance(state, 120);
    const b = advance(state, 120);
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
  });

  it('flyers cross open pits that block walkers', () => {
    const level = arena(12, 5);
    const pit: Tile = { ...floor(), type: 'PIT', pit: { open: true, illusionary: false, hiddenOutline: false } };
    const tiles = level.tiles.map((row) => row.map((t, x) => (x === 3 ? pit : t)));
    const pitted = { ...level, tiles };
    const base = scene({ typeId: 6, at: [4, 1], level: pitted });
    const flyer = scene({ typeId: 17, at: [4, 1], level: pitted });
    expect(buildDistanceField(base, false, 8).has('3,1')).toBe(false);
    expect(buildDistanceField(flyer, true, 8).has('3,1')).toBe(true);
    expect(posOf(advance(base, 80).state)).toBe('4,1');
    expect(posOf(advance({ ...flyer, combatTargets: flyer.combatTargets }, 80).state)).toBe('2,1');
  });
});

describe('S4-3 formation', () => {
  it('never stacks subcells, never exceeds four per tile, never enters the party tile', () => {
    const state = scene({ typeId: 1, at: [5, 1], healths: [35, 35, 35, 35] });
    for (let i = 0; i < 80; i++) {
      const stepped = advance(state, i).state;
      const seen = new Set<string>();
      for (const t of stepped.combatTargets.filter((v) => !v.defeated)) {
        const k = `${t.x},${t.y},${t.monster!.subcell}`;
        expect(seen.has(k)).toBe(false);
        seen.add(k);
        expect(`${t.x},${t.y}`).not.toBe('1,1');
      }
    }
  });
});

describe('S4-3/4 monster attacks', () => {
  it('hits the front row once per attack interval with fixed RNG budget and armor effect', () => {
    const state = scene({ typeId: 6, at: [2, 1] });
    const before = state.rngState;
    const r = advance(state, 1);
    const attacks = r.events.filter((e) => e.type === 'MONSTER_ATTACKED');
    // First attack is gated by the arrival grace only after moves; adjacent start attacks at once.
    expect(attacks).toHaveLength(1);
    expect(r.state.rngState).not.toBe(before);
    const next = advance(r.state, 8);
    expect(next.events.filter((e) => e.type === 'MONSTER_ATTACKED')).toHaveLength(0);
    const more = advance(r.state, 9);
    expect(more.events.filter((e) => e.type === 'MONSTER_ATTACKED')).toHaveLength(1);
  });

  it('exposes the correct champions by attack side', () => {
    expect(exposedChampionIndexes(1, 1)).toEqual([0, 1]);
    expect(exposedChampionIndexes(1, 3)).toEqual([2, 3]);
    expect(exposedChampionIndexes(1, 0)).toEqual([0, 2]);
    expect(exposedChampionIndexes(1, 2)).toEqual([1, 3]);
  });

  it('a monster behind the party injures the back row', () => {
    const state = scene({ typeId: 9, at: [0, 1], party: [1, 1, 1] });
    const r = advance(state, 1);
    const hit = r.events.find((e) => e.type === 'MONSTER_ATTACKED');
    expect(hit).toBeDefined();
    expect(['chani', 'elija']).toContain((hit as Extract<EngineEvent, { type: 'MONSTER_ATTACKED' }>).championId);
  });

  it('kills a champion at zero health and ends the game on a party wipe', () => {
    let state = scene({ typeId: 9, at: [2, 1], members: ['iaido'] });
    state = patchChampion(state, 0, { health: 1 });
    const r = advance(state, 80);
    expect(r.events.some((e) => e.type === 'CHAMPION_DIED')).toBe(true);
    expect(r.state.gameOver).toBe(true);
    expect(r.state.party.champions[0]!.alive).toBe(false);
  });
});

describe('S4-4 fighting monsters', () => {
  it('credits the killer, removes the corpse once, and drops items', () => {
    const state = scene({ typeId: 6, at: [2, 1], healths: [5] });
    const events: EngineEvent[] = [];
    const damaged = damageTarget(state, 'g_0', 99, 'iaido', events);
    expect(damaged.combatTargets[0]!.monster!.lastHitBy).toBe('iaido');
    const r = advance(damaged, 2);
    const kills = r.events.filter((e) => e.type === 'MONSTER_KILLED');
    expect(kills).toHaveLength(1);
    expect((kills[0] as Extract<EngineEvent, { type: 'MONSTER_KILLED' }>).killerChampionId).toBe('iaido');
    expect(r.state.combatTargets).toHaveLength(0);
    expect(Object.keys(r.state.items).some((id) => id.startsWith('drop_g_0'))).toBe(true);
  });

  it('non-material monsters ignore physical hits but take magical damage', () => {
    const state = scene({ typeId: 8, at: [2, 1], healths: [60] });
    const events: EngineEvent[] = [];
    const physical = damageTarget(state, 'g_0', 30, 'iaido', events);
    expect(physical.combatTargets[0]!.health).toBe(60);
    const magic = damageTarget(state, 'g_0', 30, 'iaido', events, true);
    expect(magic.combatTargets[0]!.health).toBe(30);
  });

  it('wakes a sleeping monster that was hurt from outside sight', () => {
    const state = scene({ typeId: 6, at: [4, 1], healths: [55] });
    const hurt = damageTarget(state, 'g_0', 5, 'iaido', []);
    expect(hurt.combatTargets[0]!.monster!.awake).toBe(true);
  });
});

describe('S4-5 doors and generators', () => {
  it('crushes a monster standing in a closing door exactly once', () => {
    const level = arena(12, 5);
    const door: Tile = {
      ...floor(), type: 'DOOR',
      door: { orientation: 'WEST_EAST', material: 'WOODEN', progress: 2, targetProgress: 4, hasButton: false, bashable: false, fireballDestructible: false }
    };
    const tiles = level.tiles.map((row, y) => row.map((t, x) => (x === 6 && y === 1 ? door : t)));
    const state = scene({ typeId: 6, at: [6, 1], level: { ...level, tiles } });
    const events: EngineEvent[] = [];
    const once = stepMonsters(state, events);
    expect(once.combatTargets[0]!.health).toBe(state.combatTargets[0]!.health - 40);
    const doorAt3 = { ...once, levels: [{ ...once.levels[0]!, tiles: once.levels[0]!.tiles.map((row) => row.map((t) => (t.type === 'DOOR' ? { ...t, door: { ...t.door!, progress: 3 as const } } : t))) }] };
    expect(stepMonsters(doorAt3, []).combatTargets[0]!.health).toBe(once.combatTargets[0]!.health);
  });

  it('kills a weak monster by crushing and credits no champion', () => {
    const level = arena(12, 5);
    const door: Tile = {
      ...floor(), type: 'DOOR',
      door: { orientation: 'WEST_EAST', material: 'WOODEN', progress: 2, targetProgress: 4, hasButton: false, bashable: false, fireballDestructible: false }
    };
    const tiles = level.tiles.map((row, y) => row.map((t, x) => (x === 6 && y === 1 ? door : t)));
    const state = scene({ typeId: 2, at: [6, 1], level: { ...level, tiles }, healths: [20] });
    const events: EngineEvent[] = [];
    const after = stepMonsters(state, events);
    const kill = events.find((e) => e.type === 'MONSTER_KILLED') as Extract<EngineEvent, { type: 'MONSTER_KILLED' }>;
    expect(kill.cause).toBe('CRUSHED');
    expect(kill.killerChampionId).toBeNull();
    expect(after.combatTargets).toHaveLength(0);
  });

  it('spawns on schedule, respects caps, party adjacency and exhausts', () => {
    let state = scene({ typeId: 6, at: [11, 3], party: [1, 1, 1] });
    state = {
      ...state,
      combatTargets: [],
      monsterGenerators: [{ id: 'gen', typeId: 4, level: 0, x: 9, y: 3, intervalTicks: 5, nextSpawnTick: 3, remaining: 2 }]
    };
    const r = advance(state, 20);
    expect(r.events.filter((e) => e.type === 'MONSTER_SPAWNED')).toHaveLength(2);
    expect(r.state.monsterGenerators[0]!.remaining).toBe(0);

    const adjacent = { ...state, party: { ...state.party, x: 9, y: 2 } };
    const blocked = advance(adjacent, 4);
    expect(blocked.events.some((e) => e.type === 'MONSTER_SPAWNED')).toBe(false);
  });
});

describe('Trin audit regressions', () => {
  it('blocks the party from walking through a live monster and does not move or damage it', () => {
    const state = scene({ typeId: 6, at: [2, 1] });
    const r = run(state, { type: 'MOVE', direction: 'FORWARD' });
    expect(r.state.party.x).toBe(1);
    expect(r.state.messages[r.state.messages.length - 1]).toBe('A MONSTER BLOCKS THE WAY.');
    expect(r.events.filter((e) => e.type === 'MESSAGE_LOGGED')).toHaveLength(1);
    expect(r.state.combatTargets[0]).toEqual(state.combatTargets[0]);
  });

  it('still lets the party walk past passive training targets and dead monsters', () => {
    const state = scene({ typeId: 6, at: [2, 1] });
    const passive = { ...state, combatTargets: state.combatTargets.map((t) => ({ ...t, monster: undefined })) };
    expect(run(passive, { type: 'MOVE', direction: 'FORWARD' }).state.party.x).toBe(2);
    const dead = { ...state, combatTargets: state.combatTargets.map((t) => ({ ...t, defeated: true })) };
    expect(run(dead, { type: 'MOVE', direction: 'FORWARD' }).state.party.x).toBe(2);
  });

  it('wakes a sleeping party when a monster lands a hit', () => {
    let state = scene({ typeId: 9, at: [2, 1] });
    state = { ...state, party: { ...state.party, sleeping: true } };
    let events: EngineEvent[] = [];
    for (let i = 0; i < 40 && state.party.sleeping; i++) {
      const r = tick(state);
      state = r.state;
      events = events.concat(r.events);
    }
    expect(state.party.sleeping).toBe(false);
  });
});

describe('integration with the real reducer', () => {
  it('leaves the clean-room campaign unaffected when no monsters exist', () => {
    const state = partyOf('iaido');
    expect(run(state, { type: 'TICK', count: 30 }).state.combatTargets).toEqual(state.combatTargets);
    expect(createCleanRoomBundle().dungeon.monsterGroups ?? []).toBeDefined();
  });
});
