/**
 * Pure contact-sheet renderer for every decoded graphics.dat sprite.
 *
 * TLDR:
 *   layoutContactSheet shelf-packs all sprites (sorted by item index) into rows no wider than
 *   maxWidth; renderContactSheet paints them into an RGBA buffer using a real 16-colour Amiga
 *   palette (palette index 0 = transparent, shown as a checkerboard) and returns per-sprite
 *   cell rectangles for hover/hit-testing. Zero DOM: the browser modal in src/ui/contactSheet.ts
 *   blits the buffer, and tests/PNG export consume the same buffer headlessly.
 */

import type { DecodedSprite, GraphicsBundle, RgbColor } from '../data/graphicsDatParser';

export interface ContactSheetOptions {
  /** Integer pixel scale applied to every sprite (default 1). */
  readonly scale?: number;
  /** Maximum sheet width in output pixels before wrapping to a new row (default 640). */
  readonly maxWidth?: number;
  /** Gap between sprites in output pixels (default 4). */
  readonly padding?: number;
}

export interface ContactSheetCell {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ContactSheetLayout {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly ContactSheetCell[];
}

export interface ContactSheetImage extends ContactSheetLayout {
  /** Row-major RGBA, length = width * height * 4. */
  readonly rgba: Uint8ClampedArray;
}

const SHEET_BG: RgbColor = [16, 20, 28];
const CHECKER_A: RgbColor = [38, 42, 52];
const CHECKER_B: RgbColor = [28, 32, 40];

function resolveOptions(opts: ContactSheetOptions): Required<ContactSheetOptions> {
  return {
    scale: Math.max(1, Math.floor(opts.scale ?? 1)),
    maxWidth: Math.max(16, Math.floor(opts.maxWidth ?? 640)),
    padding: Math.max(0, Math.floor(opts.padding ?? 4))
  };
}

function sortedSprites(bundle: GraphicsBundle): DecodedSprite[] {
  return Array.from(bundle.sprites.values())
    .filter((s) => s.width > 0 && s.height > 0)
    .sort((a, b) => a.index - b.index);
}

/**
 * Shelf-packs sprites left-to-right in index order, wrapping when the next sprite would exceed
 * maxWidth. A sprite wider than maxWidth gets its own row and widens the sheet.
 */
export function layoutContactSheet(
  bundle: GraphicsBundle,
  options: ContactSheetOptions = {}
): ContactSheetLayout {
  const { scale, maxWidth, padding } = resolveOptions(options);
  const cells: ContactSheetCell[] = [];
  let cursorX = padding;
  let cursorY = padding;
  let rowHeight = 0;
  let sheetWidth = 0;

  for (const sprite of sortedSprites(bundle)) {
    const w = sprite.width * scale;
    const h = sprite.height * scale;
    if (cursorX > padding && cursorX + w + padding > maxWidth) {
      cursorX = padding;
      cursorY += rowHeight + padding;
      rowHeight = 0;
    }
    cells.push({ index: sprite.index, x: cursorX, y: cursorY, width: w, height: h });
    cursorX += w + padding;
    rowHeight = Math.max(rowHeight, h);
    sheetWidth = Math.max(sheetWidth, cursorX);
  }

  if (cells.length === 0) {
    return { width: 0, height: 0, cells };
  }
  return { width: sheetWidth, height: cursorY + rowHeight + padding, cells };
}

function putPixel(rgba: Uint8ClampedArray, offset: number, color: RgbColor): void {
  rgba[offset] = color[0];
  rgba[offset + 1] = color[1];
  rgba[offset + 2] = color[2];
  rgba[offset + 3] = 255;
}

/**
 * Renders the contact sheet. `palette` must have 16 entries (use getUiPalette(bundle) or a
 * light ramp from bundle.lightPalettes); out-of-range indices render as the first colour.
 */
export function renderContactSheet(
  bundle: GraphicsBundle,
  palette: readonly RgbColor[],
  options: ContactSheetOptions = {}
): ContactSheetImage {
  const { scale } = resolveOptions(options);
  const layout = layoutContactSheet(bundle, options);
  const rgba = new Uint8ClampedArray(layout.width * layout.height * 4);
  for (let o = 0; o < rgba.length; o += 4) {
    putPixel(rgba, o, SHEET_BG);
  }

  const byIndex = new Map<number, DecodedSprite>();
  for (const s of bundle.sprites.values()) {
    byIndex.set(s.index, s);
  }

  for (const cell of layout.cells) {
    const sprite = byIndex.get(cell.index);
    if (!sprite) {
      continue;
    }
    for (let py = 0; py < cell.height; py++) {
      const srcY = Math.floor(py / scale);
      for (let px = 0; px < cell.width; px++) {
        const srcX = Math.floor(px / scale);
        const paletteIdx = sprite.pixels[srcY * sprite.width + srcX] ?? 0;
        let color: RgbColor;
        if (paletteIdx === 0) {
          color = ((px >> 3) + (py >> 3)) % 2 === 0 ? CHECKER_A : CHECKER_B;
        } else {
          color = palette[paletteIdx] ?? palette[0] ?? SHEET_BG;
        }
        putPixel(rgba, ((cell.y + py) * layout.width + cell.x + px) * 4, color);
      }
    }
  }

  return { ...layout, rgba };
}

/** Returns the sprite cell under (x, y) in sheet pixels, or null. */
export function hitTestContactSheet(
  layout: ContactSheetLayout,
  x: number,
  y: number
): ContactSheetCell | null {
  for (const cell of layout.cells) {
    if (x >= cell.x && x < cell.x + cell.width && y >= cell.y && y < cell.y + cell.height) {
      return cell;
    }
  }
  return null;
}
