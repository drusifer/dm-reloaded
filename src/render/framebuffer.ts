/**
 * Canonical 320x200 Amiga RGBA framebuffer and integer-scaled HTML5 Canvas presenter.
 *
 * TLDR:
 *   Provides a pure Uint8ClampedArray (320x200x4) offscreen pixel buffer with rectangle,
 *   line, dither, and 4bpp sprite blitting (supporting transparency, cropping, scaling,
 *   and horizontal parity flipping), plus crisp nearest-neighbor Canvas presentation.
 */

import type { DecodedSprite, RgbColor } from '../data/graphicsDatParser';

export const FRAMEBUFFER_WIDTH = 320;
export const FRAMEBUFFER_HEIGHT = 200;

export interface BlitOptions {
  readonly transparentIndex?: number;
  readonly flipX?: boolean;
  readonly dstWidth?: number;
  readonly dstHeight?: number;
  readonly srcX?: number;
  readonly srcY?: number;
  readonly srcWidth?: number;
  readonly srcHeight?: number;
}

export interface CanvasPresentationRect {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly drawWidth: number;
  readonly drawHeight: number;
  readonly scale: number;
}

export class Framebuffer {
  public readonly width = FRAMEBUFFER_WIDTH;
  public readonly height = FRAMEBUFFER_HEIGHT;
  public readonly rgba: Uint8ClampedArray;

  public constructor() {
    this.rgba = new Uint8ClampedArray(this.width * this.height * 4);
    this.clear([0, 0, 0]);
  }

  public clear(rgb: RgbColor = [0, 0, 0]): void {
    const [r, g, b] = rgb;
    for (let i = 0; i < this.rgba.length; i += 4) {
      this.rgba[i] = r;
      this.rgba[i + 1] = g;
      this.rgba[i + 2] = b;
      this.rgba[i + 3] = 255;
    }
  }

