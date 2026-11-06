/**
 * Full-bright source palette and parametric dungeon lighting adapter.
 *
 * TLDR:
 *   Maps 4-bit palette indices (0..15) to RGB triplets for UI full-brightness rendering
 *   and depth/torchlight-attenuated 3D viewport rendering (including pitch-black unlit state).
 */

import { createLightingContext, lightPalette } from './lighting';
import { buildDefaultLightPalettes } from '../data/graphicsDatParser';
import type { GraphicsBundle, RgbColor } from '../data/graphicsDatParser';

export const PALETTE_INDEX = {
  BLACK: 0,
  DARK_GRAY: 1,
  MEDIUM_GRAY: 2,
  DARK_BROWN: 3,
  CYAN: 4,
  LIGHT_BROWN: 5,
  DARK_GREEN: 6,
  LIGHT_GREEN: 7,
  RED: 8,
  ORANGE: 9,
  FLESH_KEY: 10,
  YELLOW: 11,
  DARKEST_GRAY_KEY: 12,
  LIGHT_GRAY: 13,
  BLUE: 14,
  WHITE: 15
} as const;

const DEFAULT_RAMPS = buildDefaultLightPalettes();

/**
 * Returns the full-brightness 16-color Amiga UI palette (never dimmed by dungeon darkness).
 */
export function getUiPalette(bundle?: GraphicsBundle): readonly RgbColor[] {
  const ramps = bundle?.lightPalettes ?? DEFAULT_RAMPS;
  return ramps[ramps.length - 1] ?? DEFAULT_RAMPS[5]!;
}

/**
 * Computes the 16-color viewport palette for an effective party+ambient light level (0..5)
 * and corridor tile depth (0..3).
 *
 * When effectiveLight === 0, returns pitch black [0,0,0] for all colors per Story 1.1 AC.
 */
export function getViewportLightPalette(
  effectiveLight: number,
  depth: 0 | 1 | 2 | 3,
  bundle?: GraphicsBundle
): readonly RgbColor[] {
  const basePalette = getUiPalette(bundle);
  if (basePalette.length !== 16) {
    throw new Error('Viewport lighting requires exactly 16 source palette colors');
  }
  return lightPalette(basePalette, createLightingContext(effectiveLight, depth));
}
