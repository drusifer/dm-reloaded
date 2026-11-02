/**
 * Public exports and full-frame composer for the 320x200 Amiga rendering pipeline.
 *
 * TLDR:
 *   Composes the 3D dungeon viewport, optional QoL parchment automap, classic HUD,
 *   utility pills, movement arrow pad, message strip, and Champion Mirror modal onto
 *   the 320x200 offscreen Framebuffer.
 */

import type { GameState } from '../engine/types';
import type { GraphicsBundle } from '../data/graphicsDatParser';
import { paintAutomapOverlay } from './automapPainter';
import { drawBitmapText } from './bitmapFont';
import {
  FRAMEBUFFER_HEIGHT,
  FRAMEBUFFER_WIDTH,
  Framebuffer,
  computeCanvasPresentationRect
} from './framebuffer';
import type { BlitOptions, CanvasPresentationRect } from './framebuffer';
import { paintHud, paintMirrorModal } from './hudPainter';
import { LAYOUT_RECTS, championSlotRect, pointInRect } from './layout';
import type { AudioUnlockBadge, ScreenRect } from './layout';
import { PALETTE_INDEX, getUiPalette, getViewportLightPalette } from './palette';
import { paintDungeonViewport } from './viewportPainter';

export {
  FRAMEBUFFER_HEIGHT,
  FRAMEBUFFER_WIDTH,
  Framebuffer,
  LAYOUT_RECTS,
  PALETTE_INDEX,
  championSlotRect,
  computeCanvasPresentationRect,
  drawBitmapText,
  getUiPalette,
  getViewportLightPalette,
  paintAutomapOverlay,
  paintDungeonViewport,
  paintHud,
  paintMirrorModal,
  pointInRect
};
export type { AudioUnlockBadge, BlitOptions, CanvasPresentationRect, ScreenRect };

export function renderFrame(
  fb: Framebuffer,
  state: GameState,
  options: {
    readonly graphics?: GraphicsBundle;
    readonly audioStatus?: AudioUnlockBadge;
  } = {}
): void {
  fb.clear([0, 0, 0]);
  paintDungeonViewport(fb, state, options.graphics);
  if (state.settings.qolMode && state.settings.automapOpen && !state.activeMirror) {
    paintAutomapOverlay(fb, state, options.graphics);
  }
  paintHud(fb, state, options.audioStatus ?? 'LOCKED', options.graphics);
}
