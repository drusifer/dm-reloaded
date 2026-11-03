import { itemIconIndex } from '../data/itemCatalog';
/**
 * Depth-3 first-person pseudo-3D dungeon viewport painter (224x136 at y=33).
 *
 * TLDR:
 *   Uses exact 1988 FTL Amiga item[558] blitter coordinates for ceiling (item[76], 224x29),
 *   floor (item[75], 224x70), 3-face wall cubes (items 88, 87, 86, 85=D0L, 84=D0R, 89=D3LL/RR),
 *   pits (items 50..56), stairs (items 90..103), doors (items 77..83 & 108..119), teleporter
 *   haze, and wall features (Champion Mirrors, Sconces, Buttons, Inscriptions) with full
 *   procedural Clean-Room fallback.
 */

import { DIRECTION_DELTAS } from '../engine/types';
import { partyLightBonus } from '../engine/inventory';
import type { Direction, DungeonLevel, GameState, Tile, WallFeature } from '../engine/types';
import { extractChampionPortrait } from '../data/graphicsDatParser';
import type { DecodedSprite, GraphicsBundle, RgbColor } from '../data/graphicsDatParser';
import { drawBitmapText } from './bitmapFont';
import type { Framebuffer } from './framebuffer';
import { LAYOUT_RECTS } from './layout';
import { PALETTE_INDEX, getViewportLightPalette } from './palette';
import { createSpriteSource } from './spriteSource';

interface DepthFrustum {
  readonly leftOuterX: number;
  readonly leftInnerX: number;
  readonly rightInnerX: number;
  readonly rightOuterX: number;
  readonly topOuterY: number;
  readonly topInnerY: number;
  readonly bottomInnerY: number;
  readonly bottomOuterY: number;
}

// Viewport-local (0..224, 0..136) perspective planes aligned to FTL item[558] wall blitter rects
const FRUSTUMS: Readonly<Record<0 | 1 | 2 | 3, DepthFrustum>> = {
  0: {
    leftOuterX: 0,
    leftInnerX: 32,
    rightInnerX: 192,
    rightOuterX: 224,
    topOuterY: 0,
    topInnerY: 9,
    bottomInnerY: 120,
    bottomOuterY: 136
  },
  1: {
    leftOuterX: 32,
    leftInnerX: 60,
    rightInnerX: 164,
    rightOuterX: 192,
    topOuterY: 9,
    topInnerY: 20,
    bottomInnerY: 91,
    bottomOuterY: 120
  },
  2: {
    leftOuterX: 60,
    leftInnerX: 74,
    rightInnerX: 150,
    rightOuterX: 164,
    topOuterY: 20,
    topInnerY: 25,
    bottomInnerY: 76,
    bottomOuterY: 91
  },
  3: {
    leftOuterX: 74,
    leftInnerX: 84,
    rightInnerX: 140,
    rightOuterX: 150,
    topOuterY: 25,
    topInnerY: 29,
    bottomInnerY: 67,
    bottomOuterY: 76
  }
};

function isOpaqueWall(tile: Tile): boolean {
  if (tile.type === 'WALL') {
    return true;
  }
  if (tile.type === 'TRICK_WALL') {
    return !(tile.trickWall?.open ?? false) && !(tile.trickWall?.illusionary ?? false);
  }
  return false;
}

function getLevelTile(level: DungeonLevel, x: number, y: number): Tile {
  if (y < 0 || y >= level.height || x < 0 || x >= level.width) {
    return {
      type: 'WALL',
      rawFlags: 0,
      wallFeatures: [],
      actuators: [],
      itemNames: []
    };
  }
  return level.tiles[y]?.[x] ?? {
    type: 'WALL',
    rawFlags: 0,
    wallFeatures: [],
    actuators: [],
    itemNames: []
  };
}

function worldTileAtViewOffset(
  partyX: number,
  partyY: number,
  facing: Direction,
  forward: number,
  lateral: number
): { readonly wx: number; readonly wy: number } {
  const fwd = DIRECTION_DELTAS[facing];
  const rightDir = ((facing + 1) & 3) as Direction;
  const right = DIRECTION_DELTAS[rightDir];
  return {
    wx: partyX + fwd.dx * forward + right.dx * lateral,
    wy: partyY + fwd.dy * forward + right.dy * lateral
  };
}

function drawStoneWallRect(
  fb: Framebuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: readonly RgbColor[],
  parity: number
): void {
  if (w <= 0 || h <= 0) {
    return;
  }
  const base = palette[PALETTE_INDEX.MEDIUM_GRAY] ?? [100, 100, 100];
  const dark = palette[PALETTE_INDEX.DARK_GRAY] ?? [60, 60, 60];
  const mortar = palette[PALETTE_INDEX.DARKEST_GRAY_KEY] ?? [35, 35, 35];
  const hi = palette[PALETTE_INDEX.LIGHT_GRAY] ?? [150, 150, 150];

  fb.fillRect(x, y, w, h, base);
  fb.strokeRect(x, y, w, h, mortar);

  const courseH = Math.max(6, Math.floor(h / 4));
  for (let row = 0; row * courseH < h; row += 1) {
    const ry = y + row * courseH;
    fb.fillRect(x, ry, w, 1, mortar);
    if (ry + 1 < y + h) {
      fb.fillRect(x + 1, ry + 1, Math.max(0, w - 2), 1, hi);
    }
    const brickW = Math.max(8, Math.floor(w / 3));
    const shift = ((row + parity) & 1) === 0 ? 0 : Math.floor(brickW / 2);
    for (let bx = x + shift; bx < x + w; bx += brickW) {
      fb.fillRect(bx, ry, 1, Math.min(courseH, y + h - ry), mortar);
      if (bx + 1 < x + w) {
        fb.fillRect(bx + 1, ry + 1, 1, Math.max(0, Math.min(courseH - 2, y + h - ry - 1)), dark);
      }
    }
  }
}

