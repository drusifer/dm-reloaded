/** Pure validation/parsing of user-picked Dungeon Master files; never throws. */

import type { CampaignBundle } from '../engine/types';
import { DM1_LEVEL_COUNT, parseDungeonDat } from './dungeonDatParser';
import { createCleanRoomGraphicsBundle, parseGraphicsDat } from './graphicsDatParser';
import { creatureIds, listGdatImages, parseGdat } from './gdat';
import type { GraphicsBundle } from './graphicsDatParser';

export type ImportFailureReason = 'EMPTY' | 'NOT_DUNGEON_DAT' | 'PARSE_FAILED' | 'GRAPHICS_PARSE_FAILED';

export type ImportResult =
  | {
      readonly ok: true;
      readonly campaign: CampaignBundle;
      readonly graphics: GraphicsBundle;
      readonly usedFallbackGraphics: boolean;
      /** True only for the recognized 14-level Dungeon Master I campaign. */
      readonly recognized: boolean;
      /** Extra log lines (each short enough for the 320x200 message log). */
      readonly notes: readonly string[];
      readonly text: string;
    }
  | { readonly ok: false; readonly reason: ImportFailureReason; readonly text: string };

const FAIL_TEXT: Readonly<Record<ImportFailureReason, string>> = {
  EMPTY: 'IMPORT FAILED: PICK A DUNGEON.DAT FILE FIRST.',
  NOT_DUNGEON_DAT: 'IMPORT FAILED: THAT FILE IS NOT A DUNGEON.DAT.',
  PARSE_FAILED: 'IMPORT FAILED: DUNGEON.DAT COULD NOT BE READ.',
  GRAPHICS_PARSE_FAILED: 'IMPORT FAILED: GRAPHICS.DAT COULD NOT BE READ.'
};

const fail = (reason: ImportFailureReason): ImportResult => ({ ok: false, reason, text: FAIL_TEXT[reason] });

export function importCampaignFiles(files: {
  readonly dungeon: Uint8Array | null;
  readonly graphics?: Uint8Array | null;
}): ImportResult {
  if (!files.dungeon || files.dungeon.byteLength === 0) return fail('EMPTY');
  if (files.dungeon.byteLength < 64) return fail('NOT_DUNGEON_DAT');
  let campaign: CampaignBundle;
  try {
    campaign = parseDungeonDat(files.dungeon);
  } catch {
    return fail('PARSE_FAILED');
  }
  const levels = campaign.dungeon.levels;
  if (levels.length < 1 || levels.length > 64
    || levels.some((l) => l.width < 1 || l.height < 1 || l.tiles.length !== l.height)) {
    return fail('NOT_DUNGEON_DAT');
  }
  let graphics: GraphicsBundle;
  let usedFallbackGraphics = false;
  const notes: string[] = [];
  const gdat = files.graphics && files.graphics.byteLength > 0 ? parseGdat(files.graphics) : null;
  if (gdat?.ok) {
    // A Dungeon Master II GDAT file: recognized and inspectable, but its art is not used by the game yet.
    graphics = createCleanRoomGraphicsBundle();
    usedFallbackGraphics = true;
    notes.push(`DM2 GRAPHICS: ${listGdatImages(gdat.gdat).length} IMAGES, ${creatureIds(gdat.gdat).length} CREATURES.`);
    notes.push('DM2 ART NOT USED YET: GENERATED ART SHOWN.');
  } else if (files.graphics && files.graphics.byteLength > 0) {
    try {
      graphics = parseGraphicsDat(files.graphics);
    } catch {
      return fail('GRAPHICS_PARSE_FAILED');
    }
  } else {
    graphics = createCleanRoomGraphicsBundle();
    usedFallbackGraphics = true;
  }
  const recognized = levels.length === DM1_LEVEL_COUNT;
  return {
    ok: true,
    campaign,
    graphics,
    usedFallbackGraphics,
    recognized,
    notes,
    text: recognized
      ? `IMPORTED ${levels.length} LEVELS${usedFallbackGraphics ? ' WITH GENERATED ART' : ' WITH YOUR GRAPHICS'}. STARTING.`
      : `IMPORTED ${levels.length} LEVELS: UNRECOGNIZED, NO PARTY.`
  };
}
