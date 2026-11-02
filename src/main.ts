/**
 * Browser composition root for the 320x200 Amiga Dungeon Master runtime.
 *
 * TLDR:
 *   Loads extracted 1988 Amiga Dungeon.dat + graphics.dat binaries when served locally
 *   (falling back seamlessly to CleanRoomProvider), wires pointer/keyboard InputController,
 *   PaulaStereoAudio, and the interactive Soundboard overlay, and drives the 60 FPS Canvas
 *   presenter + 6 Hz FixedTickAccumulator.
 */

import { PaulaStereoAudio } from './audio';
import {
  createCleanRoomBundle,
  createCleanRoomGraphicsBundle,
  parseDungeonDat,
  parseGraphicsDat
} from './data';
import type { GraphicsBundle } from './data';
import { FixedTickAccumulator, createInitialGameState, dispatchCommand } from './engine';
import type { CampaignBundle, GameCommand, GameState } from './engine';
import {
  clientPointToAmigaCoords,
  resolveKeyboardCommand,
  resolvePointerHitCommand
} from './input';
import {
  FRAMEBUFFER_HEIGHT,
  FRAMEBUFFER_WIDTH,
  Framebuffer,
  computeCanvasPresentationRect,
  renderFrame
} from './render';
import { mountSoundboardUI } from './ui';
import type { SoundboardController } from './ui';

export interface RuntimeAssets {
  readonly campaign: CampaignBundle;
  readonly graphics: GraphicsBundle;
}

async function tryFetchBinary(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/html')) {
      return null;
    }
    const buf = await res.arrayBuffer();
    return buf.byteLength > 0 ? new Uint8Array(buf) : null;
  } catch {
    return null;
  }
}

export async function loadRuntimeAssets(): Promise<RuntimeAssets> {
  const [dungeonBytes, gfxBytes] = await Promise.all([
    tryFetchBinary('/assets/extracted/dm1/Dungeon.dat'),
    tryFetchBinary('/assets/extracted/dm1/graphics.dat')
  ]);

  let campaign: CampaignBundle;
  if (dungeonBytes) {
    try {
      campaign = parseDungeonDat(dungeonBytes);
    } catch {
      campaign = createCleanRoomBundle();
    }
  } else {
    campaign = createCleanRoomBundle();
  }

  let graphics: GraphicsBundle;
  if (gfxBytes) {
    try {
      graphics = parseGraphicsDat(gfxBytes);
    } catch {
      graphics = createCleanRoomGraphicsBundle();
    }
  } else {
    graphics = createCleanRoomGraphicsBundle();
  }

  return { campaign, graphics };
}

export interface DungeonMasterApp {
  getState(): GameState;
  getAudio(): PaulaStereoAudio;
  dispatch(command: GameCommand): void;
  destroy(): void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function startDungeonMasterApp(
  canvas: HTMLCanvasElement,
  assets: RuntimeAssets
): DungeonMasterApp {
  canvas.width = FRAMEBUFFER_WIDTH;
  canvas.height = FRAMEBUFFER_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }

  const framebuffer = new Framebuffer();
  const accumulator = new FixedTickAccumulator();
  const audio = new PaulaStereoAudio(assets.graphics);
  let state = createInitialGameState(assets.campaign);

  let soundboard: SoundboardController | null = null;
  if (typeof document !== 'undefined' && document.body) {
    soundboard = mountSoundboardUI(document.body, audio, assets.graphics);
  }

  const syncCanvasDisplaySize = (): void => {
    const hostW = window.innerWidth || FRAMEBUFFER_WIDTH;
    const hostH = window.innerHeight || FRAMEBUFFER_HEIGHT;
    const rect = computeCanvasPresentationRect(hostW, hostH);
    canvas.style.width = `${rect.drawWidth}px`;
    canvas.style.height = `${rect.drawHeight}px`;
  };

  const applyCommand = (command: GameCommand): void => {
    const result = dispatchCommand(state, command);
    state = result.state;
    audio.processEvents(result.events, state);
  };

  const onPointerDown = (ev: PointerEvent): void => {
    audio.unlockFromGesture();
    const amigaPt = clientPointToAmigaCoords(ev.clientX, ev.clientY, canvas.getBoundingClientRect());
    if (!amigaPt) {
      return;
    }
    const cmd = resolvePointerHitCommand(amigaPt.x, amigaPt.y, state);
    if (cmd) {
      ev.preventDefault();
      applyCommand(cmd);
    }
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (isEditableTarget(ev.target)) {
      if (ev.key === 'Escape') {
        (ev.target as HTMLElement).blur();
      }
      return;
    }

    audio.unlockFromGesture();

    if (ev.key === 'b' || ev.key === 'B') {
      ev.preventDefault();
      soundboard?.toggle();
      return;
    }

    if (ev.key === 'Escape' && soundboard?.isOpen()) {
      ev.preventDefault();
      soundboard.close();
      return;
    }

    const cmd = resolveKeyboardCommand(ev.key, state);
    if (cmd) {
      ev.preventDefault();
      applyCommand(cmd);
    }
  };

  syncCanvasDisplaySize();
  window.addEventListener('resize', syncCanvasDisplaySize);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);

  let rafId = 0;
  let lastTimestamp = performance.now();

  const frameLoop = (now: number): void => {
    const deltaMs = Math.max(0, now - lastTimestamp);
    lastTimestamp = now;

    const dueTicks = accumulator.advance(deltaMs);
    if (dueTicks > 0) {
      applyCommand({ type: 'TICK', count: dueTicks });
    }

    renderFrame(framebuffer, state, {
      graphics: assets.graphics,
      audioStatus: audio.getStatus()
    });

    if (ctx) {
      const imgData = new ImageData(
        new Uint8ClampedArray(framebuffer.rgba),
        FRAMEBUFFER_WIDTH,
        FRAMEBUFFER_HEIGHT
      );
      ctx.putImageData(imgData, 0, 0);
    }

    rafId = window.requestAnimationFrame(frameLoop);
  };

  rafId = window.requestAnimationFrame(frameLoop);

  return {
    getState: () => state,
    getAudio: () => audio,
    dispatch: applyCommand,
    destroy: () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', syncCanvasDisplaySize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      soundboard?.destroy();
    }
  };
}

async function bootstrapBrowser(): Promise<void> {
  if (typeof document === 'undefined') {
    return;
  }
  const canvas = document.getElementById('amiga-screen');
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }
  const assets = await loadRuntimeAssets();
  const app = startDungeonMasterApp(canvas, assets);
  (window as unknown as { __DM_APP__?: DungeonMasterApp }).__DM_APP__ = app;
}

void bootstrapBrowser();