function drawSideWallTrapezoid(
  fb: Framebuffer,
  vpX: number,
  vpY: number,
  side: 'LEFT' | 'RIGHT',
  frustum: DepthFrustum,
  palette: readonly RgbColor[],
  parity: number
): void {
  const xStart = side === 'LEFT' ? frustum.leftOuterX : frustum.rightInnerX;
  const xEnd = side === 'LEFT' ? frustum.leftInnerX : frustum.rightOuterX;
  const span = Math.max(1, xEnd - xStart);

  const stone = palette[PALETTE_INDEX.DARK_GRAY] ?? [70, 70, 70];
  const mortar = palette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];
  const hi = palette[PALETTE_INDEX.MEDIUM_GRAY] ?? [110, 110, 110];

  for (let dx = 0; dx < span; dx += 1) {
    const t = side === 'LEFT' ? dx / span : (span - 1 - dx) / span;
    const colTop = Math.round(frustum.topOuterY + (frustum.topInnerY - frustum.topOuterY) * t);
    const colBot = Math.round(frustum.bottomOuterY + (frustum.bottomInnerY - frustum.bottomOuterY) * t);
    const px = vpX + xStart + dx;
    const colH = Math.max(1, colBot - colTop);
    fb.fillRect(px, vpY + colTop, 1, colH, ((dx + parity) & 3) === 0 ? hi : stone);
    fb.setPixel(px, vpY + colTop, mortar);
    fb.setPixel(px, vpY + colBot - 1, mortar);
    const midY = vpY + Math.floor((colTop + colBot) / 2);
    fb.setPixel(px, midY, mortar);
  }
}

function drawWallFeatureOnFrontWall(
  fb: Framebuffer,
  feature: WallFeature,
  wallX: number,
  wallY: number,
  wallW: number,
  wallH: number,
  depth: 1 | 2 | 3,
  palette: readonly RgbColor[],
  bundle: GraphicsBundle | undefined,
  tick: number
): void {
  const cx = wallX + Math.floor(wallW / 2);
  const cy = wallY + Math.floor(wallH / 2);
  const featureKey = feature.kind === 'ALCOVE' ? 'wall.alcove'
    : feature.kind === 'FOUNTAIN' ? 'wall.fountain'
      : feature.kind === 'KEYHOLE' ? 'wall.keyhole'
        : feature.kind === 'VI_ALTAR' ? 'wall.altar' : null;
  if (featureKey) {
    const sprite = createSpriteSource(bundle).getSprite(featureKey);
    const width = Math.max(8, Math.floor(wallW * 0.38));
    const height = Math.max(8, Math.floor(wallH * 0.45));
    fb.blitSprite(sprite, cx - Math.floor(width / 2), cy - Math.floor(height / 2), palette,
      { dstWidth: width, dstHeight: height, transparentIndex: 0 }, LAYOUT_RECTS.VIEWPORT);
    return;
  }

  if (feature.kind === 'CHAMPION_MIRROR') {
    const frameW = depth === 1 ? 44 : depth === 2 ? 26 : 16;
    const frameH = depth === 1 ? 40 : depth === 2 ? 24 : 14;
    const fx = cx - Math.floor(frameW / 2);
    const fy = cy - Math.floor(frameH / 2) - (depth === 1 ? 6 : 2);
    const silver = palette[PALETTE_INDEX.LIGHT_GRAY] ?? [180, 180, 180];
    const cyan = palette[PALETTE_INDEX.CYAN] ?? [0, 180, 180];
    const dark = palette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];

    fb.drawBevelBox(fx, fy, frameW, frameH, dark, silver, dark);
    fb.fillRect(fx + 2, fy + 2, frameW - 4, frameH - 4, cyan);

    const portrait = bundle && feature.portraitIndex !== undefined
      ? extractChampionPortrait(bundle, feature.portraitIndex)
      : null;
    if (portrait) {
      fb.blitSprite(
        portrait,
        fx + 3,
        fy + 3,
        palette,
        { dstWidth: Math.max(4, frameW - 6), dstHeight: Math.max(4, frameH - 6) },
        LAYOUT_RECTS.VIEWPORT
      );
    } else if (depth === 1 && feature.text) {
      const label = feature.text.split('\n')[0] ?? 'HERO';
      drawBitmapText(
        fb,
        label.slice(0, 6),
        fx + 4,
        fy + frameH + 3,
        palette[PALETTE_INDEX.WHITE] ?? [220, 220, 220],
        bundle?.systemFont
      );
    }
    return;
  }

  if (feature.kind === 'SCONCE') {
    const bracketColor = palette[PALETTE_INDEX.DARK_BROWN] ?? [90, 45, 0];
    const woodColor = palette[PALETTE_INDEX.LIGHT_BROWN] ?? [140, 75, 0];
    const sW = depth === 1 ? 6 : 4;
    const sH = depth === 1 ? 16 : 10;
    fb.fillRect(cx - Math.floor(sW / 2), cy - 2, sW, sH, bracketColor);
    if (feature.hasTorch) {
      fb.fillRect(cx - 1, cy - 6, 3, 8, woodColor);
      const flicker = (tick & 1) === 0;
      const flameOuter = palette[PALETTE_INDEX.ORANGE] ?? [255, 160, 0];
      const flameInner = palette[PALETTE_INDEX.YELLOW] ?? [255, 255, 0];
      fb.fillRect(cx - (flicker ? 3 : 2), cy - 12, flicker ? 7 : 5, 6, flameOuter);
      fb.fillRect(cx - 1, cy - 10, 3, 4, flameInner);
    }
    return;
  }

  if (feature.kind === 'BUTTON') {
    const bSize = depth === 1 ? 10 : 6;
    fb.drawBevelBox(
      cx - Math.floor(bSize / 2),
      cy - Math.floor(bSize / 2),
      bSize,
      bSize,
      palette[PALETTE_INDEX.LIGHT_GRAY] ?? [160, 160, 160],
      palette[PALETTE_INDEX.WHITE] ?? [230, 230, 230],
      palette[PALETTE_INDEX.BLACK] ?? [0, 0, 0]
    );
    return;
  }

  if (feature.kind === 'INSCRIPTION' && feature.text && depth <= 2) {
    const lines = feature.text.split('\n').slice(0, 3);
    const textColor = palette[PALETTE_INDEX.WHITE] ?? [220, 220, 220];
    const shadowColor = palette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];
    const plaqueW = Math.min(wallW - 8, Math.max(36, Math.max(...lines.map((l) => l.length)) * 6 + 6));
    const plaqueH = lines.length * 8 + 4;
    const px = cx - Math.floor(plaqueW / 2);
    const py = cy - Math.floor(plaqueH / 2);
    fb.strokeRect(px, py, plaqueW, plaqueH, shadowColor);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? '';
      const maxChars = Math.max(1, Math.floor((wallW - 10) / 6));
      const trimmed = line.slice(0, maxChars);
      const lx = cx - Math.floor((trimmed.length * 6) / 2);
      const ly = py + 3 + i * 8;
      drawBitmapText(fb, trimmed, lx + 1, ly + 1, shadowColor, bundle?.systemFont);
      drawBitmapText(fb, trimmed, lx, ly, textColor, bundle?.systemFont);
    }
  }
}

