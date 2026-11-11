/**
 * Amiga Paula 4-channel spatial stereo Web Audio engine with graphics.dat 8-bit PCM playback.
 *
 * TLDR:
 *   Computes Manhattan-distance gain attenuation and party-facing stereo pan (-1..+1),
 *   plays genuine 8-bit signed Amiga PCM samples from GraphicsBundle (with procedural
 *   Web Audio synth fallback), supports live Soundboard cue re-mapping and direct item
 *   auditioning, and tracks browser AudioContext gesture unlock status.
 */

import { DIRECTION_DELTAS } from '../engine/types';
import type { Direction, EngineEvent, GameState, PartyState, SoundCueId } from '../engine/types';
import type { DecodedSound, GraphicsBundle } from '../data/graphicsDatParser';
import type { AudioUnlockBadge } from '../render/layout';

export interface SpatialAcoustics {
  readonly gain: number;
  readonly pan: number; // -1 (hard left) .. 0 (center) .. +1 (hard right)
  readonly manhattanDistance: number;
}

/**
 * Default mapping from engine SoundCueIds to authentic Amiga graphics.dat PCM item indices.
 * Note: Normal party floor footsteps are silent (null) in original 1988 Amiga Dungeon Master,
 * while bumping into walls plays item[565] ("OOF!"). Users can reassign any cue live via Soundboard.
 */
/** Explicit synthesized route; null always means the user chose silence. */
export const SYNTH_SOUND_ITEM = -1;

export const AMIGA_SOUND_ITEM_MAP: Readonly<Record<SoundCueId, number | null>> = {
  SWITCH_CLICK: 534,
  WALL_BUMP: 565,
  DOOR_CLANK: 535,
  FOOTSTEP: null,
  TELEPORT_BUZZ: 547,
  CHAMPION_REVIVE: 545,
  PIT_FALL: 539,
  // No guessed Amiga mappings: use synthesized cues until the user assigns a sample.
  ITEM_PICKUP: SYNTH_SOUND_ITEM,
  THROW_SWOOSH: SYNTH_SOUND_ITEM,
  GULP: SYNTH_SOUND_ITEM,
  LOCK_CLICK: SYNTH_SOUND_ITEM,
  CHAMPION_DEATH: SYNTH_SOUND_ITEM,
  MONSTER_ATTACK: SYNTH_SOUND_ITEM,
  MONSTER_DEATH: SYNTH_SOUND_ITEM
};

/**
 * Pure acoustic calculation: computes stereo pan (-1..+1) and Manhattan-distance gain (0..1)
 * relative to the party's current dungeon level, tile coordinates, and facing direction.
 */
export function computeSpatialAcoustics(
  party: Pick<PartyState, 'level' | 'x' | 'y' | 'facing'>,
  sourceLevel: number,
  sourceX: number,
  sourceY: number
): SpatialAcoustics {
  const dx = sourceX - party.x;
  const dy = sourceY - party.y;
  const manhattanDistance = Math.abs(dx) + Math.abs(dy);
  const levelFactor = sourceLevel === party.level ? 1 : 0.35;

  const baseGain = manhattanDistance === 0
    ? 0.85
    : Math.max(0.05, 0.85 / (1 + manhattanDistance * 0.45));
  const gain = Number((baseGain * levelFactor).toFixed(4));

  if (manhattanDistance === 0) {
    return { gain, pan: 0, manhattanDistance: 0 };
  }

  const rightDir = ((party.facing + 1) & 3) as Direction;
  const rightVec = DIRECTION_DELTAS[rightDir];
  const lateral = dx * rightVec.dx + dy * rightVec.dy;
  const euclidean = Math.hypot(dx, dy);
  const rawPan = euclidean > 0 ? lateral / euclidean : 0;
  const pan = Number(Math.max(-1, Math.min(1, rawPan * 0.9)).toFixed(4));

  return { gain, pan, manhattanDistance };
}

export interface PlayedCueRecord {
  readonly cue: SoundCueId;
  readonly itemIndex: number | null;
  readonly gain: number;
  readonly pan: number;
  readonly usedAmigaPcm: boolean;
}

export interface RawSoundPlayOptions {
  readonly gain?: number;
  readonly pan?: number;
  readonly sampleRateHz?: number;
}

export class PaulaStereoAudio {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private muted = false;
  private graphicsBundle: GraphicsBundle | undefined;
  private cueMap: Record<SoundCueId, number | null> = { ...AMIGA_SOUND_ITEM_MAP };
  private playbackRateOverride: number | null = null;
  private readonly history: PlayedCueRecord[] = [];

  public constructor(graphicsBundle?: GraphicsBundle) {
    this.graphicsBundle = graphicsBundle;
  }

  public setGraphicsBundle(bundle: GraphicsBundle): void {
    this.graphicsBundle = bundle;
  }

  public getGraphicsBundle(): GraphicsBundle | undefined {
    return this.graphicsBundle;
  }

  public getCueMapping(): Readonly<Record<SoundCueId, number | null>> {
    return { ...this.cueMap };
  }

  public setCueItem(cue: SoundCueId, itemIndex: number | null): void {
    this.cueMap[cue] = itemIndex;
  }

  public resetCueMapping(): void {
    this.cueMap = { ...AMIGA_SOUND_ITEM_MAP };
  }

  public setPlaybackRateOverride(rateHz: number | null): void {
    this.playbackRateOverride = rateHz !== null ? Math.max(3000, Math.min(22050, Math.round(rateHz))) : null;
  }

