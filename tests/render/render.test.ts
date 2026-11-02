/**
 * Unit and real-Amiga-asset rendering tests for Phase 2 (graphics.dat + 320x200 Framebuffer).
 *
 * TLDR:
 *   Validates 575-item Amiga graphics.dat RLE sprite/PCM/font/palette decoding,
 *   pitch-black vs torchlit 224x136 viewport rendering, strict x=0..271 / x=272..319
 *   HUD non-overlap, Champion Mirror modal rendering, and QoL parchment automap overlay.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createCleanRoomBundle,
  createCleanRoomGraphicsBundle,
  extractChampionPortrait,
  parseDungeonDat,
  parseGraphicsDat
} from '../../src/data';
import { createInitialGameState, dispatchCommand } from '../../src/engine';
import {
  FRAMEBUFFER_HEIGHT,
  FRAMEBUFFER_WIDTH,
  Framebuffer,
  LAYOUT_RECTS,
  championSlotRect,
  computeCanvasPresentationRect,
  drawBitmapText,
  renderFrame
} from '../../src/render';

const EXTRACTED_GFX_PATH = resolve(process.cwd(), 'public/assets/extracted/dm1/graphics.dat');
const EXTRACTED_DUNGEON_PATH = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');

function countNonBlackPixelsInRect(
  fb: Framebuffer,
  x: number,
  y: number,
  w: number,
  h: number
): number {
  let nonBlack = 0;
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const [r, g, b] = fb.getPixel(px, py);
      if (r > 0 || g > 0 || b > 0) {
        nonBlack += 1;
      }
    }
  }
  return nonBlack;
}

describe('Phase 2: GraphicsDatParser & 320x200 Amiga Renderer', () => {
  it('decodes all 535 FTL RLE sprites, 33 Paula PCM sounds, system font, and 6 light ramps from real graphics.dat', () => {
    if (!existsSync(EXTRACTED_GFX_PATH)) {
      const fallback = createCleanRoomGraphicsBundle();
      expect(fallback.source).toBe('CLEAN_ROOM');
      expect(fallback.lightPalettes).toHaveLength(6);
      return;
    }

    const raw = new Uint8Array(readFileSync(EXTRACTED_GFX_PATH));
    const bundle = parseGraphicsDat(raw);

    expect(bundle.source).toBe('AMIGA_GRAPHICS_DAT');
    expect(bundle.itemCount).toBe(575);
    expect(bundle.sprites.size).toBe(535);
    expect(bundle.sounds.size).toBeGreaterThanOrEqual(30);
    expect(bundle.systemFont?.length).toBe(768);
    expect(bundle.lightPalettes).toHaveLength(6);

    // Iconic DM1 Amiga sprites
    expect(bundle.sprites.get(1)?.width).toBe(320);
    expect(bundle.sprites.get(1)?.height).toBe(200);
    expect(bundle.sprites.get(13)?.width).toBe(96);
    expect(bundle.sprites.get(13)?.height).toBe(45);
    expect(bundle.sprites.get(26)?.width).toBe(256);
    expect(bundle.sprites.get(26)?.height).toBe(87);
    expect(bundle.sprites.get(75)?.width).toBe(224);
    expect(bundle.sprites.get(76)?.width).toBe(224);

    // Extract all 24 Champion 32x29 portraits from item[26]
    for (let p = 0; p < 24; p += 1) {
      const portrait = extractChampionPortrait(bundle, p);
      expect(portrait).not.toBeNull();
      expect(portrait?.width).toBe(32);
      expect(portrait?.height).toBe(29);
    }
  });

  it('enforces canonical 320x200 layout bounds, integer scaling, and zero Champion/Utility pill overlap', () => {
    const fb = new Framebuffer();
    expect(fb.width).toBe(FRAMEBUFFER_WIDTH);
    expect(fb.height).toBe(FRAMEBUFFER_HEIGHT);
    expect(fb.rgba.length).toBe(320 * 200 * 4);

    for (let slot = 0; slot < 4; slot += 1) {
      const rect = championSlotRect(slot);
      expect(rect.x + rect.w).toBeLessThanOrEqual(LAYOUT_RECTS.UTILITY_BAR.x);
    }
    expect(LAYOUT_RECTS.UTILITY_BAR.x).toBe(272);
    expect(LAYOUT_RECTS.UTILITY_BAR.x + LAYOUT_RECTS.UTILITY_BAR.w).toBe(320);

    const presentation = computeCanvasPresentationRect(1024, 768);
    expect(presentation.scale).toBe(3);
    expect(presentation.drawWidth).toBe(960);
    expect(presentation.drawHeight).toBe(600);
    expect(presentation.offsetX).toBe(32);
    expect(presentation.offsetY).toBe(84);
  });

  it('renders pitch-black 224x136 viewport when unlit (ambient+torch=0) while keeping HUD fully visible', () => {
    const campaign = createCleanRoomBundle();
    const baseState = createInitialGameState(campaign);

    // Move party onto Level 2 (ambientLight = 0) with torchLight = 0
    const darkState = {
      ...baseState,
      party: {
        ...baseState.party,
        level: 2,
        x: 4,
        y: 2,
        torchLight: 0
      }
    };

    const fb = new Framebuffer();
    renderFrame(fb, darkState);

    const vp = LAYOUT_RECTS.VIEWPORT;
    expect(countNonBlackPixelsInRect(fb, vp.x, vp.y, vp.w, vp.h)).toBe(0);
    // Top HUD and Right Control Deck remain legible in darkness
    expect(countNonBlackPixelsInRect(fb, 0, 0, 320, 29)).toBeGreaterThan(200);
    expect(countNonBlackPixelsInRect(fb, 224, 33, 96, 136)).toBeGreaterThan(400);

    // Igniting a torch illuminates the corridor immediately
    const litState = {
      ...darkState,
      party: {
        ...darkState.party,
        torchLight: 4
      }
    };
    renderFrame(fb, litState);
    expect(countNonBlackPixelsInRect(fb, vp.x, vp.y, vp.w, vp.h)).toBeGreaterThan(2500);
  });

  it('renders real Amiga Hall of Champions corridor, Mirror Modal, and QoL Automap cleanly', () => {
    const campaign = existsSync(EXTRACTED_DUNGEON_PATH)
      ? parseDungeonDat(new Uint8Array(readFileSync(EXTRACTED_DUNGEON_PATH)))
      : createCleanRoomBundle();
    const gfx = existsSync(EXTRACTED_GFX_PATH)
      ? parseGraphicsDat(new Uint8Array(readFileSync(EXTRACTED_GFX_PATH)))
      : createCleanRoomGraphicsBundle();

    const state = createInitialGameState(campaign);
    const fb = new Framebuffer();
    renderFrame(fb, state, { graphics: gfx, audioStatus: 'ACTIVE' });

    const vp = LAYOUT_RECTS.VIEWPORT;
    expect(countNonBlackPixelsInRect(fb, vp.x, vp.y, vp.w, vp.h)).toBeGreaterThan(3000);

    // Open a Champion Mirror modal in clean-room fixture (step East to x=2,y=2, turn North toward mirror at 2,1)
    const crState = createInitialGameState(createCleanRoomBundle());
    const steppedEast = dispatchCommand(crState, { type: 'MOVE', direction: 'FORWARD' }).state;
    const cooledDown = dispatchCommand(steppedEast, { type: 'TICK', count: 3 }).state;
    const turnedNorth = dispatchCommand(cooledDown, { type: 'TURN', direction: 'LEFT' }).state;
    const mirrorOpen = dispatchCommand(turnedNorth, { type: 'INTERACT_AHEAD' }).state;
    expect(mirrorOpen.activeMirror).not.toBeNull();

    const modalFb = new Framebuffer();
    renderFrame(modalFb, mirrorOpen, { graphics: gfx });
    const resBtn = LAYOUT_RECTS.MIRROR_BTN_RESURRECT;
    const canBtn = LAYOUT_RECTS.MIRROR_BTN_CANCEL;
    expect(countNonBlackPixelsInRect(modalFb, resBtn.x, resBtn.y, resBtn.w, resBtn.h)).toBeGreaterThan(40);
    expect(countNonBlackPixelsInRect(modalFb, canBtn.x, canBtn.y, canBtn.w, canBtn.h)).toBeGreaterThan(40);

    // Enable QoL + Automap and verify parchment overlay renders inside viewport
    let qolState = dispatchCommand(crState, { type: 'TOGGLE_QOL_MODE' }).state;
    qolState = dispatchCommand(qolState, { type: 'TOGGLE_AUTOMAP' }).state;
    const mapFb = new Framebuffer();
    renderFrame(mapFb, qolState, { graphics: gfx });
    const [pr, pg, pb] = mapFb.getPixel(vp.x + 20, vp.y + 20);
    expect(pr).toBeGreaterThan(150);
    expect(pg).toBeGreaterThan(130);
    expect(pb).toBeGreaterThan(90);

    // Regression: mixed-case strings render identically to uppercase with item[557] system font
    const fbMixed = new Framebuffer();
    const fbUpper = new Framebuffer();
    drawBitmapText(fbMixed, 'Hall of Champions', 10, 10, [255, 255, 255], gfx.systemFont);
    drawBitmapText(fbUpper, 'HALL OF CHAMPIONS', 10, 10, [255, 255, 255], gfx.systemFont);
    expect(Array.from(fbMixed.rgba.slice(0, 320 * 24 * 4))).toEqual(
      Array.from(fbUpper.rgba.slice(0, 320 * 24 * 4))
    );
  });

  it('uses authentic FTL item[558] wall/ceiling/floor perspective without reversed D0L/D0R slopes', () => {
    if (!existsSync(EXTRACTED_GFX_PATH) || !existsSync(EXTRACTED_DUNGEON_PATH)) {
      return;
    }
    const campaign = parseDungeonDat(new Uint8Array(readFileSync(EXTRACTED_DUNGEON_PATH)));
    const gfx = parseGraphicsDat(new Uint8Array(readFileSync(EXTRACTED_GFX_PATH)));
    const base = createInitialGameState(campaign);

    // Place party at exact user-reported spot: Level 0, (1, 6), facing North (0)
    const stateAt16North = {
      ...base,
      party: { ...base.party, level: 0, x: 1, y: 6, facing: 0 as const }
    };
    const fb = new Framebuffer();
    renderFrame(fb, stateAt16North, { graphics: gfx });

    const vp = LAYOUT_RECTS.VIEWPORT;
    // D0L (item[85] at x=0..31): outer edge x=0 reaches bottom row y=135, inner edge x=31 tapers up to y=119
    // so (31, vp.y + 132) sees the floor flagstones rather than a reversed wall bottom.
    const d0lOuterBottom = fb.getPixel(vp.x + 1, vp.y + 133);
    expect(d0lOuterBottom[0]).toBeGreaterThan(60);

    // D0R (item[84] at x=192..223): outer edge x=223 reaches top y=0, inner edge x=192 starts at y=9
    const d0rOuterTop = fb.getPixel(vp.x + 222, vp.y + 2);
    expect(d0rOuterTop[0]).toBeGreaterThan(80);
  });

  it('renders crosswise doors across the hallway at LVL:0 (7,9) DIR:WEST with symmetric 3D stone doorjambs', () => {
    if (!existsSync(EXTRACTED_GFX_PATH) || !existsSync(EXTRACTED_DUNGEON_PATH)) {
      return;
    }
    const campaign = parseDungeonDat(new Uint8Array(readFileSync(EXTRACTED_DUNGEON_PATH)));
    const gfx = parseGraphicsDat(new Uint8Array(readFileSync(EXTRACTED_GFX_PATH)));
    const base = createInitialGameState(campaign);

    // User screenshot position: Level 0, (7, 9), facing West (3) -> door at (5, 9) is at depth 2 across hallway
    const stateAt79West = {
      ...base,
      party: { ...base.party, level: 0, x: 7, y: 9, facing: 3 as const }
    };
    const fb = new Framebuffer();
    renderFrame(fb, stateAt79West, { graphics: gfx });

    const vp = LAYOUT_RECTS.VIEWPORT;
    // Left 3D stone doorjamb (sprite 79 at x=48..95 -> opaque stone around x=68..75)
    expect(countNonBlackPixelsInRect(fb, vp.x + 66, vp.y + 30, 10, 40)).toBeGreaterThan(250);
    // Right 3D stone doorjamb (sprite 79 flipped at x=128..175 -> opaque stone around x=148..155)
    expect(countNonBlackPixelsInRect(fb, vp.x + 148, vp.y + 30, 10, 40)).toBeGreaterThan(250);
    // Iron portcullis grate bars span across the center opening (x=80..143, y=24..82)
    expect(countNonBlackPixelsInRect(fb, vp.x + 84, vp.y + 26, 56, 52)).toBeGreaterThan(400);
  });
});
