/**
 * Unit tests for Phase 3 InputController (320x200 hitbox mapping + Purist/QoL keyboard gating).
 *
 * TLDR:
 *   Verifies clientPointToAmigaCoords bounding-rect scaling, all 6 movement arrow pad cells,
 *   utility pill toggles (x=272..319), Mirror modal button isolation & Escape dismissal,
 *   and 1988 Purist Mode keyboard blocking until QoL Mode is toggled on.
 */

import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import { createInitialGameState, dispatchCommand } from '../../src/engine';
import {
  clientPointToAmigaCoords,
  resolveKeyboardCommand,
  resolvePointerHitCommand
} from '../../src/input';
import { LAYOUT_RECTS } from '../../src/render';

describe('Phase 3: InputController (320x200 Hitboxes & Purist/QoL Keyboard)', () => {
  it('maps scaled browser client coordinates accurately into [0..319, 0..199] and rejects out-of-bounds clicks', () => {
    // 3x integer-scaled canvas (960x600) offset at (32, 84)
    const rect = { left: 32, top: 84, width: 960, height: 600 };

    expect(clientPointToAmigaCoords(32, 84, rect)).toEqual({ x: 0, y: 0 });
    expect(clientPointToAmigaCoords(32 + 959, 84 + 599, rect)).toEqual({ x: 319, y: 199 });
    expect(clientPointToAmigaCoords(31, 100, rect)).toBeNull();
    expect(clientPointToAmigaCoords(32 + 960, 100, rect)).toBeNull();
  });

  it('resolves all 6 movement arrow pad cells, center viewport interaction, and non-overlapping utility pills', () => {
    const state = createInitialGameState(createCleanRoomBundle());
    const pad = LAYOUT_RECTS.MOVEMENT_PAD;

    // Top row: Turn Left, Forward, Turn Right
    expect(resolvePointerHitCommand(pad.x + 8, pad.y + 8, state)).toEqual({
      type: 'TURN',
      direction: 'LEFT'
    });
    expect(resolvePointerHitCommand(pad.x + 40, pad.y + 8, state)).toEqual({
      type: 'MOVE',
      direction: 'FORWARD'
    });
    expect(resolvePointerHitCommand(pad.x + 72, pad.y + 8, state)).toEqual({
      type: 'TURN',
      direction: 'RIGHT'
    });

    // Bottom row: Strafe Left, Backward, Strafe Right
    expect(resolvePointerHitCommand(pad.x + 8, pad.y + 30, state)).toEqual({
      type: 'MOVE',
      direction: 'STRAFE_LEFT'
    });
    expect(resolvePointerHitCommand(pad.x + 40, pad.y + 30, state)).toEqual({
      type: 'MOVE',
      direction: 'BACKWARD'
    });
    expect(resolvePointerHitCommand(pad.x + 72, pad.y + 30, state)).toEqual({
      type: 'MOVE',
      direction: 'STRAFE_RIGHT'
    });

    // Center ahead viewport click
    expect(resolvePointerHitCommand(112, 96, state)).toEqual({ type: 'INTERACT_AHEAD' });

    // Utility pills at x=272..319
    expect(resolvePointerHitCommand(280, 4, state)).toEqual({ type: 'TOGGLE_QOL_MODE' });
    expect(resolvePointerHitCommand(280, 13, state)).toEqual({ type: 'TOGGLE_AUTOMAP' });
    expect(resolvePointerHitCommand(307, 22, state)).toEqual({
      type: 'SET_AUDIO_MUTED',
      muted: true
    });
  });

  it('blocks QWEASD/Arrow/M keys in 1988 Purist Mode default and enables them in QoL Mode', () => {
    const puristState = createInitialGameState(createCleanRoomBundle());
    expect(puristState.settings.qolMode).toBe(false);

    for (const k of ['w', 'a', 's', 'd', 'q', 'e', 'ArrowUp', 'ArrowLeft', 'm']) {
      expect(resolveKeyboardCommand(k, puristState)).toBeNull();
    }

    const qolState = dispatchCommand(puristState, { type: 'TOGGLE_QOL_MODE' }).state;
    expect(resolveKeyboardCommand('w', qolState)).toEqual({ type: 'MOVE', direction: 'FORWARD' });
    expect(resolveKeyboardCommand('ArrowDown', qolState)).toEqual({ type: 'MOVE', direction: 'BACKWARD' });
    expect(resolveKeyboardCommand('a', qolState)).toEqual({ type: 'MOVE', direction: 'STRAFE_LEFT' });
    expect(resolveKeyboardCommand('d', qolState)).toEqual({ type: 'MOVE', direction: 'STRAFE_RIGHT' });
    expect(resolveKeyboardCommand('q', qolState)).toEqual({ type: 'TURN', direction: 'LEFT' });
    expect(resolveKeyboardCommand('e', qolState)).toEqual({ type: 'TURN', direction: 'RIGHT' });
    expect(resolveKeyboardCommand('m', qolState)).toEqual({ type: 'TOGGLE_AUTOMAP' });
  });

  it('captures pointer clicks inside Champion Mirror modal and allows Cancel via button or Escape', () => {
    let state = createInitialGameState(createCleanRoomBundle());
    state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
    state = dispatchCommand(state, { type: 'TICK', count: 3 }).state;
    state = dispatchCommand(state, { type: 'TURN', direction: 'LEFT' }).state;
    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
    expect(state.activeMirror).not.toBeNull();

    // Movement pad click is ignored while Mirror modal is open
    expect(resolvePointerHitCommand(260, 130, state)).toBeNull();

    const res = LAYOUT_RECTS.MIRROR_BTN_RESURRECT;
    const rei = LAYOUT_RECTS.MIRROR_BTN_REINCARNATE;
    const can = LAYOUT_RECTS.MIRROR_BTN_CANCEL;

    expect(resolvePointerHitCommand(res.x + 5, res.y + 5, state)).toEqual({
      type: 'RECRUIT_CHAMPION',
      mode: 'RESURRECT'
    });
    expect(resolvePointerHitCommand(rei.x + 5, rei.y + 5, state)).toEqual({
      type: 'RECRUIT_CHAMPION',
      mode: 'REINCARNATE'
    });
    expect(resolvePointerHitCommand(can.x + 5, can.y + 5, state)).toEqual({
      type: 'CANCEL_MIRROR'
    });
    expect(resolveKeyboardCommand('Escape', state)).toEqual({ type: 'CANCEL_MIRROR' });
  });
});
