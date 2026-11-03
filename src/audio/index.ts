/**
 * Public exports for Amiga Paula spatial stereo Web Audio playback.
 *
 * TLDR:
 *   Re-exports PaulaStereoAudio, computeSpatialAcoustics, and AMIGA_SOUND_ITEM_MAP.
 */

export {
  AMIGA_SOUND_ITEM_MAP,
  PaulaStereoAudio,
  computeSpatialAcoustics
} from './paulaAudio';
export type { PlayedCueRecord, RawSoundPlayOptions, SpatialAcoustics } from './paulaAudio';

export { SYNTH_SOUND_ITEM } from './paulaAudio';