function drawCenterTileContents(
  fb: Framebuffer,
  tile: Tile,
  depth: 0 | 1 | 2 | 3,
  partyFacing: Direction,
  vpX: number,
  vpY: number,
  palette: readonly RgbColor[],
  bundle: GraphicsBundle | undefined
): void {
  const vp = LAYOUT_RECTS.VIEWPORT;
  const f = FRUSTUMS[depth];
  const openW = f.rightInnerX - f.leftInnerX;
  const openH = f.bottomInnerY - f.topInnerY;
  const x0 = vpX + f.leftInnerX;
  const y0 = vpY + f.topInnerY;

  // 1. Floor pits (FTL item[558] offsets 4372, 4396, 4420, 4444 -> sprites 56, 54, 52, 50)
  if (tile.type === 'PIT' && tile.pit && (tile.pit.open || tile.pit.illusionary)) {
    const pitSpec = depth === 0
      ? { id: 56, dx: 16, dy: 124 }
      : depth === 1
        ? { id: 54, dx: 32, dy: 93 }
        : depth === 2
          ? { id: 52, dx: 64, dy: 77 }
          : { id: 50, dx: 64, dy: 66 };
    const pitSprite = bundle?.sprites.get(pitSpec.id);
    if (pitSprite) {
      fb.blitSprite(
        pitSprite,
        vpX + pitSpec.dx,
        vpY + pitSpec.dy,
        palette,
        { transparentIndex: PALETTE_INDEX.FLESH_KEY },
        vp
      );
    } else if (depth >= 1) {
      const pitW = Math.max(16, Math.floor(openW * 0.68));
      const pitH = depth === 1 ? 14 : depth === 2 ? 8 : 5;
      const px = vpX + Math.floor((224 - pitW) / 2);
      const py = vpY + f.bottomInnerY + 2;
      fb.fillRect(px, py, pitW, pitH, palette[PALETTE_INDEX.BLACK] ?? [0, 0, 0]);
      fb.strokeRect(px, py, pitW, pitH, palette[PALETTE_INDEX.DARK_GRAY] ?? [60, 60, 60]);
    }
  }

  // 2. Stairs Up / Down (FTL item[558] offsets 4548..4684 -> Down: 95,93,91; Up: 102,100,98)
  if (tile.type === 'STAIRS' && tile.stairs && depth >= 1) {
    const stairsSpec = tile.stairs.direction === 'DOWN'
      ? (depth === 1 ? { id: 95, dx: 32, dy: 9 } : depth === 2 ? { id: 93, dx: 64, dy: 22 } : { id: 91, dx: 64, dy: 25 })
      : (depth === 1 ? { id: 102, dx: 32, dy: 18 } : depth === 2 ? { id: 100, dx: 64, dy: 24 } : { id: 98, dx: 64, dy: 28 });
    const stairsSprite = bundle?.sprites.get(stairsSpec.id);
    if (stairsSprite) {
      fb.blitSprite(
        stairsSprite,
        vpX + stairsSpec.dx,
        vpY + stairsSpec.dy,
        palette,
        { transparentIndex: PALETTE_INDEX.FLESH_KEY },
        vp
      );
    } else {
      const stepCount = 5;
      const stepH = Math.max(2, Math.floor(openH / (stepCount + 2)));
      const dark = palette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];
      const light = palette[PALETTE_INDEX.LIGHT_GRAY] ?? [160, 160, 160];
      const mid = palette[PALETTE_INDEX.MEDIUM_GRAY] ?? [105, 105, 105];
      fb.fillRect(x0 + 4, y0 + 2, Math.max(8, openW - 8), openH - 2, dark);
      for (let s = 0; s < stepCount; s += 1) {
        const sy = tile.stairs.direction === 'UP'
          ? y0 + openH - (s + 1) * stepH
          : y0 + Math.floor(openH * 0.45) + s * Math.max(2, Math.floor(stepH * 0.6));
        const inset = s * 2;
        fb.fillRect(x0 + 4 + inset, sy, Math.max(6, openW - 8 - inset * 2), 2, light);
        fb.fillRect(x0 + 4 + inset, sy + 2, Math.max(6, openW - 8 - inset * 2), Math.max(1, stepH - 2), mid);
      }
    }
  }

  // 3. Doors (FTL item[558] offsets 3412..3964 for crosswise slabs, 4060/4084 for lintels 82/83,
  //    4108..4155 for 3D stone doorjambs 78/79/80, and 4100 for depth-1 parallel doorway track 77)
  if (tile.type === 'DOOR' && tile.door && depth >= 1) {
    const facingNorthSouth = partyFacing === 0 || partyFacing === 2;
    const isCrosswise = facingNorthSouth
      ? tile.door.orientation === 'WEST_EAST'
      : tile.door.orientation === 'NORTH_SOUTH';

    if (!isCrosswise) {
      // Edge-on parallel doorway slot at depth 1 only (item[558] off=4100 -> sprite 77, 32x123 at x=96, y=0)
      if (depth === 1) {
        const edgeSprite = bundle?.sprites.get(77);
        if (edgeSprite) {
          fb.blitSprite(
            edgeSprite,
            vpX + 96,
            vpY,
            palette,
            { transparentIndex: PALETTE_INDEX.FLESH_KEY },
            vp
          );
        }
      }
    } else {
      // Crosswise doorway spanning across the hallway ahead
      const doorGeom = depth === 1
        ? {
            slabX: 64,
            slabY: 17,
            slabW: 96,
            fullH: 86,
            jambW: 12,
            jambId: 78,
            leftJambX: 43,
            rightJambX: 149,
            jambY: 14,
            lintelId: 82,
            lintelX: 48,
            lintelY: 14
          }
        : depth === 2
          ? {
              slabX: 80,
              slabY: 24,
              slabW: 64,
              fullH: 59,
              jambW: 8,
              jambId: 79,
              leftJambX: 48,
              rightJambX: 128,
              jambY: 22,
              lintelId: 83,
              lintelX: 64,
              lintelY: 22
            }
          : {
              slabX: 88,
              slabY: 28,
              slabW: 48,
              fullH: 40,
              jambW: 5,
              jambId: 80,
              leftJambX: 64,
              rightJambX: 128,
              jambY: 27,
              lintelId: 0,
              lintelX: 83,
              lintelY: 26
            };

      // 3a. Door slab first so 3D stone jamb grooves & lintel overhang cleanly frame its edges
      const progress = tile.door.progress;
      if (progress > 0) {
        const doorSpriteId = tile.door.material === 'IRON_GRATE'
          ? (depth === 3 ? 108 : depth === 2 ? 109 : 110)
          : tile.door.material === 'WOODEN'
            ? (depth === 3 ? 111 : depth === 2 ? 112 : 113)
            : tile.door.material === 'METAL'
              ? (depth === 3 ? 114 : depth === 2 ? 115 : 116)
              : (depth === 3 ? 117 : depth === 2 ? 118 : 119);
        const doorSprite = bundle?.sprites.get(doorSpriteId);

        if (doorSprite) {
          if (tile.door.opensHorizontally && progress >= 1 && progress <= 3) {
            // Double-sliding horizontal door halves (FTL item[558] offsets 3444..3484, 3684..3724, 3924..3964)
            const stepW = depth === 1 ? 12 : depth === 2 ? 8 : 6;
            const halfW = stepW * progress;
            const midSrcX = Math.floor(doorSprite.width / 2);
            fb.blitSprite(
              doorSprite,
              vpX + doorGeom.slabX,
              vpY + doorGeom.slabY,
              palette,
              {
                transparentIndex: PALETTE_INDEX.FLESH_KEY,
                srcX: Math.max(0, midSrcX - halfW),
                srcWidth: halfW,
                srcHeight: Math.min(doorSprite.height, doorGeom.fullH),
                dstWidth: halfW,
                dstHeight: doorGeom.fullH
              },
              vp
            );
            fb.blitSprite(
              doorSprite,
              vpX + doorGeom.slabX + doorGeom.slabW - halfW,
              vpY + doorGeom.slabY,
              palette,
              {
                transparentIndex: PALETTE_INDEX.FLESH_KEY,
                srcX: midSrcX,
                srcWidth: halfW,
                srcHeight: Math.min(doorSprite.height, doorGeom.fullH),
                dstWidth: halfW,
                dstHeight: doorGeom.fullH
              },
              vp
            );
          } else {
            const closedFraction = progress === 5 ? 1 : progress / 4;
            const slabH = Math.max(2, Math.round(doorGeom.fullH * closedFraction));
            const srcCropY = Math.max(0, doorSprite.height - Math.round(doorSprite.height * closedFraction));
            const smashMask = progress === 5 ? bundle?.sprites.get(301) : undefined;

            if (smashMask) {
              // Bashed door: skip pixels where FTL smash mask item[301] is 0 (black breach hole) so corridor shows through
              const visibleH = Math.min(doorSprite.height - srcCropY, slabH);
              for (let row = 0; row < visibleH; row += 1) {
                const maskY = Math.min(smashMask.height - 1, Math.floor((row * smashMask.height) / visibleH));
                for (let col = 0; col < doorGeom.slabW; col += 1) {
                  const maskX = Math.min(smashMask.width - 1, Math.floor((col * smashMask.width) / doorGeom.slabW));
                  if (smashMask.pixels[maskY * smashMask.width + maskX] === 0) {
                    continue;
                  }
                  const srcX = Math.min(doorSprite.width - 1, Math.floor((col * doorSprite.width) / doorGeom.slabW));
                  const colorIdx = doorSprite.pixels[(srcCropY + row) * doorSprite.width + srcX] ?? PALETTE_INDEX.FLESH_KEY;
                  if (colorIdx !== PALETTE_INDEX.FLESH_KEY) {
                    fb.setPixel(
                      vpX + doorGeom.slabX + col,
                      vpY + doorGeom.slabY + row,
                      palette[colorIdx] ?? [0, 0, 0]
                    );
                  }
                }
              }
            } else {
              fb.blitSprite(
                doorSprite,
                vpX + doorGeom.slabX,
                vpY + doorGeom.slabY,
                palette,
                {
                  transparentIndex: PALETTE_INDEX.FLESH_KEY,
                  srcY: srcCropY,
                  srcHeight: Math.min(doorSprite.height - srcCropY, slabH),
                  dstWidth: doorGeom.slabW,
                  dstHeight: slabH
                },
                vp
              );
            }
          }
        } else {
          const closedFraction = progress === 5 ? 1 : progress / 4;
          const slabH = Math.max(2, Math.round(doorGeom.fullH * closedFraction));
          if (tile.door.material === 'WOODEN') {
            const wood = palette[PALETTE_INDEX.LIGHT_BROWN] ?? [146, 73, 0];
            const darkWood = palette[PALETTE_INDEX.DARK_BROWN] ?? [90, 36, 0];
            fb.fillRect(vpX + doorGeom.slabX, vpY + doorGeom.slabY, doorGeom.slabW, slabH, wood);
            for (let px = vpX + doorGeom.slabX + 6; px < vpX + doorGeom.slabX + doorGeom.slabW; px += 8) {
              fb.fillRect(px, vpY + doorGeom.slabY, 1, slabH, darkWood);
            }
            fb.fillRect(vpX + doorGeom.slabX, vpY + doorGeom.slabY + slabH - 2, doorGeom.slabW, 2, darkWood);
          } else if (tile.door.material === 'IRON_GRATE' || tile.door.material === 'METAL') {
            const iron = palette[PALETTE_INDEX.LIGHT_GRAY] ?? [160, 160, 160];
            const barStep = depth === 1 ? 8 : 5;
            for (let px = vpX + doorGeom.slabX + 3; px < vpX + doorGeom.slabX + doorGeom.slabW - 2; px += barStep) {
              fb.fillRect(px, vpY + doorGeom.slabY, 2, slabH, iron);
            }
            for (let py = vpY + doorGeom.slabY + 6; py < vpY + doorGeom.slabY + slabH; py += barStep * 2) {
              fb.fillRect(vpX + doorGeom.slabX, py, doorGeom.slabW, 2, iron);
            }
          } else {
            const magic = palette[PALETTE_INDEX.CYAN] ?? [0, 200, 200];
            fb.fillDitherRect(vpX + doorGeom.slabX, vpY + doorGeom.slabY, doorGeom.slabW, slabH, magic);
          }
        }
      }

      // 3b. Authentic 3D stone doorjambs (sprites 78, 79, 80) and top lintels (sprites 82, 83)
      const frameDark = palette[PALETTE_INDEX.DARK_GRAY] ?? [72, 72, 72];
      const frameLight = palette[PALETTE_INDEX.LIGHT_GRAY] ?? [155, 155, 155];
      const frameBorder = palette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];

      const jambSprite = bundle?.sprites.get(doorGeom.jambId);
      if (jambSprite) {
        fb.blitSprite(
          jambSprite,
          vpX + doorGeom.leftJambX,
          vpY + doorGeom.jambY,
          palette,
          { transparentIndex: PALETTE_INDEX.FLESH_KEY, flipX: false },
          vp
        );
        fb.blitSprite(
          jambSprite,
          vpX + doorGeom.rightJambX,
          vpY + doorGeom.jambY,
          palette,
          { transparentIndex: PALETTE_INDEX.FLESH_KEY, flipX: true },
          vp
        );
      } else {
        fb.drawBevelBox(
          vpX + doorGeom.slabX - doorGeom.jambW,
          vpY + doorGeom.slabY - 2,
          doorGeom.jambW,
          doorGeom.fullH + 4,
          frameDark,
          frameLight,
          frameBorder
        );
        fb.drawBevelBox(
          vpX + doorGeom.slabX + doorGeom.slabW,
          vpY + doorGeom.slabY - 2,
          doorGeom.jambW,
          doorGeom.fullH + 4,
          frameDark,
          frameLight,
          frameBorder
        );
      }

      const lintelSprite = doorGeom.lintelId > 0 ? bundle?.sprites.get(doorGeom.lintelId) : undefined;
      if (lintelSprite) {
        fb.blitSprite(
          lintelSprite,
          vpX + doorGeom.lintelX,
          vpY + doorGeom.lintelY,
          palette,
          { transparentIndex: PALETTE_INDEX.FLESH_KEY },
          vp
        );
      } else if (!jambSprite) {
        fb.drawBevelBox(
          vpX + doorGeom.slabX - doorGeom.jambW,
          vpY + doorGeom.slabY - 4,
          doorGeom.slabW + doorGeom.jambW * 2,
          4,
          frameDark,
          frameLight,
          frameBorder
        );
      }

      // 3c. Authentic door push-button (sprite 315, 16x9) mounted on right stone doorjamb
      if (tile.door.hasButton && depth <= 2) {
        const btnSprite = bundle?.sprites.get(315);
        if (btnSprite) {
          const btnX = depth === 1 ? 163 : 146;
          const btnY = depth === 1 ? 48 : 44;
          const btnW = depth === 1 ? 16 : 10;
          const btnH = depth === 1 ? 9 : 6;
          fb.blitSprite(
            btnSprite,
            vpX + btnX,
            vpY + btnY,
            palette,
            { transparentIndex: PALETTE_INDEX.FLESH_KEY, dstWidth: btnW, dstHeight: btnH },
            vp
          );
        } else {
          const btnW = depth === 1 ? 6 : 4;
          const btnH = depth === 1 ? 8 : 5;
          fb.drawBevelBox(
            vpX + doorGeom.slabX + doorGeom.slabW + Math.max(1, Math.floor((doorGeom.jambW - btnW) / 2)),
            vpY + doorGeom.slabY + Math.floor(doorGeom.fullH * 0.42),
            btnW,
            btnH,
            palette[PALETTE_INDEX.LIGHT_BROWN] ?? [150, 90, 20],
            palette[PALETTE_INDEX.YELLOW] ?? [220, 200, 50],
            frameBorder
          );
        }
      }
    }
  }

  // 4. Blue Teleporter Haze (visible at depths 0..3 when active & visibleHaze)
  if (tile.type === 'TELEPORTER' && tile.teleporter?.active && tile.teleporter.visibleHaze) {
    const cyan = palette[PALETTE_INDEX.CYAN] ?? [0, 219, 219];
    const blue = palette[PALETTE_INDEX.BLUE] ?? [0, 0, 255];
    for (let py = y0; py < y0 + openH; py += 2) {
      for (let px = x0; px < x0 + openW; px += 2) {
        if (((px + py) & 2) === 0) {
          fb.setPixel(px, py, cyan);
        } else {
          fb.setPixel(px + 1, py, blue);
        }
      }
    }
  }
}

