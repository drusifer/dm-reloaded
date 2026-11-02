import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createCleanRoomBundle,
  decompressDungeon8104,
  parseChampionTextRecord,
  parseDungeonDat
} from '../../src/data';
import { createInitialGameState, dispatchCommand, getTile } from '../../src/engine';

const EXTRACTED_DM1_DAT = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');

describe('Champion text record parser', () => {
  it('decodes canonical FTL A..P nibble-encoded champion stats and 16 hidden skills', () => {
    const rawHalk = [
      'HALK',
      'THE BARBARIAN',
      '',
      'M',
      'AAFKACOOAAAA',
      'CIDHCLBOCOCGDA',
      'EAEAAAAAAAAAAAAA'
    ].join('\n');

    const halk = parseChampionTextRecord(rawHalk, 1, ['CLUB']);
    expect(halk).not.toBeNull();
    expect(halk?.name).toBe('HALK');
    expect(halk?.title).toBe('THE BARBARIAN');
    expect(halk?.gender).toBe('M');
    expect(halk?.maxHealth).toBe(90);
    expect(halk?.maxStamina).toBe(75);
    expect(halk?.maxMana).toBe(0);
    expect(halk?.attributes).toEqual({
      luck: 40,
      strength: 55,
      dexterity: 43,
      wisdom: 30,
      vitality: 46,
      antiMagic: 38,
      antiFire: 48
    });
    expect(halk?.skills[0]).toBe(4);
    expect(halk?.skills[2]).toBe(4);
    expect(halk?.skills.slice(4)).toEqual(new Array(12).fill(0));
  });
});

describe('CleanRoomProvider starter bundle', () => {
  it('provides deterministic Hall of Champions and Entry Puzzles levels', () => {
    const bundle = createCleanRoomBundle();
    expect(bundle.source).toBe('CLEAN_ROOM');
    expect(bundle.dungeon.levels).toHaveLength(3);
    expect(Object.keys(bundle.dungeon.champions)).toEqual(['iaido', 'zed', 'chani', 'elija']);
  });
});

