/**
 * Placeholder monster silhouettes for the 320x200 viewport.
 *
 * TLDR:
 *   monsterViewRect is the pure, test-shared projection (forward 1..4, lateral -1..1) with a
 *   conservative line-of-sight rule so monsters never draw through walls or closed doors.
 *   paintMonsters draws labelled placeholder silhouettes (not original art) and HP pips.
 */

import { monsterTypeDef } from '../data/monsterCatalog';
import {
  DIRECTION_DELTAS,
  type CombatTargetState,
  type Direction,
  type DungeonLevel,
  type GameState,
  type Tile
} from '../engine/types';
import type { RgbColor } from '../data/graphicsDatParser';
import { drawBitmapText } from './bitmapFont';
import type { Framebuffer } from './framebuffer';
import { LAYOUT_RECTS, type ScreenRect } from './layout';

export interface MonsterViewRect extends ScreenRect {
  readonly forward: number;
  readonly lateral: number;
}

const FEET_Y = [0, 128, 104, 90, 81] as const;
const BODY_H = [0, 62, 40, 26, 17] as const;
const MAX_FORWARD = 4;

function tileAt(level: DungeonLevel, x: number, y: number): Tile | undefined {
  return level.tiles[y]?.[x];
}

/** True when the tile blocks sight: walls, unrevealed trick walls, and (mostly) closed doors. */
export function blocksSight(tile: Tile | undefined): boolean {
  if (!tile) return true;
  if (tile.type === 'WALL') return true;
  if (tile.type === 'TRICK_WALL') return !(tile.trickWall?.open ?? false) && !(tile.trickWall?.illusionary ?? false);
  if (tile.type === 'DOOR') return (tile.door?.progress ?? 0) >= 3 && tile.door?.progress !== 5;
  return false;
}

function offsetTile(state: GameState, forward: number, lateral: number): { x: number; y: number } {
  const f = DIRECTION_DELTAS[state.party.facing];
  const r = DIRECTION_DELTAS[((state.party.facing + 1) & 3) as Direction];
  return { x: state.party.x + f.dx * forward + r.dx * lateral, y: state.party.y + f.dy * forward + r.dy * lateral };
}

/** Monsters are visible only down open corridors: the centre column must be clear up to them. */
export function monsterVisibleAt(state: GameState, forward: number, lateral: number): boolean {
  const level = state.levels.find((l) => l.id === state.party.level);
  if (!level || forward < 1 || forward > MAX_FORWARD || Math.abs(lateral) > 1) return false;
  for (let f = 1; f < forward; f++) {
    const p = offsetTile(state, f, 0);
    if (blocksSight(tileAt(level, p.x, p.y))) return false;
  }
  const target = offsetTile(state, forward, lateral);
  if (blocksSight(tileAt(level, target.x, target.y))) return false;
  if (lateral !== 0) {
    const side = offsetTile(state, forward - 1, lateral);
    const ahead = offsetTile(state, forward, 0);
    if (blocksSight(tileAt(level, side.x, side.y)) && blocksSight(tileAt(level, ahead.x, ahead.y))) return false;
  }
  return true;
}

export function monsterViewRect(state: GameState, target: CombatTargetState): MonsterViewRect | null {
  if (!target.monster || target.defeated || target.level !== state.party.level) return null;
  const dx = target.x - state.party.x;
  const dy = target.y - state.party.y;
  const f = DIRECTION_DELTAS[state.party.facing];
  const r = DIRECTION_DELTAS[((state.party.facing + 1) & 3) as Direction];
  const forward = dx * f.dx + dy * f.dy;
  const lateral = dx * r.dx + dy * r.dy;
  if (!monsterVisibleAt(state, forward, lateral)) return null;
  const def = monsterTypeDef(target.monster.typeId);
  const h = BODY_H[forward] ?? 17;
  const w = Math.max(5, Math.round(h * 0.6));
  const laneOffset = (target.monster.subcell % 2 === 0 ? -1 : 1) * Math.max(3, Math.floor(26 / forward));
  const depthOffset = (target.monster.subcell >= 2 ? 1 : -1) * Math.max(1, Math.floor(6 / forward));
  const lift = def?.traits.includes('FLYING') ? Math.floor(h * 0.3) : 0;
  const centerX = LAYOUT_RECTS.VIEWPORT.x + 112 + Math.round((lateral * 64) / forward) + laneOffset;
  const feet = LAYOUT_RECTS.VIEWPORT.y + (FEET_Y[forward] ?? 81) + depthOffset - lift;
  return { x: centerX - Math.floor(w / 2), y: feet - h, w, h, forward, lateral };
}

function parseHex(hex: string): RgbColor {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(color: RgbColor, forward: number): RgbColor {
  const k = [1, 1, 0.8, 0.62, 0.48][forward] ?? 0.48;
  return [Math.round(color[0] * k), Math.round(color[1] * k), Math.round(color[2] * k)];
}

export function paintMonsters(fb: Framebuffer, state: GameState): void {
  const visible: Array<{ target: CombatTargetState; rect: MonsterViewRect }> = [];
  for (const target of state.combatTargets) {
    const rect = monsterViewRect(state, target);
    if (rect) visible.push({ target, rect });
  }
  if (visible.length === 0) return;
  visible.sort((a, b) => b.rect.forward - a.rect.forward);
  const vp = LAYOUT_RECTS.VIEWPORT;
  for (const { target, rect } of visible) {
    const def = monsterTypeDef(target.monster!.typeId);
    const base = shade(parseHex(def?.color ?? '#888888'), rect.forward);
    const dim = shade(base, 3);
    const ghost = def?.traits.includes('NON_MATERIAL') ?? false;
    const headH = Math.max(3, Math.floor(rect.h * 0.28));
    const bodyY = rect.y + headH;
    const bodyH = rect.h - headH;
    const put = (x: number, y: number, w: number, h: number, color: RgbColor) => {
      if (!ghost) { fb.fillRect(x, y, w, h, color); return; }
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if ((xx + yy) % 2 === 0) fb.setPixel(xx, yy, color);
    };
    put(rect.x, bodyY, rect.w, bodyH, base);
    put(rect.x + 1, bodyY + Math.floor(bodyH * 0.55), Math.max(1, rect.w - 2), Math.ceil(bodyH * 0.45), dim);
    const headW = Math.max(3, rect.w - 2);
    put(rect.x + 1, rect.y, headW, headH, base);
    const eye: RgbColor = [255, 255, 255];
    const eyeSize = rect.forward <= 2 ? 2 : 1;
    fb.fillRect(rect.x + 2, rect.y + Math.floor(headH / 3), eyeSize, eyeSize, eye);
    fb.fillRect(rect.x + headW - eyeSize, rect.y + Math.floor(headH / 3), eyeSize, eyeSize, eye);
    fb.strokeRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2, [0, 0, 0]);
    if (target.health < target.maxHealth) {
      const barW = Math.max(6, rect.w);
      const filled = Math.max(1, Math.round((barW * target.health) / target.maxHealth));
      const barX = rect.x + Math.floor((rect.w - barW) / 2);
      fb.fillRect(barX, rect.y - 4, barW, 2, [60, 0, 0]);
      fb.fillRect(barX, rect.y - 4, filled, 2, [230, 40, 40]);
    }
  }
  fb.fillRect(vp.x, vp.y + vp.h - 10, 140, 10, [0, 0, 0]);
  drawBitmapText(fb, 'PLACEHOLDER MONSTER ART', vp.x + 3, vp.y + vp.h - 8, [200, 200, 120]);
}