/** Draw objects within their tile's painter pass, so nearer walls occlude them. */
function paintTileItems(
  fb: Framebuffer, state: GameState, tile: Tile, depth: 0 | 1 | 2 | 3,
  wx: number, wy: number, palette: readonly RgbColor[], bundle?: GraphicsBundle
): void {
  const source = createSpriteSource(bundle);
  const vp = LAYOUT_RECTS.VIEWPORT;
  const oppositeFace = ((state.party.facing + 2) & 3) as Direction;
  const size = [24, 18, 11, 7][depth]!;
  const floorY = [131, 110, 86, 73][depth]!;
  const spread = [53, 35, 23, 15][depth]!;
  const draw = (id: string, x: number, y: number, stack: number) => {
    const item = state.items[id];
    if (!item) return;
    fb.blitSprite(source.getSprite(`item.icon.${itemIconIndex(item)}`),
      vp.x + x - Math.floor(size / 2) + (stack % 3), vp.y + y - size - Math.floor(stack / 3),
      palette, { dstWidth: size, dstHeight: size, transparentIndex: 0 }, vp);
  };
  if (isOpaqueWall(tile)) {
    if (!tile.wallFeatures.some(feature => feature.face === oppositeFace
      && (feature.kind === 'ALCOVE' || feature.kind === 'VI_ALTAR'))) return;
    (tile.wallItems?.[oppositeFace] ?? []).forEach((id, index) => draw(id, 112, floorY - size, index));
    return;
  }
  // Quadrants are NW, NE, SE, SW in world space; rotate into the viewer's frame.
  for (const quadrant of [0, 1, 2, 3] as const) {
    const relative = (quadrant - state.party.facing + 4) % 4;
    if (depth === 0 && relative >= 2) continue;
    const left = relative === 0 || relative === 3;
    const far = relative < 2;
    const door = tile.door;
    const crosswise = door && (state.party.facing % 2 === 0
      ? door.orientation === 'WEST_EAST' : door.orientation === 'NORTH_SOUTH');
    // The slab lies at the tile midpoint: the far floor quadrants are behind it.
    if (far && crosswise && door?.progress === 4 && door.material !== 'IRON_GRATE') continue;
    const y = floorY - (far ? Math.max(2, Math.floor(size * 0.4)) : 0);
    (tile.floorItems?.[quadrant] ?? []).forEach((id, index) => draw(id, 112 + (left ? -spread : spread), y, index));
  }
  for (const projectile of state.projectiles) {
    if (projectile.level === state.party.level && projectile.x === wx && projectile.y === wy) {
      // Lane belongs to travel direction; an approaching throw swaps screen sides.
      const relativeDirection = (projectile.direction - state.party.facing + 4) % 4;
      const horizontalProjection = [1, 0, -1, 0][relativeDirection]!;
      draw(projectile.itemId, 112 + (projectile.lane === 'LEFT' ? -spread : spread) * horizontalProjection, floorY - size, 0);
    }
  }
}

