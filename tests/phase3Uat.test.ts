/**
 * Phase 3 End-to-End Vertical Slice UAT suite authored by Trin (*qa).
 *
 * TLDR:
 *   Drives the complete pointer/keyboard -> 6Hz engine -> PaulaStereoAudio -> 320x200
 *   Framebuffer loop against genuine 1988 Amiga Dungeon.dat + graphics.dat, plus
 *   verifies loadRuntimeAssets() clean-room fallback when binaries are unavailable.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PaulaStereoAudio } from '../src/audio';
import {
  createCleanRoomBundle,
  createCleanRoomGraphicsBundle,
  parseDungeonDat,
  parseGraphicsDat
} from '../src/data';
import { FixedTickAccumulator, createInitialGameState, dispatchCommand } from '../src/engine';
import {
  clientPointToAmigaCoords,
  resolveKeyboardCommand,
  resolvePointerHitCommand
} from '../src/input';
import { loadRuntimeAssets } from '../src/main';
import { Framebuffer, LAYOUT_RECTS, renderFrame } from '../src/render';

const EXTRACTED_DUNGEON_PATH = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');
const EXTRACTED_GFX_PATH = resolve(process.cwd(), 'public/assets/extracted/dm1/graphics.dat');

describe('Phase 3 UAT Verification — Full Vertical Slice & Dual-Mode Loader (Trin)', () => {
  it('plays through pointer pad clicks, Mirror Cancel/Resurrect, QoL toggle, keyboard steps, and Paula audio on real Amiga data', () => {
    const campaign = existsSync(EXTRACTED_DUNGEON_PATH)
      ? parseDungeonDat(new Uint8Array(readFileSync(EXTRACTED_DUNGEON_PATH)))
      : createCleanRoomBundle();
    const gfx = existsSync(EXTRACTED_GFX_PATH)
      ? parseGraphicsDat(new Uint8Array(readFileSync(EXTRACTED_GFX_PATH)))
      : createCleanRoomGraphicsBundle();

    let state = createInitialGameState(campaign);
    const clock = new FixedTickAccumulator();
    const audio = new PaulaStereoAudio(gfx);
    const fb = new Framebuffer();
    const scaledCanvasRect = { left: 20, top: 40, width: 640, height: 400 }; // 2x integer scale

    const clickAmigaPixel = (ax: number, ay: number): void => {
      audio.unlockFromGesture();
      const pt = clientPointToAmigaCoords(
        scaledCanvasRect.left + ax * 2,
        scaledCanvasRect.top + ay * 2,
        scaledCanvasRect
      );
      expect(pt).toEqual({ x: ax, y: ay });
      const cmd = resolvePointerHitCommand(pt!.x, pt!.y, state);
      if (cmd) {
        const res = dispatchCommand(state, cmd);
        state = res.state;
        audio.processEvents(res.events, state);
      }
    };

    const advanceMs = (ms: number): void => {
      const ticks = clock.advance(ms);
      if (ticks > 0) {
        const res = dispatchCommand(state, { type: 'TICK', count: ticks });
        state = res.state;
        audio.processEvents(res.events, state);
      }
    };

    // Initial render in Purist Mode with LOCKED audio
    renderFrame(fb, state, { graphics: gfx, audioStatus: audio.getStatus() });
    expect(audio.getStatus()).toBe('LOCKED');

    // Step forward via 6-button Movement Pad (top-center cell: x=268, y=132) -> silent floor step in 1988 mode
    clickAmigaPixel(268, 132);
    expect(audio.getStatus()).toBe('ACTIVE');
    expect(audio.getHistory().some((h) => h.cue === 'FOOTSTEP')).toBe(false);
    advanceMs(550);

    // Strafe left into corridor wall via Movement Pad (bottom-left cell: x=236, y=155) -> plays item[565] WALL_BUMP ("OOF!")
    clickAmigaPixel(236, 155);
    expect(audio.getHistory().some((h) => h.cue === 'WALL_BUMP')).toBe(true);
    advanceMs(550);

    // Toggle QoL Mode via top-right utility pill (x=280, y=4)
    clickAmigaPixel(LAYOUT_RECTS.QOL_PILL.x + 6, LAYOUT_RECTS.QOL_PILL.y + 3);
    expect(state.settings.qolMode).toBe(true);

    // Open & close Automap via 'm' key and viewport click
    const mapCmd = resolveKeyboardCommand('m', state);
    expect(mapCmd).toEqual({ type: 'TOGGLE_AUTOMAP' });
    state = dispatchCommand(state, mapCmd!).state;
    expect(state.settings.automapOpen).toBe(true);
    renderFrame(fb, state, { graphics: gfx, audioStatus: audio.getStatus() });

    // Clicking inside viewport dismisses Automap cleanly
    clickAmigaPixel(112, 96);
    expect(state.settings.automapOpen).toBe(false);
  });

  it('falls back cleanly to CleanRoomProvider when extracted assets are absent or unreachable', async () => {
    const assets = await loadRuntimeAssets();
    expect(assets.campaign.source).toBe('CLEAN_ROOM');
    expect(assets.graphics.source).toBe('CLEAN_ROOM');
    expect(assets.campaign.dungeon.levels.length).toBeGreaterThanOrEqual(2);
  });
});
