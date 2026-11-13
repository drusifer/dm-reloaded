/**
 * Pure versioned save codec for GameState.
 *
 * TLDR:
 *   serializeSave wraps the plain-data state in {format,version,campaignId,checksum,state};
 *   deserializeSave validates every envelope field and never throws. No DOM or storage here.
 */

import type { GameState } from './types';

export const SAVE_FORMAT = 'dm-reloaded-save';
export const SAVE_VERSION = 1;

export type SaveFailureReason =
  | 'EMPTY'
  | 'NOT_JSON'
  | 'WRONG_FORMAT'
  | 'UNSUPPORTED_VERSION'
  | 'CHECKSUM_MISMATCH'
  | 'WRONG_CAMPAIGN'
  | 'INVALID_STATE';

export type DeserializeResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly reason: SaveFailureReason; readonly text: string };

const FAILURE_TEXT: Readonly<Record<SaveFailureReason, string>> = {
  EMPTY: 'NO SAVE FOUND.',
  NOT_JSON: 'SAVE IS CORRUPT (NOT READABLE).',
  WRONG_FORMAT: 'THAT FILE IS NOT A DM RELOADED SAVE.',
  UNSUPPORTED_VERSION: 'SAVE VERSION IS NOT SUPPORTED.',
  CHECKSUM_MISMATCH: 'SAVE IS CORRUPT (CHECKSUM MISMATCH).',
  WRONG_CAMPAIGN: 'SAVE BELONGS TO A DIFFERENT CAMPAIGN.',
  INVALID_STATE: 'SAVE IS INCOMPLETE OR DAMAGED.'
};

/** FNV-1a 32-bit over UTF-16 code units; adequate for accidental-corruption detection. */
export function checksumText(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function serializeSave(state: GameState): string {
  const body = JSON.stringify(state);
  return JSON.stringify({
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    campaignId: state.campaignId,
    savedAtTick: state.tick,
    checksum: checksumText(body),
    state: JSON.parse(body) as unknown
  });
}

function fail(reason: SaveFailureReason): DeserializeResult {
  return { ok: false, reason, text: FAILURE_TEXT[reason] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function plausibleState(value: unknown): value is GameState {
  if (!isRecord(value)) return false;
  const party = value.party;
  return typeof value.tick === 'number' && Number.isFinite(value.tick)
    && typeof value.rngState === 'number' && Number.isFinite(value.rngState)
    && typeof value.campaignId === 'string'
    && Array.isArray(value.levels) && value.levels.length > 0
    && Array.isArray(value.combatTargets) && Array.isArray(value.projectiles)
    && Array.isArray(value.messages) && isRecord(value.items) && isRecord(value.settings)
    && isRecord(party) && Array.isArray(party.champions)
    && typeof party.level === 'number' && typeof party.x === 'number' && typeof party.y === 'number'
    && isRecord(value.interaction);
}

export function deserializeSave(text: string | null | undefined, campaignId: string): DeserializeResult {
  if (text === null || text === undefined || text.trim() === '') return fail('EMPTY');
  let envelope: unknown;
  try {
    envelope = JSON.parse(text);
  } catch {
    return fail('NOT_JSON');
  }
  if (!isRecord(envelope) || envelope.format !== SAVE_FORMAT) return fail('WRONG_FORMAT');
  if (envelope.version !== SAVE_VERSION) return fail('UNSUPPORTED_VERSION');
  if (typeof envelope.checksum !== 'string' || envelope.state === undefined) return fail('INVALID_STATE');
  if (checksumText(JSON.stringify(envelope.state)) !== envelope.checksum) return fail('CHECKSUM_MISMATCH');
  if (envelope.campaignId !== campaignId) return fail('WRONG_CAMPAIGN');
  if (!plausibleState(envelope.state) || envelope.state.campaignId !== campaignId) return fail('INVALID_STATE');
  return { ok: true, state: envelope.state };
}