/** Project a sprite into a side-wall plane; vertical edges converge with the corridor. */
function blitSideWallSprite(
  fb: Framebuffer,
  sprite: DecodedSprite,
  palette: readonly RgbColor[],
  depth: 0 | 1 | 2 | 3,
  side: 'LEFT' | 'RIGHT',
  area: { readonly u0: number; readonly u1: number; readonly v0: number; readonly v1: number }
): void {
  const frustum = FRUSTUMS[depth];
  const vp = LAYOUT_RECTS.VIEWPORT;
  const nearX = side === 'LEFT' ? frustum.leftOuterX : frustum.rightOuterX;
  const farX = side === 'LEFT' ? frustum.leftInnerX : frustum.rightInnerX;
  const width = Math.abs(farX - nearX);
  for (let step = Math.ceil(width * area.u0); step < width * area.u1; step++) {
    const u = step / width;
    const x = vp.x + nearX + (side === 'LEFT' ? step : -1 - step);
    const top = vp.y + frustum.topOuterY + u * (frustum.topInnerY - frustum.topOuterY);
    const bottom = vp.y + frustum.bottomOuterY + u * (frustum.bottomInnerY - frustum.bottomOuterY);
    const y0 = top + area.v0 * (bottom - top);
    const y1 = top + area.v1 * (bottom - top);
    // Reversing screen-x on the right mirrors the same near-to-far sprite samples.
    const sx = Math.min(sprite.width - 1, Math.floor((u - area.u0) / (area.u1 - area.u0) * sprite.width));
    for (let y = Math.ceil(y0); y < y1; y++) {
      const sy = Math.min(sprite.height - 1, Math.floor((y - y0) / (y1 - y0) * sprite.height));
      const colorIndex = sprite.pixels[sy * sprite.width + sx] ?? 0;
      if (colorIndex !== 0) fb.setPixel(x, y, palette[colorIndex] ?? [0, 0, 0]);
    }
  }
}

