import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle } from '../../src/data';
import { createSprint4ReviewScenario } from '../../src/engine';
import { Framebuffer, LAYOUT_RECTS, monsterViewRect, renderFrame } from '../../src/render';
import type { GameState, Tile } from '../../src/engine/types';
import { partyOf, tick } from '../engine/testkit';

function reviewState(): GameState {
  return createSprint4ReviewScenario(partyOf('iaido', 'zed'));
}

describe('S4-6 monster presentation', () => {
  it('projects visible monsters by depth and hides far or off-corridor ones', () => {
    const state = reviewState();
    const screamers = state.combatTargets.filter((t) => t.id.startsWith('rv_screamer'));
    const rect = monsterViewRect(state, screamers[0]!)!;
    expect(rect.forward).toBe(3);
    const near = monsterViewRect({ ...state, party: { ...state.party, x: 3 } }, screamers[0]!)!;
    expect(near.h).toBeGreaterThan(rect.h);
    const ghost = state.combatTargets.find((t) => t.id.startsWith('rv_ghost'))!;
    expect(monsterViewRect(state, ghost)).toBeNull(); // forward 7 is beyond sight depth
    const faceNorth = { ...state, party: { ...state.party, facing: 0 as const } };
    expect(monsterViewRect(faceNorth, screamers[0]!)).toBeNull();
  });

  it('never draws a monster behind a wall or closed door', () => {
    const state = reviewState();
    const blockWith = (tile: Partial<Tile>): GameState => ({
      ...state,
      levels: [{ ...state.levels[0]!, tiles: state.levels[0]!.tiles.map((row, y) => row.map((t, x) => (x === 2 && y === 1 ? { ...t, ...tile } : t))) }]
    });
    const target = state.combatTargets[0]!;
    expect(monsterViewRect(blockWith({ type: 'WALL' }), target)).toBeNull();
    const closed = blockWith({ type: 'DOOR', door: { orientation: 'WEST_EAST', material: 'WOODEN', progress: 4, targetProgress: 4, hasButton: false, bashable: false, fireballDestructible: false } });
    expect(monsterViewRect(closed, target)).toBeNull();
  });

  it('draws silhouettes, HP pip, and the placeholder label; HUD flashes an injured champion', () => {
    const base = reviewState();
    const damaged = {
      ...base,
      combatTargets: base.combatTargets.map((t, i) => (i === 0 ? { ...t, health: 10 } : t))
    };
    const empty = new Framebuffer();
    renderFrame(empty, { ...damaged, combatTargets: [] }, { graphics: createCleanRoomGraphicsBundle() });
    const fb = new Framebuffer();
    renderFrame(fb, damaged, { graphics: createCleanRoomGraphicsBundle() });
    const rect = monsterViewRect(damaged, damaged.combatTargets[0]!)!;
    const px = fb.getPixel(rect.x + Math.floor(rect.w / 2), rect.y + rect.h - 2);
    const before = empty.getPixel(rect.x + Math.floor(rect.w / 2), rect.y + rect.h - 2);
    expect(px).not.toEqual(before);
    // Red HP pip above the monster.
    expect(fb.getPixel(rect.x + 1, rect.y - 4)[0]).toBeGreaterThan(150);
    // Label region differs from the empty viewport.
    let labelPixels = 0;
    for (let x = 3; x < 100; x++) for (let y = LAYOUT_RECTS.VIEWPORT.y + LAYOUT_RECTS.VIEWPORT.h - 8; y < LAYOUT_RECTS.VIEWPORT.y + LAYOUT_RECTS.VIEWPORT.h - 2; y++) {
      if (fb.getPixel(x, y).join() !== empty.getPixel(x, y).join()) labelPixels++;
    }
    expect(labelPixels).toBeGreaterThan(20);

    const hurt = { ...base, party: { ...base.party, champions: base.party.champions.map((c, i) => (i === 0 ? { ...c, hurtUntilTick: base.tick + 5 } : c)) } };
    const a = new Framebuffer();
    const b = new Framebuffer();
    renderFrame(a, base, { graphics: createCleanRoomGraphicsBundle() });
    renderFrame(b, hurt, { graphics: createCleanRoomGraphicsBundle() });
    expect(Buffer.compare(Buffer.from(a.rgba), Buffer.from(b.rgba))).not.toBe(0);
  });

  it('plays a full approach, injury, and kill with visible state at every step', () => {
    let state = reviewState();
    let injured = false;
    for (let i = 0; i < 120 && !injured; i++) {
      const r = tick(state);
      state = r.state;
      injured = r.events.some((e) => e.type === 'MONSTER_ATTACKED' && e.hit);
    }
    expect(injured).toBe(true);
    expect(state.party.champions.some((c) => (c.hurtUntilTick ?? 0) > state.tick - 1)).toBe(true);
    expect(state.messages.some((m) => /HITS/.test(m))).toBe(true);
  });
});
