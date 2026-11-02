/**
 * Canonical 320x200 Amiga layout rectangles shared by renderers and pointer hit-testing.
 *
 * TLDR:
 *   Single source of truth for all HUD, 3D viewport, utility pill (x=272..319),
 *   6-cell movement arrow pad, message strip, and Champion Mirror modal coordinates.
 */

export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type AudioUnlockBadge = 'LOCKED' | 'ACTIVE' | 'MUTED';

export const LAYOUT_RECTS = {
  CHAMPION_BAR: { x: 0, y: 0, w: 272, h: 29 },
  UTILITY_BAR: { x: 272, y: 0, w: 48, h: 29 },
  QOL_PILL: { x: 273, y: 1, w: 46, h: 8 },
  AUTOMAP_PILL: { x: 273, y: 10, w: 46, h: 8 },
  AUDIO_PILL: { x: 273, y: 19, w: 46, h: 9 },
  VIEWPORT: { x: 0, y: 33, w: 224, h: 136 },
  VIEWPORT_CENTER_HIT: { x: 32, y: 42, w: 160, h: 110 },
  RIGHT_DECK: { x: 224, y: 33, w: 96, h: 136 },
  MOVEMENT_PAD: { x: 224, y: 124, w: 96, h: 45 },
  MESSAGE_STRIP: { x: 0, y: 169, w: 320, h: 31 },
  MIRROR_MODAL: { x: 8, y: 39, w: 208, h: 124 },
  MIRROR_BTN_RESURRECT: { x: 16, y: 138, w: 62, h: 16 },
  MIRROR_BTN_REINCARNATE: { x: 82, y: 138, w: 68, h: 16 },
  MIRROR_BTN_CANCEL: { x: 154, y: 138, w: 54, h: 16 }
} as const;

export function championSlotRect(slotIndex: number): ScreenRect {
  return {
    x: slotIndex * 68,
    y: 0,
    w: 68,
    h: 29
  };
}

export function pointInRect(px: number, py: number, rect: ScreenRect): boolean {
  return px >= rect.x && px < rect.x + rect.w && py >= rect.y && py < rect.y + rect.h;
}