/** Side wall faces point into the corridor; paint before nearer center walls occlude them. */
function paintSideWallFeatures(
  fb: Framebuffer,
  state: GameState,
  tile: Tile,
  depth: 0 | 1 | 2 | 3,
  side: 'LEFT' | 'RIGHT',
  palette: readonly RgbColor[],
  bundle?: GraphicsBundle
): void {
  if (!isOpaqueWall(tile)) return;
  const face = ((state.party.facing + (side === 'LEFT' ? 1 : 3)) & 3) as Direction;
  const source = createSpriteSource(bundle);
  let shelf = false;
  for (const feature of tile.wallFeatures) {
    if (feature.face !== face) continue;
    const key = feature.kind === 'ALCOVE' ? 'wall.alcove'
      : feature.kind === 'FOUNTAIN' ? 'wall.fountain'
        : feature.kind === 'KEYHOLE' ? 'wall.keyhole'
          : feature.kind === 'VI_ALTAR' ? 'wall.altar' : null;
    if (!key) continue;
    blitSideWallSprite(fb, source.getSprite(key), palette, depth, side,
      { u0: 0.12, u1: 0.88, v0: 0.28, v1: 0.72 });
    shelf ||= feature.kind === 'ALCOVE' || feature.kind === 'VI_ALTAR';
  }
  if (!shelf) return;
  (tile.wallItems?.[face] ?? []).forEach((id, index) => {
    const item = state.items[id];
    if (!item) return;
    const offset = (index % 3) * 0.04;
    blitSideWallSprite(fb, source.getSprite(`item.icon.${itemIconIndex(item)}`), palette, depth, side,
      { u0: 0.26 + offset, u1: 0.74 + offset, v0: 0.46 - Math.floor(index / 3) * 0.015, v1: 0.65 });
  });
}

