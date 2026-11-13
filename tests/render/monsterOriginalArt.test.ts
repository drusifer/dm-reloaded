import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle, parseGraphicsDat } from '../../src/data';
import { createSprint4ReviewScenario } from '../../src/engine';
import {
  Framebuffer, LAYOUT_RECTS, monsterViewRect, originalMonsterSprite, originalSpriteRect, renderFrame
} from '../../src/render';
import type { GameState } from '../../src/engine/types';
import { partyOf } from '../engine/testkit';

const GFX = resolve(process.cwd(), 'public/assets/extracted/dm1/graphics.dat');
const LABEL_BOX = { x: 3, y: LAYOUT_RECTS.VIEWPORT.y + LAYOUT_RECTS.VIEWPORT.h - 8, w: 100, h: 6 };

function labelPixels(a: Framebuffer, b: Framebuffer): number {
  let n = 0;
  for (let x = LABEL_BOX.x; x < LABEL_BOX.x + LABEL_BOX.w; x++) {
    for (let y = LABEL_BOX.y; y < LABEL_BOX.y + LABEL_BOX.h; y++) if (a.getPixel(x, y).join() !== b.getPixel(x, y).join()) n++;
  }
  return n;
}

function scene(typeId: number, forward = 2): GameState {
  const base = createSprint4ReviewScenario(partyOf('iaido', 'zed'));
  const x = 1 + forward;
  return {
    ...base,
    combatTargets: base.combatTargets.slice(0, 1).map((t) => ({ ...t, x, monster: { ...t.monster!, typeId } }))
  };
}

describe.skipIf(!existsSync(GFX))('S9-2 original monster art (Amiga source)', () => {
  const real = parseGraphicsDat(new Uint8Array(readFileSync(GFX)));
  const clean = createCleanRoomGraphicsBundle();

  function frames(state: GameState, graphics = real) {
    const withMonster = new Framebuffer();
    const without = new Framebuffer();
    renderFrame(withMonster, state, { graphics });
    renderFrame(without, { ...state, combatTargets: [] }, { graphics });
    return { withMonster, without };
  }

  it('draws the real sprite inside the viewport with no placeholder label', () => {
    for (const typeId of [0, 6, 9, 12, 24]) {
      const state = scene(typeId);
      const view = monsterViewRect(state, state.combatTargets[0]!)!;
      const sprite = originalMonsterSprite(real, typeId)!;
      const dst = originalSpriteRect(sprite, view);
      const vp = LAYOUT_RECTS.VIEWPORT;
      expect(dst.x).toBeGreaterThanOrEqual(vp.x - dst.w);
      expect(dst.y + dst.h).toBeLessThanOrEqual(vp.y + vp.h);
      const { withMonster, without } = frames(state);
      let changed = 0;
      for (let y = dst.y; y < dst.y + dst.h; y++) for (let x = dst.x; x < dst.x + dst.w; x++) {
        if (x >= vp.x && x < vp.x + vp.w && withMonster.getPixel(x, y).join() !== without.getPixel(x, y).join()) changed++;
      }
      expect(changed, `type ${typeId}`).toBeGreaterThan(dst.w * dst.h * 0.15);
      expect(labelPixels(withMonster, without)).toBe(0);
    }
  });

  it('is transparent where the sprite shows its border key colour', () => {
    const state = scene(0, 1);
    const view = monsterViewRect(state, state.combatTargets[0]!)!;
    const dst = originalSpriteRect(originalMonsterSprite(real, 0)!, view);
    const { withMonster, without } = frames(state);
    const corners = [[dst.x, dst.y], [dst.x + dst.w - 1, dst.y], [dst.x, dst.y + dst.h - 1], [dst.x + dst.w - 1, dst.y + dst.h - 1]] as const;
    const unchanged = corners.filter(([x, y]) => withMonster.getPixel(x, y).join() === without.getPixel(x, y).join());
    expect(unchanged.length).toBeGreaterThanOrEqual(2);
  });

  it('scales with distance and darkens with the depth palette', () => {
    const near = originalSpriteRect(originalMonsterSprite(real, 12)!, monsterViewRect(scene(12, 1), scene(12, 1).combatTargets[0]!)!);
    const far = originalSpriteRect(originalMonsterSprite(real, 12)!, monsterViewRect(scene(12, 3), scene(12, 3).combatTargets[0]!)!);
    expect(far.h).toBeLessThan(near.h);
    expect(far.w).toBeLessThan(near.w);
  });

  it('keeps the labelled placeholder for low-confidence types and for the clean-room source', () => {
    const lowState = scene(19);
    expect(originalMonsterSprite(real, 19)).toBeUndefined();
    const low = frames(lowState);
    expect(labelPixels(low.withMonster, low.without)).toBeGreaterThan(20);
    const cleanState = scene(6);
    expect(originalMonsterSprite(clean, 6)).toBeUndefined();
    const c = frames(cleanState, clean);
    expect(labelPixels(c.withMonster, c.without)).toBeGreaterThan(20);
  });

  it('draws the label once when real art and a placeholder share the screen', () => {
    const base = scene(6, 2);
    const second = { ...base.combatTargets[0]!, id: 'rv2', monster: { ...base.combatTargets[0]!.monster!, typeId: 19, subcell: 1 as const }, lane: 'RIGHT' as const };
    const mixed = { ...base, combatTargets: [...base.combatTargets, second] };
    const f = frames(mixed);
    expect(labelPixels(f.withMonster, f.without)).toBeGreaterThan(20);
  });

  it('never draws through a wall or closed door', () => {
    const state = scene(6, 3);
    const walled: GameState = {
      ...state,
      levels: [{ ...state.levels[0]!, tiles: state.levels[0]!.tiles.map((row) => row.map((t, x) => (x === 3 && t.type === 'FLOOR' ? { ...t, type: 'WALL' as const } : t))) }]
    };
    const f = frames(walled);
    expect(Buffer.compare(Buffer.from(f.withMonster.rgba), Buffer.from(f.without.rgba))).toBe(0);
  });
});
