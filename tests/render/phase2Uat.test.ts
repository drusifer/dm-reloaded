/**
 * Phase 2 UAT edge-case verification suite authored by Trin (*qa).
 *
 * TLDR:
 *   Validates step-parity floor/ceiling alternation, Purist-mode HUD/Automap isolation,
 *   progressive door slab height across ticks (progress 4..0), and safe handling of
 *   malformed FTL RLE sprite buffers.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createCleanRoomBundle,
  createCleanRoomGraphicsBundle,
  decodeFtlRleSprite,
  parseGraphicsDat
} from '../../src/data';
import { createInitialGameState, dispatchCommand } from '../../src/engine';
import { Framebuffer, LAYOUT_RECTS, renderFrame } from '../../src/render';

const EXTRACTED_GFX_PATH = resolve(process.cwd(), 'public/assets/extracted/dm1/graphics.dat');

function countPixelDifferences(a: Framebuffer, b: Framebuffer, x: number, y: number, w: number, h: number): number {
  let diffs = 0;
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const pa = a.getPixel(px, py);
      const pb = b.getPixel(px, py);
      if (pa[0] !== pb[0] || pa[1] !== pb[1] || pa[2] !== pb[2]) {
        diffs += 1;
      }
    }
  }
  return diffs;
}

describe('Phase 2 UAT Verification — Story 1.2 & Gate 2 Safeguards (Trin)', () => {
  it('flips ceiling and floor parity between stepParity=0 and stepParity=1 for motion feedback', () => {
    const gfx = existsSync(EXTRACTED_GFX_PATH)
      ? parseGraphicsDat(new Uint8Array(readFileSync(EXTRACTED_GFX_PATH)))
      : createCleanRoomGraphicsBundle();
    const state0 = createInitialGameState(createCleanRoomBundle());
    const state1 = {
      ...state0,
      party: {
        ...state0.party,
        stepParity: 1 as const
      }
    };

    const fb0 = new Framebuffer();
    const fb1 = new Framebuffer();
    renderFrame(fb0, state0, { graphics: gfx });
    renderFrame(fb1, state1, { graphics: gfx });

    const vp = LAYOUT_RECTS.VIEWPORT;
    expect(countPixelDifferences(fb0, fb1, vp.x, vp.y, vp.w, vp.h)).toBeGreaterThan(100);
  });

  it('keeps Purist Mode free of QoL key legend and suppresses automap when qolMode is false', () => {
    const base = createInitialGameState(createCleanRoomBundle());
    const forcedPuristMap = {
      ...base,
      settings: {
        ...base.settings,
        qolMode: false,
        automapOpen: true
      }
    };
    const pureBaseline = {
      ...base,
      settings: {
        ...base.settings,
        qolMode: false,
        automapOpen: false
      }
    };

    const fbForced = new Framebuffer();
    const fbPure = new Framebuffer();
    renderFrame(fbForced, forcedPuristMap);
    renderFrame(fbPure, pureBaseline);

    const vp = LAYOUT_RECTS.VIEWPORT;
    // Viewport in Purist mode ignores automapOpen=true completely
    expect(countPixelDifferences(fbForced, fbPure, vp.x, vp.y, vp.w, vp.h)).toBe(0);

    // Enabling QoL mode adds the [QWEASD/M] hint at bottom-right of message strip
    const qolOn = dispatchCommand(pureBaseline, { type: 'TOGGLE_QOL_MODE' }).state;
    const fbQol = new Framebuffer();
    renderFrame(fbQol, qolOn);
    expect(countPixelDifferences(fbPure, fbQol, 250, 188, 68, 10)).toBeGreaterThan(20);
  });

  it('renders progressive vertical door opening across ticks (progress 4 -> 2 -> 0)', () => {
    let state = createInitialGameState(createCleanRoomBundle());
    // Walk East to (5, 2) and face South (2) toward closed wooden door at (5, 3)
    for (let step = 0; step < 4; step += 1) {
      state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
      state = dispatchCommand(state, { type: 'TICK', count: 3 }).state;
    }
    state = dispatchCommand(state, { type: 'TURN', direction: 'RIGHT' }).state;

    const fbClosed = new Framebuffer();
    renderFrame(fbClosed, state);

    // Click door button ahead -> step 2 ticks (half-open) -> step 2 more ticks (fully open)
    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
    state = dispatchCommand(state, { type: 'TICK', count: 2 }).state;
    const fbHalf = new Framebuffer();
    renderFrame(fbHalf, state);

    state = dispatchCommand(state, { type: 'TICK', count: 3 }).state;
    const fbOpen = new Framebuffer();
    renderFrame(fbOpen, state);

    const vp = LAYOUT_RECTS.VIEWPORT;
    expect(countPixelDifferences(fbClosed, fbHalf, vp.x, vp.y, vp.w, vp.h)).toBeGreaterThan(150);
    expect(countPixelDifferences(fbHalf, fbOpen, vp.x, vp.y, vp.w, vp.h)).toBeGreaterThan(150);
  });

  it('safely returns null for truncated or malformed FTL RLE sprite buffers', () => {
    expect(decodeFtlRleSprite(0, new Uint8Array([0, 16]))).toBeNull();
    // Odd width rejected
    expect(decodeFtlRleSprite(0, new Uint8Array([0, 15, 0, 4, 0x80, 0x3b]))).toBeNull();
    // Pixel count mismatch rejected
    expect(decodeFtlRleSprite(0, new Uint8Array([0, 16, 0, 4, 0x80, 0x10]))).toBeNull();
  });
});
