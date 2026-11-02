/**
 * Public exports for Amiga 320x200 pointer hit-testing and Purist/QoL keyboard input.
 *
 * TLDR:
 *   Re-exports clientPointToAmigaCoords, resolvePointerHitCommand, and resolveKeyboardCommand.
 */

export {
  clientPointToAmigaCoords,
  resolveKeyboardCommand,
  resolvePointerHitCommand
} from './inputController';
export type { AmigaPoint, BoundingClientRectLike } from './inputController';