  public setPixel(x: number, y: number, rgb: RgbColor): void {
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
      return;
    }
    const idx = (iy * this.width + ix) * 4;
    this.rgba[idx] = rgb[0];
    this.rgba[idx + 1] = rgb[1];
    this.rgba[idx + 2] = rgb[2];
    this.rgba[idx + 3] = 255;
  }

  public getPixel(x: number, y: number): RgbColor {
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
      return [0, 0, 0];
    }
    const idx = (iy * this.width + ix) * 4;
    return [this.rgba[idx] ?? 0, this.rgba[idx + 1] ?? 0, this.rgba[idx + 2] ?? 0];
  }

  public fillRect(x: number, y: number, w: number, h: number, rgb: RgbColor): void {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.width, (x + w) | 0);
    const y1 = Math.min(this.height, (y + h) | 0);
    const [r, g, b] = rgb;

    for (let py = y0; py < y1; py += 1) {
      let idx = (py * this.width + x0) * 4;
      for (let px = x0; px < x1; px += 1) {
        this.rgba[idx] = r;
        this.rgba[idx + 1] = g;
        this.rgba[idx + 2] = b;
        this.rgba[idx + 3] = 255;
        idx += 4;
      }
    }
  }

  public fillDitherRect(
    x: number,
    y: number,
    w: number,
    h: number,
    rgbEven: RgbColor,
    rgbOdd?: RgbColor
  ): void {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.width, (x + w) | 0);
    const y1 = Math.min(this.height, (y + h) | 0);

    for (let py = y0; py < y1; py += 1) {
      for (let px = x0; px < x1; px += 1) {
        const even = ((px + py) & 1) === 0;
        if (even) {
          this.setPixel(px, py, rgbEven);
        } else if (rgbOdd) {
          this.setPixel(px, py, rgbOdd);
        }
      }
    }
  }

  public strokeRect(x: number, y: number, w: number, h: number, rgb: RgbColor): void {
    if (w <= 0 || h <= 0) return;
    this.fillRect(x, y, w, 1, rgb);
    this.fillRect(x, y + h - 1, w, 1, rgb);
    this.fillRect(x, y, 1, h, rgb);
    this.fillRect(x + w - 1, y, 1, h, rgb);
  }

  public drawBevelBox(
    x: number,
    y: number,
    w: number,
    h: number,
    fill: RgbColor,
    highlight: RgbColor,
    shadow: RgbColor
  ): void {
    this.fillRect(x, y, w, h, fill);
    this.fillRect(x, y, w, 1, highlight);
    this.fillRect(x, y, 1, h, highlight);
    this.fillRect(x, y + h - 1, w, 1, shadow);
    this.fillRect(x + w - 1, y, 1, h, shadow);
  }

  public drawLine(x0: number, y0: number, x1: number, y1: number, rgb: RgbColor): void {
    let cx = x0 | 0;
    let cy = y0 | 0;
    const tx = x1 | 0;
    const ty = y1 | 0;
    const dx = Math.abs(tx - cx);
    const sx = cx < tx ? 1 : -1;
    const dy = -Math.abs(ty - cy);
    const sy = cy < ty ? 1 : -1;
    let err = dx + dy;

    for (;;) {
      this.setPixel(cx, cy, rgb);
      if (cx === tx && cy === ty) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        cx += sx;
      }
      if (e2 <= dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  /**
   * Blits a decoded 4bpp Amiga sprite onto the framebuffer using the supplied 16-color palette,
   * optionally clipped to a viewport rectangle.
   */
  public blitSprite(
    sprite: DecodedSprite,
    dstX: number,
    dstY: number,
    palette: readonly RgbColor[],
    options: BlitOptions = {},
    clipRect?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
  ): void {
    const srcX = options.srcX ?? 0;
    const srcY = options.srcY ?? 0;
    const srcW = options.srcWidth ?? sprite.width - srcX;
    const srcH = options.srcHeight ?? sprite.height - srcY;
    const dstW = options.dstWidth ?? srcW;
    const dstH = options.dstHeight ?? srcH;
    if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
      return;
    }

    const clipX0 = clipRect ? Math.max(0, clipRect.x) : 0;
    const clipY0 = clipRect ? Math.max(0, clipRect.y) : 0;
    const clipX1 = clipRect ? Math.min(this.width, clipRect.x + clipRect.w) : this.width;
    const clipY1 = clipRect ? Math.min(this.height, clipRect.y + clipRect.h) : this.height;

    const transparent = options.transparentIndex;
    const flipX = options.flipX === true;

    for (let dy = 0; dy < dstH; dy += 1) {
      const py = (dstY + dy) | 0;
      if (py < clipY0 || py >= clipY1) continue;
      const sy = srcY + Math.min(srcH - 1, Math.floor((dy * srcH) / dstH));
      if (sy < 0 || sy >= sprite.height) continue;
      const rowOffset = sy * sprite.width;

      for (let dx = 0; dx < dstW; dx += 1) {
        const px = (dstX + dx) | 0;
        if (px < clipX0 || px >= clipX1) continue;
        const mappedDx = flipX ? dstW - 1 - dx : dx;
        const sx = srcX + Math.min(srcW - 1, Math.floor((mappedDx * srcW) / dstW));
        if (sx < 0 || sx >= sprite.width) continue;

        const colorIndex = sprite.pixels[rowOffset + sx] ?? 0;
        if (transparent !== undefined && colorIndex === transparent) {
          continue;
        }
        const rgb = palette[colorIndex] ?? [0, 0, 0];
        this.setPixel(px, py, rgb);
      }
    }
  }
}

/**
 * Computes the crisp integer-scaled letterbox rectangle for presenting 320x200 inside a host element.
 */
export function computeCanvasPresentationRect(clientWidth: number, clientHeight: number): CanvasPresentationRect {
  const safeW = Math.max(FRAMEBUFFER_WIDTH, Math.floor(clientWidth));
  const safeH = Math.max(FRAMEBUFFER_HEIGHT, Math.floor(clientHeight));
  const scale = Math.max(1, Math.floor(Math.min(safeW / FRAMEBUFFER_WIDTH, safeH / FRAMEBUFFER_HEIGHT)));
  const drawWidth = FRAMEBUFFER_WIDTH * scale;
  const drawHeight = FRAMEBUFFER_HEIGHT * scale;
  const offsetX = Math.floor((safeW - drawWidth) / 2);
  const offsetY = Math.floor((safeH - drawHeight) / 2);
  return { offsetX, offsetY, drawWidth, drawHeight, scale };
}