export function paintDungeonViewport(
  fb: Framebuffer,
  state: GameState,
  bundle?: GraphicsBundle
): void {
  const vp = LAYOUT_RECTS.VIEWPORT;
  const level = state.levels[state.party.level];
  if (!level) {
    fb.fillRect(vp.x, vp.y, vp.w, vp.h, [0, 0, 0]);
    return;
  }

  const effectiveLight = Math.max(0, Math.min(5, level.ambientLight + partyLightBonus(state)));
  if (effectiveLight <= 0) {
    // Pitch-black dungeon when unlit (Story 1.1 AC)
    fb.fillRect(vp.x, vp.y, vp.w, vp.h, [0, 0, 0]);
    return;
  }

  const nearPalette = getViewportLightPalette(effectiveLight, 0, bundle);
  const flipParity = state.party.stepParity === 1;

  // 1. Dark horizon backdrop (y=29..65 when corridor is open past depth 3)
  fb.fillRect(vp.x, vp.y, vp.w, vp.h, nearPalette[PALETTE_INDEX.BLACK] ?? [0, 0, 0]);

  // 2. Authentic FTL Ceiling (item[76], 224x29 at y=0..28) & Flagstone Floor (item[75], 224x70 at y=66..135)
  const ceilingSprite = bundle?.sprites.get(76);
  const floorSprite = bundle?.sprites.get(75);
  if (ceilingSprite) {
    fb.blitSprite(ceilingSprite, vp.x, vp.y, nearPalette, { flipX: flipParity }, vp);
  } else {
    fb.fillRect(vp.x, vp.y, vp.w, 29, nearPalette[PALETTE_INDEX.DARKEST_GRAY_KEY] ?? [36, 36, 36]);
  }

  if (floorSprite) {
    fb.blitSprite(floorSprite, vp.x, vp.y + vp.h - floorSprite.height, nearPalette, { flipX: flipParity }, vp);
  } else {
    fb.fillDitherRect(
      vp.x,
      vp.y + 66,
      vp.w,
      70,
      nearPalette[PALETTE_INDEX.DARK_GRAY] ?? [73, 73, 73],
      nearPalette[PALETTE_INDEX.DARKEST_GRAY_KEY] ?? [36, 36, 36]
    );
  }

  const oppositeFace = ((state.party.facing + 2) & 3) as Direction;

  // 3. Painter's algorithm from depth 3 back to depth 0 using exact FTL item[558] blitter rects
  for (const depth of [3, 2, 1, 0] as const) {
    const palette = getViewportLightPalette(effectiveLight, depth, bundle);
    const frustum = FRUSTUMS[depth];

    // Far-outer corners at depth 3 (D3LL at lateral=-2, D3RR at lateral=+2 -> item[89], 16x49)
    if (depth === 3) {
      const farLeftCoords = worldTileAtViewOffset(state.party.x, state.party.y, state.party.facing, 3, -2);
      const farRightCoords = worldTileAtViewOffset(state.party.x, state.party.y, state.party.facing, 3, 2);
      const farCornerSprite = bundle?.sprites.get(89);

      if (isOpaqueWall(getLevelTile(level, farLeftCoords.wx, farLeftCoords.wy)) && farCornerSprite) {
        fb.blitSprite(
          farCornerSprite,
          vp.x,
          vp.y + 25,
          palette,
          { transparentIndex: PALETTE_INDEX.FLESH_KEY, flipX: false },
          vp
        );
      }
      if (isOpaqueWall(getLevelTile(level, farRightCoords.wx, farRightCoords.wy)) && farCornerSprite) {
        fb.blitSprite(
          farCornerSprite,
          vp.x + 208,
          vp.y + 25,
          palette,
          { transparentIndex: PALETTE_INDEX.FLESH_KEY, flipX: true },
          vp
        );
      }
    }

    const leftCoords = worldTileAtViewOffset(state.party.x, state.party.y, state.party.facing, depth, -1);
    const rightCoords = worldTileAtViewOffset(state.party.x, state.party.y, state.party.facing, depth, 1);
    const centerCoords = worldTileAtViewOffset(state.party.x, state.party.y, state.party.facing, depth, 0);

    const leftTile = getLevelTile(level, leftCoords.wx, leftCoords.wy);
    const rightTile = getLevelTile(level, rightCoords.wx, rightCoords.wy);
    const centerTile = getLevelTile(level, centerCoords.wx, centerCoords.wy);

    // Left flanking wall cube (D3L=88[32..115], D2L=87[61..135], D1L=86[192..255], D0L=85[0..31])
    if (isOpaqueWall(leftTile)) {
      if (depth === 0) {
        const d0l = bundle?.sprites.get(85);
        if (d0l) {
          fb.blitSprite(d0l, vp.x, vp.y, palette, { transparentIndex: PALETTE_INDEX.FLESH_KEY }, vp);
        } else {
          drawSideWallTrapezoid(fb, vp.x, vp.y, 'LEFT', frustum, palette, state.party.stepParity);
        }
      } else {
        const cubeSpec = depth === 1
          ? { id: 86, dstX: 0, dstY: 9, w: 64, h: 111, srcX: 192 }
          : depth === 2
            ? { id: 87, dstX: 0, dstY: 20, w: 75, h: 71, srcX: 61 }
            : { id: 88, dstX: 0, dstY: 25, w: 84, h: 51, srcX: 32 };
        const cubeSprite = bundle?.sprites.get(cubeSpec.id);
        if (cubeSprite) {
          fb.blitSprite(
            cubeSprite,
            vp.x + cubeSpec.dstX,
            vp.y + cubeSpec.dstY,
            palette,
            {
              transparentIndex: PALETTE_INDEX.FLESH_KEY,
              srcX: cubeSpec.srcX,
              srcWidth: cubeSpec.w,
              dstWidth: cubeSpec.w,
              dstHeight: cubeSpec.h
            },
            vp
          );
        } else {
          drawStoneWallRect(
            fb,
            vp.x,
            vp.y + frustum.topOuterY,
            frustum.leftOuterX,
            frustum.bottomOuterY - frustum.topOuterY,
            palette,
            state.party.stepParity + depth
          );
          drawSideWallTrapezoid(fb, vp.x, vp.y, 'LEFT', frustum, palette, state.party.stepParity + depth);
        }
      }
    }

    // Right flanking wall cube (D3R=88[0..84], D2R=87[0..74], D1R=86[0..63], D0R=84[0..31])
    if (isOpaqueWall(rightTile)) {
      if (depth === 0) {
        const d0r = bundle?.sprites.get(84);
        if (d0r) {
          fb.blitSprite(d0r, vp.x + 192, vp.y, palette, { transparentIndex: PALETTE_INDEX.FLESH_KEY }, vp);
        } else {
          drawSideWallTrapezoid(fb, vp.x, vp.y, 'RIGHT', frustum, palette, state.party.stepParity);
        }
      } else {
        const cubeSpec = depth === 1
          ? { id: 86, dstX: 160, dstY: 9, w: 64, h: 111, srcX: 0 }
          : depth === 2
            ? { id: 87, dstX: 149, dstY: 20, w: 75, h: 71, srcX: 0 }
            : { id: 88, dstX: 139, dstY: 25, w: 85, h: 51, srcX: 0 };
        const cubeSprite = bundle?.sprites.get(cubeSpec.id);
        if (cubeSprite) {
          fb.blitSprite(
            cubeSprite,
            vp.x + cubeSpec.dstX,
            vp.y + cubeSpec.dstY,
            palette,
            {
              transparentIndex: PALETTE_INDEX.FLESH_KEY,
              srcX: cubeSpec.srcX,
              srcWidth: cubeSpec.w,
              dstWidth: cubeSpec.w,
              dstHeight: cubeSpec.h
            },
            vp
          );
        } else {
          drawStoneWallRect(
            fb,
            vp.x + frustum.rightOuterX,
            vp.y + frustum.topOuterY,
            224 - frustum.rightOuterX,
            frustum.bottomOuterY - frustum.topOuterY,
            palette,
            state.party.stepParity + depth
          );
          drawSideWallTrapezoid(fb, vp.x, vp.y, 'RIGHT', frustum, palette, state.party.stepParity + depth);
        }
      }
    }

    paintSideWallFeatures(fb, state, leftTile, depth, 'LEFT', palette, bundle);
    paintSideWallFeatures(fb, state, rightTile, depth, 'RIGHT', palette, bundle);

    // Center wall (D3C=88, D2C=87, D1C=86) or open tile contents (pits, stairs, doors, teleporters)
    if ((depth === 1 || depth === 2 || depth === 3) && isOpaqueWall(centerTile)) {
      const centerSpec = depth === 1
        ? { id: 86, dstX: 32, dstY: 9, w: 160, h: 111, srcX: flipParity ? 32 : 48 }
        : depth === 2
          ? { id: 87, dstX: 60, dstY: 20, w: 104, h: 71, srcX: flipParity ? 17 : 16 }
          : { id: 88, dstX: 74, dstY: 25, w: 76, h: 51, srcX: flipParity ? 22 : 18 };

      const wallX = vp.x + centerSpec.dstX;
      const wallY = vp.y + centerSpec.dstY;
      const wallW = centerSpec.w;
      const wallH = centerSpec.h;
      const frontSprite = bundle?.sprites.get(centerSpec.id);

      if (frontSprite) {
        fb.blitSprite(
          frontSprite,
          wallX,
          wallY,
          palette,
          {
            transparentIndex: PALETTE_INDEX.FLESH_KEY,
            srcX: centerSpec.srcX,
            srcWidth: wallW,
            dstWidth: wallW,
            dstHeight: wallH
          },
          vp
        );
      } else {
        drawStoneWallRect(fb, wallX, wallY, wallW, wallH, palette, state.party.stepParity + depth);
      }

      // Draw features mounted on the face pointing back toward the party
      for (const feat of centerTile.wallFeatures) {
        if (feat.face === oppositeFace) {
          drawWallFeatureOnFrontWall(fb, feat, wallX, wallY, wallW, wallH, depth, palette, bundle, state.tick);
        }
      }
    } else {
      drawCenterTileContents(fb, centerTile, depth, state.party.facing, vp.x, vp.y, palette, bundle);
    }
    paintTileItems(fb, state, centerTile, depth, centerCoords.wx, centerCoords.wy, palette, bundle);
  }
}
