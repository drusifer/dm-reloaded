/**
 * Pointer hitbox mapper and Purist/QoL keyboard translator for the 320x200 Amiga UI.
 *
 * TLDR:
 *   Maps bounding-rect client coordinates onto canonical [0..319, 0..199] hitboxes
 *   (6-cell movement pad, ahead viewport interaction, Mirror modal buttons, x=272..319
 *   utility pills) and enforces 1988 Purist Mode keyboard gating until QoL Mode is active.
 */

import type { GameCommand, GameState } from '../engine/types';
import { FRAMEBUFFER_HEIGHT, FRAMEBUFFER_WIDTH, LAYOUT_RECTS, pointInRect } from '../render';

export interface BoundingClientRectLike {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface AmigaPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Maps a browser clientX/clientY pointer position onto the 320x200 Amiga coordinate space
 * using the canvas element's live getBoundingClientRect(). Returns null if out of bounds.
 */
export function clientPointToAmigaCoords(
  clientX: number,
  clientY: number,
  canvasRect: BoundingClientRectLike
): AmigaPoint | null {
  if (canvasRect.width <= 0 || canvasRect.height <= 0) {
    return null;
  }
  const relX = clientX - canvasRect.left;
  const relY = clientY - canvasRect.top;
  if (relX < 0 || relX >= canvasRect.width || relY < 0 || relY >= canvasRect.height) {
    return null;
  }
  const x = Math.floor((relX * FRAMEBUFFER_WIDTH) / canvasRect.width);
  const y = Math.floor((relY * FRAMEBUFFER_HEIGHT) / canvasRect.height);
  if (x < 0 || x >= FRAMEBUFFER_WIDTH || y < 0 || y >= FRAMEBUFFER_HEIGHT) {
    return null;
  }
  return { x, y };
}

/**
 * Resolves a [0..319, 0..199] Amiga pixel click into a pure GameCommand, or null if non-interactive.
 */
export function resolvePointerHitCommand(px: number, py: number, state: GameState): GameCommand | null {
  // 1. Top-right utility pills (x=272..319) are always reachable
  if (pointInRect(px, py, LAYOUT_RECTS.QOL_PILL)) {
    return { type: 'TOGGLE_QOL_MODE' };
  }
  if (pointInRect(px, py, LAYOUT_RECTS.AUTOMAP_PILL)) {
    return { type: 'TOGGLE_AUTOMAP' };
  }
  if (pointInRect(px, py, LAYOUT_RECTS.AUDIO_PILL)) {
    return { type: 'SET_AUDIO_MUTED', muted: !state.settings.audioMuted };
  }

  // 2. Modal dialog captures viewport/movement clicks until resolved or cancelled
  if (state.activeMirror !== null) {
    if (pointInRect(px, py, LAYOUT_RECTS.MIRROR_BTN_CANCEL)) {
      return { type: 'CANCEL_MIRROR' };
    }
    if (state.party.champions.length < 4) {
      if (pointInRect(px, py, LAYOUT_RECTS.MIRROR_BTN_RESURRECT)) {
        return { type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' };
      }
      if (pointInRect(px, py, LAYOUT_RECTS.MIRROR_BTN_REINCARNATE)) {
        return { type: 'RECRUIT_CHAMPION', mode: 'REINCARNATE' };
      }
    }
    return null;
  }

  // 3. Classic 6-button Movement Arrow Pad (224, 124, 96, 45)
  const pad = LAYOUT_RECTS.MOVEMENT_PAD;
  if (pointInRect(px, py, pad)) {
    const col = Math.min(2, Math.floor((px - pad.x) / 32));
    const isBottomRow = py >= pad.y + 22;
    if (!isBottomRow) {
      if (col === 0) return { type: 'TURN', direction: 'LEFT' };
      if (col === 1) return { type: 'MOVE', direction: 'FORWARD' };
      return { type: 'TURN', direction: 'RIGHT' };
    }
    if (col === 0) return { type: 'MOVE', direction: 'STRAFE_LEFT' };
    if (col === 1) return { type: 'MOVE', direction: 'BACKWARD' };
    return { type: 'MOVE', direction: 'STRAFE_RIGHT' };
  }

  // 4. Center viewport ahead interaction (switches, sconces, mirrors, door buttons)
  if (pointInRect(px, py, LAYOUT_RECTS.VIEWPORT)) {
    if (state.settings.qolMode && state.settings.automapOpen) {
      return { type: 'TOGGLE_AUTOMAP' };
    }
    if (pointInRect(px, py, LAYOUT_RECTS.VIEWPORT_CENTER_HIT)) {
      return { type: 'INTERACT_AHEAD' };
    }
  }

  return null;
}

/**
 * Translates keyboard events into GameCommands.
 * Escape always cancels active modals; QWEASD / Arrow keys / M require settings.qolMode === true.
 */
export function resolveKeyboardCommand(key: string, state: GameState): GameCommand | null {
  if (key === 'Escape') {
    if (state.activeMirror !== null) {
      return { type: 'CANCEL_MIRROR' };
    }
    if (state.settings.qolMode && state.settings.automapOpen) {
      return { type: 'TOGGLE_AUTOMAP' };
    }
    return null;
  }

  // 1988 Purist Mode disables modern keyboard movement and automap hotkeys
  if (!state.settings.qolMode || state.activeMirror !== null) {
    return null;
  }

  switch (key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      return { type: 'MOVE', direction: 'FORWARD' };
    case 's':
    case 'S':
    case 'ArrowDown':
      return { type: 'MOVE', direction: 'BACKWARD' };
    case 'a':
    case 'A':
      return { type: 'MOVE', direction: 'STRAFE_LEFT' };
    case 'd':
    case 'D':
      return { type: 'MOVE', direction: 'STRAFE_RIGHT' };
    case 'q':
    case 'Q':
    case 'ArrowLeft':
      return { type: 'TURN', direction: 'LEFT' };
    case 'e':
    case 'E':
    case 'ArrowRight':
      return { type: 'TURN', direction: 'RIGHT' };
    case 'm':
    case 'M':
      return { type: 'TOGGLE_AUTOMAP' };
    case ' ':
    case 'Enter':
      return { type: 'INTERACT_AHEAD' };
    default:
      return null;
  }
}
