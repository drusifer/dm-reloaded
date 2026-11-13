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
  importCampaignFiles,
  parseDungeonDat,
  parseGraphicsDat
} from './data';
import type { GraphicsBundle } from './data';
import { FixedTickAccumulator, createInitialGameState, deserializeSave, dispatchCommand, exportRoster, parseRoster, serializeSave } from './engine';
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
import { browserStorage, downloadSave, mountContactSheetUI, mountGameMenu, mountSoundboardUI, readSlot, writeSlot } from './ui';
import type { ContactSheetController, GameMenuController, SoundboardController } from './ui';

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

export interface AppOptions {
  /** Status line shown (and logged) when the app starts, e.g. after an import. */
  readonly initialStatus?: string | readonly string[];
  /** Validates picked files and, on success, restarts the app on them; resolves to a status line. */
  readonly importFiles?: (files: { dungeon: Uint8Array | null; graphics: Uint8Array | null }) => Promise<string>;
}

export interface DungeonMasterApp {
  saveNow(): string;
  loadNow(): string;
  loadText(text: string): string;
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
  assets: RuntimeAssets,
  options: AppOptions = {}
): DungeonMasterApp {
  canvas.width = FRAMEBUFFER_WIDTH;
  canvas.height = FRAMEBUFFER_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }

  const originalCursor = canvas.style.cursor;
  const framebuffer = new Framebuffer();
  const accumulator = new FixedTickAccumulator();
  const audio = new PaulaStereoAudio(assets.graphics);
  let state = createInitialGameState(assets.campaign);
  let pointer: { x: number; y: number } | null = null;

  let soundboard: SoundboardController | null = null;
  let contactSheet: ContactSheetController | null = null;
  if (typeof document !== 'undefined' && document.body) {
    soundboard = mountSoundboardUI(document.body, audio, assets.graphics);
    contactSheet = mountContactSheetUI(document.body, assets.graphics);
  }

  const campaignId = assets.campaign.dungeon.campaignId;
  const logMessage = (text: string): string => {
    state = { ...state, messages: [...state.messages, text].slice(-24) };
    return text;
  };
  const saveNow = (): string => {
    const written = writeSlot(browserStorage(), serializeSave(state));
    return logMessage(written.ok ? `GAME SAVED AT TICK ${state.tick}.` : written.text);
  };
  const loadText = (text: string): string => {
    const loaded = deserializeSave(text, campaignId);
    if (!loaded.ok) return logMessage(loaded.text);
    state = loaded.state;
    return logMessage(`GAME LOADED (TICK ${state.tick}).`);
  };
  const loadNow = (): string => {
    const read = readSlot(browserStorage());
    return read.ok ? loadText(read.text ?? '') : logMessage(read.text);
  };
  const exportNow = (): string => {
    const ok = typeof document !== 'undefined'
      && downloadSave(document, serializeSave(state), `dm-reloaded-save-tick${state.tick}.json`);
    return logMessage(ok ? 'SAVE FILE EXPORTED.' : 'EXPORT FAILED: DOWNLOAD WAS BLOCKED.');
  };

  const exportRosterNow = (): string => {
    const r = exportRoster(state);
    if (!r.ok) return logMessage(r.message);
    const ok = typeof document !== 'undefined'
      && downloadSave(document, r.text, `dm-reloaded-roster-tick${state.tick}.json`);
    if (!ok) return logMessage('EXPORT FAILED: DOWNLOAD BLOCKED.');
    return r.messages.map(logMessage).join(' ');
  };
  const importRosterText = (text: string): string => {
    const parsed = parseRoster(text);
    if (!parsed.ok) return logMessage(parsed.text);
    const result = dispatchCommand(state, { type: 'IMPORT_ROSTER', champions: parsed.champions });
    state = result.state;
    audio.processEvents(result.events, state);
    return result.events.flatMap((e) => (e.type === 'MESSAGE_LOGGED' ? [e.text] : [])).join(' ');
  };

  let menu: GameMenuController | null = null;
  if (typeof document !== 'undefined' && document.body) {
    menu = mountGameMenu(document.body, {
      onSave: saveNow,
      onLoad: loadNow,
      onExport: exportNow,
      onImportSave: loadText,
      onExportRoster: exportRosterNow,
      onImportRoster: importRosterText,
      onImportFiles: async (files) => options.importFiles
        ? options.importFiles(files)
        : 'IMPORT IS NOT AVAILABLE IN THIS BUILD.'
    });
    if (options.initialStatus) {
      const lines = typeof options.initialStatus === 'string' ? [options.initialStatus] : options.initialStatus;
      menu.setStatus(lines.map(logMessage).join(' '));
    }
  }

  const syncCanvasDisplaySize = (): void => {
    const hostW = window.innerWidth || FRAMEBUFFER_WIDTH;
    const hostH = window.innerHeight || FRAMEBUFFER_HEIGHT;
    // Keep the integer scale unless the letterbox below the canvas is too thin for the 40px menu strip.
    const full = computeCanvasPresentationRect(hostW, hostH);
    const rect = (hostH - full.drawHeight) / 2 >= 40 ? full : computeCanvasPresentationRect(hostW, hostH - 80);
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
    pointer = amigaPt;
    if (state.gameOver || state.victory) {
      ev.preventDefault();
      state = createInitialGameState(assets.campaign);
      return;
    }
    const cmd = resolvePointerHitCommand(amigaPt.x, amigaPt.y, state, ev.button);
    if (cmd) {
      ev.preventDefault();
      applyCommand(cmd);
    }
  };

  const onPointerMove = (ev: PointerEvent): void => {
    pointer=clientPointToAmigaCoords(ev.clientX,ev.clientY,canvas.getBoundingClientRect());
  };
  const onPointerLeave = (): void => { pointer=null; };
  const onContextMenu = (ev: MouseEvent): void => { ev.preventDefault(); };

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (isEditableTarget(ev.target)) {
      if (ev.key === 'Escape') {
        (ev.target as HTMLElement).blur();
      }
      return;
    }

    audio.unlockFromGesture();
    if (state.gameOver || state.victory) {
      ev.preventDefault();
      if (ev.key === 'Enter') state = createInitialGameState(assets.campaign);
      return;
    }
    if (state.party.sleeping) {
      ev.preventDefault();
      applyCommand({type:'SET_SLEEPING',sleeping:false});
      return;
    }

    // The rune panel owns every key before global B/G overlays. In Purist mode the resolver
    // intentionally returns null, but the panel still captures the key so it cannot leak.
    if (state.interaction.kind === 'RUNE_PANEL') {
      ev.preventDefault();
      const cmd = resolveKeyboardCommand(ev.key, state);
      if (cmd) applyCommand(cmd);
      return;
    }

    if (ev.key === 'b' || ev.key === 'B') {
      ev.preventDefault();
      soundboard?.toggle();
      return;
    }

    if (ev.key === 'g' || ev.key === 'G') {
      ev.preventDefault();
      contactSheet?.toggle();
      return;
    }

    if (ev.key === 'Escape' && contactSheet?.isOpen()) {
      ev.preventDefault();
      contactSheet.close();
      return;
    }

    if (ev.key === 'Escape' && soundboard?.isOpen()) {
      ev.preventDefault();
      soundboard.close();
      return;
    }

    if (state.settings.qolMode && (ev.key === 'F5' || ev.key === 'F9')) {
      ev.preventDefault();
      menu?.setStatus(ev.key === 'F5' ? saveNow() : loadNow());
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
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('contextmenu', onContextMenu);
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

    canvas.style.cursor = state.handItem && pointer && !state.party.sleeping && !state.gameOver
      ? 'none' : originalCursor;

    renderFrame(framebuffer, state, {
      graphics: assets.graphics,
      audioStatus: audio.getStatus(),
      pointer
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
    saveNow,
    loadNow,
    loadText,
    getState: () => state,
    getAudio: () => audio,
    dispatch: applyCommand,
    destroy: () => {
      window.cancelAnimationFrame(rafId);
      canvas.style.cursor = originalCursor;
      window.removeEventListener('resize', syncCanvasDisplaySize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      soundboard?.destroy();
      contactSheet?.destroy();
      menu?.destroy();
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
  const win = window as unknown as { __DM_APP__?: DungeonMasterApp };
  const launch = (assets: RuntimeAssets, initialStatus?: string | readonly string[]): void => {
    win.__DM_APP__?.destroy();
    win.__DM_APP__ = startDungeonMasterApp(canvas, assets, {
      ...(initialStatus ? { initialStatus } : {}),
      importFiles: async (files) => {
        const imported = importCampaignFiles(files);
        if (!imported.ok) return imported.text;
        const lines = [imported.text, ...imported.notes];
        launch({ campaign: imported.campaign, graphics: imported.graphics }, lines);
        return lines.join(' ');
      }
    });
  };
  launch(await loadRuntimeAssets());
}

void bootstrapBrowser();
