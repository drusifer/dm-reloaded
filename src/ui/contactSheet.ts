/**
 * Browser Contact Sheet modal: browse every graphics.dat sprite with its item index.
 *
 * TLDR:
 *   mountContactSheetUI adds a "SPRITES [G]" toggle button and a scrollable modal panel that
 *   blits renderContactSheet() output onto a canvas. Supports 1x-4x zoom, light-ramp palette
 *   selection, and a hover readout (item index, WxH) that can be clicked to copy the index.
 *   The pure renderer lives in src/render/contactSheet.ts; this file only owns DOM wiring.
 */

import type { GraphicsBundle } from '../data/graphicsDatParser';
import { hitTestContactSheet, renderContactSheet } from '../render/contactSheet';
import type { ContactSheetImage } from '../render/contactSheet';

export interface ContactSheetController {
  isOpen(): boolean;
  toggle(): void;
  close(): void;
  destroy(): void;
}

const ZOOM_LEVELS = [1, 2, 3, 4] as const;

export function mountContactSheetUI(
  host: HTMLElement,
  graphics: GraphicsBundle
): ContactSheetController {
  let open = false;
  let zoom = 2;
  let rampIndex = Math.max(0, graphics.lightPalettes.length - 1);
  let image: ContactSheetImage | null = null;

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'contact-sheet-toggle';
  toggleBtn.type = 'button';
  toggleBtn.textContent = 'SPRITES [G]';
  toggleBtn.title = 'Open the graphics.dat sprite contact sheet (Shortcut: G)';

  const panel = document.createElement('aside');
  panel.id = 'contact-sheet-panel';
  panel.hidden = true;

  const header = document.createElement('div');
  header.className = 'cs-header';
  const title = document.createElement('strong');
  title.textContent = `SPRITE CONTACT SHEET (${graphics.sprites.size} SPRITES · ${graphics.source})`;
  const readout = document.createElement('span');
  readout.className = 'cs-readout';
  readout.textContent = 'Hover a sprite for its item index; click to copy.';

  const controls = document.createElement('div');
  controls.className = 'cs-actions';

  const zoomSelect = document.createElement('select');
  zoomSelect.className = 'cs-select';
  for (const z of ZOOM_LEVELS) {
    const opt = document.createElement('option');
    opt.value = String(z);
    opt.textContent = `${z}x`;
    zoomSelect.append(opt);
  }
  zoomSelect.value = String(zoom);

  const rampSelect = document.createElement('select');
  rampSelect.className = 'cs-select';
  graphics.lightPalettes.forEach((_ramp, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Light ramp ${i}`;
    rampSelect.append(opt);
  });
  rampSelect.value = String(rampIndex);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'cs-btn';
  closeBtn.textContent = 'Close [Esc]';

  controls.append(zoomSelect, rampSelect, closeBtn);
  header.append(title, readout, controls);

  const scroller = document.createElement('div');
  scroller.className = 'cs-scroll';
  const canvas = document.createElement('canvas');
  canvas.className = 'cs-canvas';
  scroller.append(canvas);
  panel.append(header, scroller);

  const redraw = (): void => {
    const palette = graphics.lightPalettes[rampIndex];
    if (!palette) {
      return;
    }
    image = renderContactSheet(graphics, palette, { scale: zoom, maxWidth: 900 });
    canvas.width = Math.max(1, image.width);
    canvas.height = Math.max(1, image.height);
    const ctx = canvas.getContext('2d');
    if (ctx && image.width > 0) {
      ctx.putImageData(new ImageData(new Uint8ClampedArray(image.rgba), image.width, image.height), 0, 0);
    }
  };

  const sheetPoint = (ev: MouseEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width > 0 ? canvas.width / rect.width : 1;
    const sy = rect.height > 0 ? canvas.height / rect.height : 1;
    return { x: (ev.clientX - rect.left) * sx, y: (ev.clientY - rect.top) * sy };
  };

  canvas.addEventListener('mousemove', (ev) => {
    if (!image) {
      return;
    }
    const p = sheetPoint(ev);
    const cell = hitTestContactSheet(image, p.x, p.y);
    readout.textContent = cell
      ? `item[${cell.index}]  ${Math.round(cell.width / zoom)}×${Math.round(cell.height / zoom)}`
      : 'Hover a sprite for its item index; click to copy.';
  });

  canvas.addEventListener('click', (ev) => {
    if (!image) {
      return;
    }
    const p = sheetPoint(ev);
    const cell = hitTestContactSheet(image, p.x, p.y);
    if (cell && navigator.clipboard) {
      void navigator.clipboard.writeText(String(cell.index)).then(() => {
        readout.textContent = `Copied item[${cell.index}]`;
      });
    }
  });

  zoomSelect.addEventListener('change', () => {
    zoom = Number(zoomSelect.value);
    redraw();
  });
  rampSelect.addEventListener('change', () => {
    rampIndex = Number(rampSelect.value);
    redraw();
  });

  const setOpen = (next: boolean): void => {
    open = next;
    panel.hidden = !open;
    toggleBtn.classList.toggle('open', open);
    if (open) {
      redraw();
    }
  };

  toggleBtn.addEventListener('click', () => setOpen(!open));
  closeBtn.addEventListener('click', () => setOpen(false));

  host.append(toggleBtn, panel);

  return {
    isOpen: () => open,
    toggle: () => setOpen(!open),
    close: () => setOpen(false),
    destroy: () => {
      toggleBtn.remove();
      panel.remove();
    }
  };
}
