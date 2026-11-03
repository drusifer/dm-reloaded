/**
 * Public exports for browser overlay UI tools (Amiga Paula Soundboard & SFX Labeler).
 *
 * TLDR:
 *   Re-exports mountSoundboardUI and pure Soundboard preset serialization helpers.
 */

export {
  ALL_SOUND_CUES,
  DEFAULT_SOUND_LABELS,
  SOUND1772_SLOT_BY_ITEM,
  SOUNDBOARD_STORAGE_KEY,
  createDefaultSoundboardPreset,
  mountSoundboardUI,
  parseSoundboardPreset,
  serializeSoundboardPreset
} from './soundboard';
export type { SoundboardController, SoundboardPreset } from './soundboard';
export { mountContactSheetUI } from './contactSheet';
export type { ContactSheetController } from './contactSheet';
