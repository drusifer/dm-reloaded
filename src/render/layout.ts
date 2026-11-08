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
  SLEEP_PILL: { x: 273, y: 19, w: 22, h: 9 },
  AUDIO_PILL: { x: 296, y: 19, w: 23, h: 9 },
  INVENTORY_MOUTH: { x: 56, y: 46, w: 16, h: 16 },
  INVENTORY_EYE: { x: 12, y: 46, w: 16, h: 16 },
  INVENTORY_SAVE: { x: 173, y: 34, w: 12, h: 12 },
  INVENTORY_SLEEP: { x: 187, y: 34, w: 20, h: 12 },
  INVENTORY_CLOSE: { x: 209, y: 34, w: 14, h: 12 },
  VIEWPORT: { x: 0, y: 33, w: 224, h: 136 },
  WALL_FEATURE_HIT: { x: 72, y: 64, w: 80, h: 52 },
  FLOOR_LEFT_HIT: { x: 8, y: 132, w: 96, h: 36 },
  FLOOR_RIGHT_HIT: { x: 120, y: 132, w: 96, h: 36 },
  VIEWPORT_CENTER_HIT: { x: 32, y: 42, w: 160, h: 110 },
  RIGHT_DECK: { x: 224, y: 33, w: 96, h: 136 },
  MOVEMENT_PAD: { x: 224, y: 124, w: 96, h: 45 },
  MESSAGE_STRIP: { x: 0, y: 169, w: 320, h: 31 },
  MIRROR_MODAL: { x: 8, y: 39, w: 208, h: 124 },
  MIRROR_BTN_RESURRECT: { x: 16, y: 138, w: 62, h: 16 },
  MIRROR_BTN_REINCARNATE: { x: 82, y: 138, w: 68, h: 16 },
  MIRROR_BTN_CANCEL: { x: 154, y: 138, w: 54, h: 16 }
} as const;

export const ACTION_PANEL_RECTS = {
  CLOSE: { x: 306, y: 35, w: 12, h: 10 },
  SWING: { x: 230, y: 50, w: 38, h: 18 },
  SHOOT: { x: 274, y: 50, w: 38, h: 18 },
  RUNES: { x: 230, y: 74, w: 82, h: 18 },
  PROGRESSION: { x: 230, y: 98, w: 82, h: 18 }
} as const;

export const RUNE_RECTS: readonly ScreenRect[] = Array.from({ length: 24 }, (_, index) => ({
  x: 225 + (index % 6) * 16, y: 36 + Math.floor(index / 6) * 15, w: 15, h: 14
}));
export const RUNE_PANEL_RECTS = {
  REMOVE: { x: 225, y: 98, w: 22, h: 12 }, CLEAR: { x: 249, y: 98, w: 22, h: 12 },
  FLASK: { x: 273, y: 98, w: 22, h: 12 }, CLOSE: { x: 297, y: 98, w: 22, h: 12 },
  INVOKE: { x: 225, y: 112, w: 94, h: 11 }
} as const;
export const PROGRESSION_PANEL_RECTS = { CLOSE: { x: 306, y: 35, w: 12, h: 10 } } as const;

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

/** Original item[17] frame origins, verified against decoded border pixels (18x18 frames). */
export const EQUIP_SLOT_RECTS = {
  head: { x: 34, y: 59, w: 16, h: 16 }, neck: { x: 6, y: 66, w: 16, h: 16 },
  torso: { x: 34, y: 79, w: 16, h: 16 }, legs: { x: 34, y: 99, w: 16, h: 16 },
  feet: { x: 34, y: 119, w: 16, h: 16 }, leftHand: { x: 6, y: 86, w: 16, h: 16 },
  rightHand: { x: 62, y: 86, w: 16, h: 16 }, pouch1: { x: 6, y: 106, w: 16, h: 16 },
  pouch2: { x: 6, y: 123, w: 16, h: 16 }, quiver1: { x: 62, y: 106, w: 16, h: 16 },
  quiver2: { x: 79, y: 106, w: 16, h: 16 }, quiver3: { x: 62, y: 123, w: 16, h: 16 },
  quiver4: { x: 79, y: 123, w: 16, h: 16 }
} as const;
export const BACKPACK_SLOT_RECTS: readonly ScreenRect[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ x: 83 + i * 17, y: 49, w: 16, h: 16 })),
  ...Array.from({ length: 9 }, (_, i) => ({ x: 66 + i * 17, y: 66, w: 16, h: 16 }))
];
/** Original item[25] eight chest frames, relative to the subpanel at (80,85). */
export const CHEST_SLOT_RECTS: readonly ScreenRect[] = [[36,6],[25,23],[30,40],[47,45],[64,48],[81,50],[98,51],[115,52]]
  .map(([x, y]) => ({ x: 81 + x!, y: 86 + y!, w: 16, h: 16 }));

/** Scroll item[23] parchment interior excludes the curled wooden margins. */
export const SCROLL_TEXT_RECT = { x: 117, y: 94, w: 90, h: 49 } as const;

/** Shared portrait hand geometry keeps rendered icons and pointer targets aligned. */
export function championHandRect(index: number, hand: 'leftHand' | 'rightHand'): ScreenRect {
  return { x: index * 68 + (hand === 'leftHand' ? 40 : 54), y: 10, w: 13, h: 16 };
}
