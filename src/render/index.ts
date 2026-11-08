import { itemIconIndex } from '../data/itemCatalog';
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
import { paintInventory } from './inventoryPainter';
import { drawBitmapText } from './bitmapFont';
import { paintDungeonViewport } from './viewportPainter';
import { paintInteractionPanel } from './interactionPainter';

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
  paintInteractionPanel,
  pointInRect
};
export type { AudioUnlockBadge, BlitOptions, CanvasPresentationRect, ScreenRect };
export * from './contactSheet';
export * from './layout';
export { combatFailureDisplayText } from './interactionPainter';
export { projectileMarkerRect } from './viewportPainter';

export function renderFrame(
  fb: Framebuffer,
  state: GameState,
  options: {
    readonly graphics?: GraphicsBundle;
    readonly audioStatus?: AudioUnlockBadge;
    readonly pointer?: { readonly x: number; readonly y: number } | null;
  } = {}
): void {
  fb.clear([0, 0, 0]);
  paintDungeonViewport(fb, state, options.graphics);
  if (state.settings.qolMode && state.settings.automapOpen && !state.activeMirror) {
    paintAutomapOverlay(fb, state, options.graphics);
  }
  paintHud(fb, state, options.audioStatus ?? 'LOCKED', options.graphics);
  if (!state.activeMirror && !state.party.sleeping) paintInventory(fb, state, options.graphics);
  if (!state.activeMirror && !state.party.sleeping && state.openInventoryChampionIndex === null) {
    paintInteractionPanel(fb, state, options.graphics);
  }
  if (state.handItem && !state.party.sleeping) {
    const item=state.items[state.handItem];
    const pointer=options.pointer;
    if (item && pointer) fb.blitSprite(createSpriteSource(options.graphics).getSprite(`item.icon.${itemIconIndex(item)}`),
      pointer.x - 8, pointer.y - 8,getUiPalette(options.graphics),{transparentIndex:0});
  }
  if (state.gameOver) {
    fb.drawBevelBox(28, 67, 264, 58, [0, 0, 0], [220, 40, 40], [96, 0, 0]);
    drawBitmapText(fb, 'GAME OVER', 133, 79, [255, 80, 80], options.graphics?.systemFont);
    drawBitmapText(fb, 'CLICK OR ENTER TO RESTART', 85, 101, [255, 255, 255], options.graphics?.systemFont);
  }
}

export { paintInventory } from './inventoryPainter';
import { createSpriteSource } from './spriteSource';
export { createSpriteSource } from './spriteSource';
