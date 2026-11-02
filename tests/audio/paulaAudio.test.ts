/**
 * Unit tests for Phase 3 PaulaStereoAudio & Soundboard preset/cue routing.
 *
 * TLDR:
 *   Validates party-relative left/right stereo pan, Manhattan-distance & cross-level gain
 *   attenuation, AudioStatus transitions (LOCKED -> ACTIVE -> MUTED), silent 1988 party steps
 *   vs item[565] WALL_BUMP ("OOF!"), live Soundboard cue re-mapping, and preset JSON round-trips.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AMIGA_SOUND_ITEM_MAP, PaulaStereoAudio, computeSpatialAcoustics } from '../../src/audio';
import { createCleanRoomBundle, parseGraphicsDat } from '../../src/data';
import { createInitialGameState, dispatchCommand } from '../../src/engine';
import {
  createDefaultSoundboardPreset,
  parseSoundboardPreset,
  serializeSoundboardPreset
} from '../../src/ui';

const EXTRACTED_GFX_PATH = resolve(process.cwd(), 'public/assets/extracted/dm1/graphics.dat');

describe('Phase 3: PaulaStereoAudio Spatial Acoustics & Gesture Unlock', () => {
  it('pans sounds left/right relative to party facing and attenuates gain by Manhattan distance & level', () => {
    const partyNorth = { level: 1, x: 5, y: 5, facing: 0 as const };

    const here = computeSpatialAcoustics(partyNorth, 1, 5, 5);
    expect(here.pan).toBe(0);
    expect(here.gain).toBeCloseTo(0.85, 2);

    const eastSound = computeSpatialAcoustics(partyNorth, 1, 8, 5);
    expect(eastSound.pan).toBeGreaterThan(0.7);
    expect(eastSound.gain).toBeLessThan(here.gain);

    const westSound = computeSpatialAcoustics(partyNorth, 1, 2, 5);
    expect(westSound.pan).toBeLessThan(-0.7);
    expect(westSound.gain).toBeCloseTo(eastSound.gain, 4);

    // Turning party South (2) flips East (+X) to the party's LEFT ear!
    const partySouth = { level: 1, x: 5, y: 5, facing: 2 as const };
    const eastWhenFacingSouth = computeSpatialAcoustics(partySouth, 1, 8, 5);
    expect(eastWhenFacingSouth.pan).toBeLessThan(-0.7);

    // Sound from another dungeon level is muffled
    const crossLevel = computeSpatialAcoustics(partyNorth, 2, 8, 5);
    expect(crossLevel.gain).toBeLessThan(eastSound.gain * 0.5);
  });

  it('keeps normal party steps silent by default, plays item[565] OOF! on wall bump, and supports live Soundboard remapping', () => {
    const gfx = existsSync(EXTRACTED_GFX_PATH)
      ? parseGraphicsDat(new Uint8Array(readFileSync(EXTRACTED_GFX_PATH)))
      : undefined;
    const audio = new PaulaStereoAudio(gfx);

    expect(AMIGA_SOUND_ITEM_MAP.WALL_BUMP).toBe(565);
    expect(AMIGA_SOUND_ITEM_MAP.FOOTSTEP).toBeNull();

    expect(audio.getStatus()).toBe('LOCKED');
    audio.unlockFromGesture();
    expect(audio.getStatus()).toBe('ACTIVE');

    const state = createInitialGameState(createCleanRoomBundle());

    // Normal open-corridor step East (1,2 -> 2,2) stays silent by default (zero history entries)
    const stepped = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' });
    audio.processEvents(stepped.events, stepped.state);
    expect(audio.getHistory()).toHaveLength(0);

    // Cool down and bump North wall -> plays WALL_BUMP (item[565] "OOF!")
    const cooled = dispatchCommand(stepped.state, { type: 'TICK' }).state;
    const turned = dispatchCommand(cooled, { type: 'TURN', direction: 'LEFT' }).state;
    const bumped = dispatchCommand(turned, { type: 'MOVE', direction: 'FORWARD' });
    audio.processEvents(bumped.events, bumped.state);

    const history = audio.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.cue).toBe('WALL_BUMP');
    expect(history[0]?.itemIndex).toBe(565);
    if (gfx) {
      expect(history[0]?.usedAmigaPcm).toBe(true);
      // All 33 PCM items decode at clean 5500 Hz Paula base rate
      expect(gfx.sounds.get(534)?.sampleRate).toBe(5500);
      expect(gfx.sounds.get(565)?.sampleRate).toBe(5500);
    }

    // Live Soundboard cue assignment allows routing FOOTSTEP to any item (e.g., 540)
    audio.setCueItem('FOOTSTEP', 540);
    const cooled2 = dispatchCommand(bumped.state, { type: 'TICK' }).state;
    const turnedEast = dispatchCommand(cooled2, { type: 'TURN', direction: 'RIGHT' }).state;
    const steppedWithCustomSfx = dispatchCommand(turnedEast, { type: 'MOVE', direction: 'FORWARD' });
    audio.processEvents(steppedWithCustomSfx.events, steppedWithCustomSfx.state);
    expect(audio.getHistory().at(-1)?.cue).toBe('FOOTSTEP');
    expect(audio.getHistory().at(-1)?.itemIndex).toBe(540);

    const muted = dispatchCommand(steppedWithCustomSfx.state, { type: 'SET_AUDIO_MUTED', muted: true });
    audio.processEvents(muted.events, muted.state);
    expect(audio.getStatus()).toBe('MUTED');
  });

  it('serializes and parses Soundboard user labels and custom cue mappings losslessly', () => {
    const preset = createDefaultSoundboardPreset();
    preset.labels['570'] = 'Monster heavy footstep';
    preset.cueMap.DOOR_CLANK = 535;
    preset.cueMap.FOOTSTEP = null;

    const json = serializeSoundboardPreset({ ...preset, sampleRateHz: 5600 });
    const restored = parseSoundboardPreset(json);
    expect(restored).not.toBeNull();
    expect(restored?.sampleRateHz).toBe(5600);
    expect(restored?.labels['570']).toBe('Monster heavy footstep');
    expect(restored?.labels['565']).toContain('OOF!');
    expect(restored?.cueMap.WALL_BUMP).toBe(565);
    expect(restored?.cueMap.FOOTSTEP).toBeNull();
  });
});
