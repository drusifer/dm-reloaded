/**
 * Public exports for dual-mode Dungeon Master campaign and graphics data loading.
 *
 * TLDR:
 *   Re-exports Dungeon.dat decompression/parsing, Amiga graphics.dat sprite/PCM/palette
 *   decoding, and clean-room fallback providers for browser and Vitest runtimes.
 */

export {
  decodeDmText,
  decompressDungeon8104,
  parseChampionTextRecord,
  parseDungeonDat
} from './dungeonDatParser';
export { createCleanRoomBundle } from './cleanRoomProvider';
export {
  amiga9BitWordToRgb,
  buildDefaultLightPalettes,
  createCleanRoomGraphicsBundle,
  decodeFtlRleSprite,
  extractChampionPortrait,
  parseGraphicsDat
} from './graphicsDatParser';
export type { DecodedSound, DecodedSprite, GraphicsBundle, RgbColor } from './graphicsDatParser';
export * from './combatCatalog';
export * from './magicCatalog';