  public getPlaybackRateOverride(): number | null {
    return this.playbackRateOverride;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public getStatus(): AudioUnlockBadge {
    if (this.muted) {
      return 'MUTED';
    }
    return this.unlocked ? 'ACTIVE' : 'LOCKED';
  }

  public getHistory(): readonly PlayedCueRecord[] {
    return this.history;
  }

  /**
   * Unlocks Web Audio on first user pointer/keyboard gesture per browser autoplay policy.
   */
  public unlockFromGesture(): void {
    if (!this.unlocked) {
      this.unlocked = true;
    }

    const AudioCtx = typeof globalThis !== 'undefined'
      ? (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

    if (AudioCtx && !this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
  }

  public processEvents(events: readonly EngineEvent[], state: GameState): void {
    this.muted = state.settings.audioMuted;
    for (const ev of events) {
      if (ev.type === 'SOUND_CUE') {
        this.playCue(ev.cue, ev.sourceLevel, ev.sourceX, ev.sourceY, state.party);
      }
    }
  }

  public playCue(
    cue: SoundCueId,
    sourceLevel: number,
    sourceX: number,
    sourceY: number,
    party: Pick<PartyState, 'level' | 'x' | 'y' | 'facing'>
  ): SpatialAcoustics {
    const acoustics = computeSpatialAcoustics(party, sourceLevel, sourceX, sourceY);
    const pcmIndex = this.cueMap[cue];

    // Silent cue (e.g., FOOTSTEP in authentic 1988 Amiga mode unless reassigned in Soundboard)
    if (pcmIndex === null) {
      return { gain: 0, pan: 0, manhattanDistance: acoustics.manhattanDistance };
    }

    const pcmSound = this.graphicsBundle?.sounds.get(pcmIndex);

    this.history.push({
      cue,
      itemIndex: pcmIndex,
      gain: acoustics.gain,
      pan: acoustics.pan,
      usedAmigaPcm: Boolean(pcmSound)
    });
    if (this.history.length > 64) {
      this.history.shift();
    }

    if (this.muted || !this.unlocked || !this.ctx || acoustics.gain <= 0.01) {
      return acoustics;
    }

    if (pcmSound) {
      this.playDecodedAmigaPcm(this.ctx, pcmSound, acoustics, this.playbackRateOverride ?? undefined);
    } else {
      this.playFallbackSynth(this.ctx, cue, acoustics);
    }
    return acoustics;
  }

  /**
   * Plays any decoded graphics.dat PCM sound item directly (used by the interactive Soundboard).
   */
  public playRawSoundItem(itemIndex: number, options?: RawSoundPlayOptions): boolean {
    this.unlockFromGesture();
    const pcmSound = this.graphicsBundle?.sounds.get(itemIndex);
    if (!pcmSound || !this.ctx) {
      return false;
    }
    const gain = Math.max(0.05, Math.min(1, options?.gain ?? 0.85));
    const pan = Math.max(-1, Math.min(1, options?.pan ?? 0));
    const rate = options?.sampleRateHz ?? this.playbackRateOverride ?? pcmSound.sampleRate;
    this.playDecodedAmigaPcm(this.ctx, pcmSound, { gain, pan, manhattanDistance: 0 }, rate);
    return true;
  }

  private playDecodedAmigaPcm(
    ctx: AudioContext,
    pcm: DecodedSound,
    acoustics: SpatialAcoustics,
    rateOverrideHz?: number
  ): void {
    try {
      const rate = Math.max(3000, Math.min(22050, Math.round(rateOverrideHz ?? pcm.sampleRate)));
      const buffer = ctx.createBuffer(1, pcm.samples.length, rate);
      buffer.getChannelData(0).set(pcm.samples);

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = acoustics.gain;

      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = acoustics.pan;
        src.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(ctx.destination);
      } else {
        src.connect(gainNode);
        gainNode.connect(ctx.destination);
      }

      src.start();
    } catch {
      // Ignore Web Audio hardware errors in headless environments
    }
  }

  private playFallbackSynth(
    ctx: AudioContext,
    cue: SoundCueId,
    acoustics: SpatialAcoustics
  ): void {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      const freqMap: Readonly<Record<SoundCueId, { readonly f0: number; readonly f1: number; readonly dur: number }>> = {
        FOOTSTEP: { f0: 95, f1: 55, dur: 0.06 },
        WALL_BUMP: { f0: 130, f1: 48, dur: 0.14 },
        SWITCH_CLICK: { f0: 920, f1: 520, dur: 0.04 },
        DOOR_CLANK: { f0: 165, f1: 82, dur: 0.16 },
        PIT_FALL: { f0: 440, f1: 90, dur: 0.35 },
        TELEPORT_BUZZ: { f0: 280, f1: 620, dur: 0.22 },
        CHAMPION_REVIVE: { f0: 262, f1: 524, dur: 0.28 },
        ITEM_PICKUP: { f0: 480, f1: 640, dur: 0.05 },
        THROW_SWOOSH: { f0: 700, f1: 200, dur: 0.12 },
        GULP: { f0: 220, f1: 110, dur: 0.18 },
        LOCK_CLICK: { f0: 1100, f1: 700, dur: 0.05 },
        CHAMPION_DEATH: { f0: 330, f1: 55, dur: 0.6 },
        MONSTER_ATTACK: { f0: 220, f1: 110, dur: 0.15 },
        MONSTER_DEATH: { f0: 160, f1: 40, dur: 0.4 }
      };
      const spec = freqMap[cue];

      osc.type = cue === 'TELEPORT_BUZZ' || cue === 'DOOR_CLANK' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(spec.f0, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, spec.f1), now + spec.dur);

      gainNode.gain.setValueAtTime(acoustics.gain * 0.35, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + spec.dur);

      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = acoustics.pan;
        osc.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(ctx.destination);
      } else {
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
      }

      osc.start(now);
      osc.stop(now + spec.dur);
    } catch {
      // Ignore Web Audio hardware errors in headless environments
    }
  }
}
