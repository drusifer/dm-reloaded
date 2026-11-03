/** World objects must follow perspective, occlusion, and visible held/sleep state. */
import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle, createCleanRoomGraphicsBundle } from '../../src/data';
import { createInitialGameState } from '../../src/engine';
import type { GameState, Tile } from '../../src/engine/types';
import { Framebuffer } from '../../src/render/framebuffer';
import { paintDungeonViewport } from '../../src/render/viewportPainter';
import { paintHud } from '../../src/render/hudPainter';

const floor: Tile = { type: 'FLOOR', rawFlags: 0, wallFeatures: [], actuators: [], itemNames: [] };
function corridor(): GameState {
  const state = createInitialGameState(createCleanRoomBundle());
  return { ...state, party: { ...state.party, x: 2, y: 5, facing: 0 },
    levels: state.levels.map((level, index) => index === 0 ? { ...level,
      tiles: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => floor)) } : level) };
}
function tileAt(state: GameState, x: number, y: number, tile: Tile): GameState {
  return { ...state, levels: state.levels.map((level, index) => index === 0 ? { ...level,
    tiles: level.tiles.map((row, ry) => ry === y ? row.map((value, rx) => rx === x ? tile : value) : row) } : level) };
}
function frame(state: GameState): Framebuffer {
  const fb = new Framebuffer();
  paintDungeonViewport(fb, state, createCleanRoomGraphicsBundle());
  return fb;
}
function changed(a: Framebuffer, b: Framebuffer): [number, number][] {
  const points: [number, number][] = [];
  for (let y = 33; y < 169; y++) for (let x = 0; x < 224; x++) {
    if (a.getPixel(x, y).some((value, index) => value !== b.getPixel(x, y)[index])) points.push([x, y]);
  }
  return points;
}

describe('world item projection and HUD state', () => {
  it('renders all four depths with shrinking perspective', () => {
    const base = corridor();
    const empty = frame(base);
    const sizes = [0, 1, 2, 3].map(depth => {
      const state = tileAt(base, 2, 5 - depth, { ...floor,
        floorItems: { 0: ['cr_dagger_1'], 1: [], 2: [], 3: [] } });
      const pixels = changed(empty, frame(state));
      expect(pixels.length).toBeGreaterThan(0);
      expect(pixels.every(([x]) => x < 112)).toBe(true);
      return pixels.length;
    });
    expect(sizes[0]).toBeGreaterThan(sizes[1]!);
    expect(sizes[1]).toBeGreaterThan(sizes[2]!);
    expect(sizes[2]).toBeGreaterThan(sizes[3]!);
  });

  it('occludes far objects behind a nearer solid wall', () => {
    const base = tileAt(corridor(), 2, 4, { ...floor, type: 'WALL' });
    const hidden = tileAt(base, 2, 3, { ...floor,
      floorItems: { 0: ['cr_dagger_1'], 1: [], 2: [], 3: [] } });
    expect(frame(hidden).rgba).toEqual(frame(base).rgba);
  });

  it('renders wall alcove contents and airborne items at different heights', () => {
    const base = corridor();
    const wall = tileAt(base, 2, 4, { ...floor, type: 'WALL',
      wallFeatures: [{ face: 2, kind: 'ALCOVE' }] });
    const loaded = tileAt(wall, 2, 4, { ...wall.levels[0]!.tiles[4]![2]!,
      wallItems: { 0: [], 1: [], 2: ['cr_dagger_1'], 3: [] } });
    expect(changed(frame(wall), frame(loaded)).length).toBeGreaterThan(0);
    const flying = { ...base, projectiles: [{ id: 'flight', itemId: 'cr_dagger_1',
      level: 0, x: 2, y: 4, direction: 0 as const, lane: 'LEFT' as const,
      kineticEnergy: 20, stepEnergyCost: 1 }] };
    const pixels = changed(frame(base), frame(flying));
    expect(pixels.length).toBeGreaterThan(0);
    expect(Math.max(...pixels.map(([, y]) => y))).toBeLessThan(143);
  });

  it('shows a held item icon and visibly darkens the viewport while asleep', () => {
    const base = corridor();
    const awake = frame(base);
    paintHud(awake, base);
    const held = frame(base);
    paintHud(held, { ...base, handItem: 'cr_dagger_1' });
    expect(held.rgba).not.toEqual(awake.rgba);
    const sleeping = frame(base);
    paintHud(sleeping, { ...base, party: { ...base.party, sleeping: true } });
    expect(sleeping.getPixel(0, 33).every(value => value <= 12)).toBe(true);
    expect(sleeping.rgba).not.toEqual(awake.rgba);
  });
});
