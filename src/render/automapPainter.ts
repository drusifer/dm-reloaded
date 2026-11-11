/**
 * Toggleable QoL parchment automap overlay for the 224x136 dungeon viewport.
 *
 * TLDR:
 *   Renders visited tiles (and adjacent discovered walls) onto a warm parchment sheet
 *   inside the 224x136 viewport when settings.qolMode && settings.automapOpen is active.
 */

import { monsterViewRect } from './monsterPainter';
import type { GameState } from '../engine/types';
import type { GraphicsBundle, RgbColor } from '../data/graphicsDatParser';
import { drawBitmapText } from './bitmapFont';
import type { Framebuffer } from './framebuffer';
import { LAYOUT_RECTS } from './layout';

const PARCHMENT_BG: RgbColor = [214, 192, 142];
const PARCHMENT_DARK: RgbColor = [122, 92, 52];
const INK_WALL: RgbColor = [68, 50, 28];
const INK_FLOOR: RgbColor = [232, 214, 170];
const INK_DOOR: RgbColor = [156, 78, 20];
const INK_STAIRS: RgbColor = [36, 118, 56];
const INK_PIT: RgbColor = [30, 24, 20];
const INK_TELEPORT: RgbColor = [24, 138, 178];
const INK_PARTY: RgbColor = [208, 28, 28];

export function paintAutomapOverlay(
  fb: Framebuffer,
  state: GameState,
  bundle?: GraphicsBundle
): void {
  const vp = LAYOUT_RECTS.VIEWPORT;
  const level = state.levels[state.party.level];
  if (!level) {
    return;
  }

  fb.drawBevelBox(vp.x + 4, vp.y + 4, vp.w - 8, vp.h - 8, PARCHMENT_BG, INK_FLOOR, PARCHMENT_DARK);
  fb.strokeRect(vp.x + 6, vp.y + 6, vp.w - 12, vp.h - 12, PARCHMENT_DARK);

  drawBitmapText(
    fb,
    `MAP L${level.id}:${level.name.slice(0, 18)}`,
    vp.x + 10,
    vp.y + 9,
    INK_WALL,
    bundle?.systemFont
  );

  const cellSize = 7;
  const radiusX = 13;
  const radiusY = 7;
  const centerPx = vp.x + Math.floor(vp.w / 2);
  const centerPy = vp.y + Math.floor(vp.h / 2) + 4;

  const isDiscovered = (tx: number, ty: number): boolean => {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const key = `${level.id}:${tx + dx},${ty + dy}`;
        if (state.party.visitedTiles[key]) {
          return true;
        }
      }
    }
    return false;
  };

  for (let dy = -radiusY; dy <= radiusY; dy += 1) {
    for (let dx = -radiusX; dx <= radiusX; dx += 1) {
      const tx = state.party.x + dx;
      const ty = state.party.y + dy;
      if (tx < 0 || tx >= level.width || ty < 0 || ty >= level.height) {
        continue;
      }
      if (!isDiscovered(tx, ty)) {
        continue;
      }
      const tile = level.tiles[ty]?.[tx];
      if (!tile) continue;

      const px = centerPx + dx * cellSize - 3;
      const py = centerPy + dy * cellSize - 3;

      if (tile.type === 'WALL' || (tile.type === 'TRICK_WALL' && !(tile.trickWall?.open ?? false) && !(tile.trickWall?.illusionary ?? false))) {
        fb.fillRect(px, py, cellSize, cellSize, INK_WALL);
      } else {
        fb.fillRect(px, py, cellSize, cellSize, INK_FLOOR);
        fb.strokeRect(px, py, cellSize, cellSize, PARCHMENT_DARK);
        if (tile.type === 'DOOR') {
          if (tile.door?.orientation === 'NORTH_SOUTH') {
            fb.fillRect(px + 2, py + 1, 3, cellSize - 2, INK_DOOR);
          } else {
            fb.fillRect(px + 1, py + 2, cellSize - 2, 3, INK_DOOR);
          }
        } else if (tile.type === 'STAIRS') {
          fb.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2, INK_STAIRS);
        } else if (tile.type === 'PIT' && tile.pit?.open) {
          fb.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4, INK_PIT);
        } else if (tile.type === 'TELEPORTER') {
          fb.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4, INK_TELEPORT);
        }
      }
    }
  }

  // Monsters appear only while currently in view (same rule as the viewport; no wall-hack).
  for (const target of state.combatTargets) {
    if (!monsterViewRect(state, target)) continue;
    const mx = centerPx + (target.x - state.party.x) * cellSize - 1;
    const my = centerPy + (target.y - state.party.y) * cellSize - 1;
    fb.fillRect(mx, my, 3, 3, [200, 20, 20]);
  }

  // Draw party directional marker at map center
  fb.fillRect(centerPx - 1, centerPy - 1, 3, 3, INK_PARTY);
  if (state.party.facing === 0) fb.setPixel(centerPx, centerPy - 2, INK_PARTY);
  if (state.party.facing === 1) fb.setPixel(centerPx + 2, centerPy, INK_PARTY);
  if (state.party.facing === 2) fb.setPixel(centerPx, centerPy + 2, INK_PARTY);
  if (state.party.facing === 3) fb.setPixel(centerPx - 2, centerPy, INK_PARTY);
}