describe.runIf(existsSync(EXTRACTED_DM1_DAT))('Real 1988 Amiga Dungeon.dat parser', () => {
  const compressedBytes = new Uint8Array(readFileSync(EXTRACTED_DM1_DAT));

  it('decompresses 0x8104 bitstream to exact 33,444 bytes with seed 99', () => {
    expect(compressedBytes.byteLength).toBe(25006);
    const decomp = decompressDungeon8104(compressedBytes);
    expect(decomp.byteLength).toBe(33444);
    expect((decomp[0]! << 8) | decomp[1]!).toBe(99);
  });

  it('parses all 14 original Dungeon Master levels and all 24 Hall of Champions heroes', () => {
    const bundle = parseDungeonDat(compressedBytes);
    expect(bundle.source).toBe('AMIGA_DAT');
    expect(bundle.dungeon.seed).toBe(99);
    expect(bundle.dungeon.levels).toHaveLength(14);

    const lvl0 = bundle.dungeon.levels[0]!;
    expect(lvl0.width).toBe(19);
    expect(lvl0.height).toBe(19);

    const lvl1 = bundle.dungeon.levels[1]!;
    expect(lvl1.width).toBe(32);
    expect(lvl1.height).toBe(32);

    const lvl13 = bundle.dungeon.levels[13]!;
    expect(lvl13.width).toBe(26);
    expect(lvl13.height).toBe(13);

    const champList = Object.values(bundle.dungeon.champions);
    expect(champList.length).toBe(24);
    const names = champList.map((c) => c.name);
    expect(names).toContain('IAIDO');
    expect(bundle.dungeon.champions['iaido']?.title).toBe('RUYITO CHIBURI');
    expect(names).toContain('ZED');
    expect(names).toContain('CHANI');
    expect(names).toContain('ELIJA');
    expect(names).toContain('HALK');
    expect(names).toContain('DAROOU');
    expect(names).toContain('WU TSE');
  });

  it('walks the real 1988 Hall of Champions route: reads plaque, recruits Halk, triggers plate door (5,9), grabs torch, and descends to Level 1', () => {
    const bundle = parseDungeonDat(compressedBytes);
    let state = createInitialGameState(bundle);

    const step = () => {
      state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
      state = dispatchCommand(state, { type: 'TICK' }).state;
    };
    const face = (target: 0 | 1 | 2 | 3) => {
      while (state.party.facing !== target) {
        state = dispatchCommand(state, { type: 'TURN', direction: 'RIGHT' }).state;
      }
    };

    // Start at (1, 3) facing South (2)
    expect(state.party).toMatchObject({ level: 0, x: 1, y: 3, facing: 2 });

    // 1. Follow entrance bend: (1,3)->(1,7) South, ->(4,7) East, ->(4,2) North, ->(6,2) East, ->(6,3) South, ->(8,3) East, ->(8,4) South
    for (let i = 0; i < 4; i++) step(); // (1,7)
    face(1);
    for (let i = 0; i < 3; i++) step(); // (4,7)
    face(0);
    for (let i = 0; i < 5; i++) step(); // (4,2)
    face(1);
    for (let i = 0; i < 2; i++) step(); // (6,2)
    face(2);
    step(); // (6,3)
    face(1);
    for (let i = 0; i < 2; i++) step(); // (8,3)
    face(2);
    step(); // (8,4) facing South into wall (8,5) "HALL OF CHAMPIONS" plaque!

    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
    expect(state.messages.at(-1)).toBe('HALL OF - CHAMPIONS');

    // 2. Enter Mirror Gallery: East -> (9,4), South -> (9,9), West -> (7,9)
    face(1);
    step(); // (9,4)
    face(2);
    for (let i = 0; i < 5; i++) step(); // (9,9)
    face(3);
    for (let i = 0; i < 2; i++) step(); // (7,9)

    // Face North (0) toward Halk the Barbarian's mirror at (7,8) and RESURRECT him!
    face(0);
    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
    expect(state.activeMirror?.champion.name).toBe('HALK');
    state = dispatchCommand(state, { type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' }).state;
    expect(state.party.champions).toHaveLength(1);
    expect(state.party.champions[0]?.name).toBe('HALK');

    // 3. Step West onto (6,9) floor pressure plate -> opens NORTH_SOUTH iron portcullis grate at (5,9) over 4 ticks!
    const exitDoor = getTile(state.levels, 0, 5, 9)?.door;
    expect(exitDoor?.orientation).toBe('NORTH_SOUTH');
    expect(exitDoor?.material).toBe('IRON_GRATE');
    expect(exitDoor?.progress).toBe(4);

    // Regression: every flanked interior door across all 14 levels matches its corridor walls
    for (const lvl of bundle.dungeon.levels) {
      for (let y = 1; y < lvl.height - 1; y++) {
        for (let x = 1; x < lvl.width - 1; x++) {
          const t = lvl.tiles[y]?.[x];
          if (t?.type !== 'DOOR' || !t.door) continue;
          const nWall = lvl.tiles[y - 1]?.[x]?.type === 'WALL';
          const sWall = lvl.tiles[y + 1]?.[x]?.type === 'WALL';
          const wWall = lvl.tiles[y]?.[x - 1]?.type === 'WALL';
          const eWall = lvl.tiles[y]?.[x + 1]?.type === 'WALL';
          if (nWall && sWall && !wWall && !eWall) {
            expect(t.door.orientation).toBe('NORTH_SOUTH');
          } else if (wWall && eWall && !nWall && !sWall) {
            expect(t.door.orientation).toBe('WEST_EAST');
          }
        }
      }
    }

    face(3);
    step(); // (6,9) triggers Actu[2] -> target (5,9)
    state = dispatchCommand(state, { type: 'TICK', count: 4 }).state;
    expect(getTile(state.levels, 0, 5, 9)?.door?.progress).toBe(0);

    // 4. Walk West through (5,9) -> (4,9), South -> (4,14), take Torch from West wall (3,14), then descend Stairs (3,15)!
    step(); // (5,9)
    step(); // (4,9)
    face(2);
    for (let i = 0; i < 5; i++) step(); // (4,14)

    face(3); // Face West toward Torch sconce at (3,14)
    const torchRes = dispatchCommand(state, { type: 'INTERACT_AHEAD' });
    state = torchRes.state;
    expect(torchRes.events.some((e) => e.type === 'TORCH_TAKEN')).toBe(true);

    face(2);
    step(); // (4,15)
    face(3);
    const stairsRes = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }); // (3,15) Stairs Down!
    expect(stairsRes.events.some((e) => e.type === 'STAIRS_TAKEN')).toBe(true);
    expect(stairsRes.state.party.level).toBe(1);
  });
});
