/**
 * Champion carry-over: pure roster export, strict import validation, and Hall mirror placement.
 *
 * TLDR:
 *   exportRoster(state) -> versioned checksummed JSON of living champions (stats, 16 skill ranks, gear specs).
 *   parseRoster(text) validates without throwing. applyRosterImport(state, champions) adds catalog entries and
 *   re-points the first free champion mirrors on the party's level, so the normal mirror/recruit flow is reused.
 */

import { ITEM_CATALOG_180 } from '../data/itemCatalog';
import { checksumText } from './save';
import { rankForExperience } from './progression';
import type {
  ChampionDefinition,
  ChampionState,
  GameState,
  ItemCategory,
  StartingGearSpec,
  WallFeature
} from './types';

export const ROSTER_FORMAT = 'dm-reloaded-roster';
export const ROSTER_VERSION = 1;
export const MAX_ROSTER_CHAMPIONS = 8;
export const MAX_ROSTER_GEAR = 30;
const PARTY_LIMIT = 4;
const CATEGORIES: readonly ItemCategory[] = ['WEAPON', 'CLOTHES', 'SCROLL', 'POTION', 'CHEST', 'MISC'];

export type RosterFailureReason =
  | 'EMPTY' | 'NOT_JSON' | 'WRONG_FORMAT' | 'UNSUPPORTED_VERSION' | 'CHECKSUM_MISMATCH' | 'INVALID_ROSTER';

export interface RosterExportSummary {
  readonly exported: number;
  readonly deadLeftBehind: number;
  readonly gearCarried: number;
  readonly gearLeftBehind: number;
}

export type RosterExportResult =
  | { readonly ok: true; readonly text: string; readonly summary: RosterExportSummary; readonly messages: readonly string[] }
  | { readonly ok: false; readonly message: string };

export type RosterParseResult =
  | { readonly ok: true; readonly champions: readonly ChampionDefinition[] }
  | { readonly ok: false; readonly reason: RosterFailureReason; readonly text: string };

const FAIL_TEXT: Readonly<Record<RosterFailureReason, string>> = {
  EMPTY: 'ROSTER FILE IS EMPTY.',
  NOT_JSON: 'ROSTER IS CORRUPT (NOT READABLE).',
  WRONG_FORMAT: 'THAT FILE IS NOT A DM RELOADED ROSTER.',
  UNSUPPORTED_VERSION: 'ROSTER VERSION IS NOT SUPPORTED.',
  CHECKSUM_MISMATCH: 'ROSTER IS CORRUPT (CHECKSUM MISMATCH).',
  INVALID_ROSTER: 'ROSTER HAS INVALID CHAMPION DATA.'
};

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10) || 'champ';
}

/** Stable id from content so re-importing the same roster is idempotent and different rosters never collide. */
export function rosterChampionId(def: Omit<ChampionDefinition, 'id'>): string {
  const basis = JSON.stringify([def.name, def.title, def.gender, def.attributes, def.skills, def.maxHealth, def.maxStamina, def.maxMana]);
  return `roster_${slug(def.name)}_${checksumText(basis)}`;
}

/** Display names for the mirror modal; real placement uses startingGearDefs. */
function gearNames(gear: readonly StartingGearSpec[]): string[] {
  return gear.map((g) => ITEM_CATALOG_180.find((d) => d.category === g.category && d.subtype === g.subtype)?.name ?? 'ITEM');
}

function championToDefinition(
  state: GameState,
  champion: ChampionState
): { def: ChampionDefinition; gearCarried: number; gearLeftBehind: number } {
  const ids = [
    ...Object.values(champion.inventory.slots),
    ...champion.inventory.backpack
  ].filter((id): id is string => typeof id === 'string');
  const gear: StartingGearSpec[] = [];
  let left = 0;
  for (const id of ids) {
    const item = state.items[id];
    if (!item || item.bonesChampionId) { left++; continue; }
    const def = ITEM_CATALOG_180[item.defId];
    if (!def || gear.length >= MAX_ROSTER_GEAR) { left++; continue; }
    left += item.contents?.length ?? 0;
    gear.push({ category: def.category, subtype: def.subtype, charges: Math.max(0, Math.min(255, Math.floor(item.charges))) });
  }
  const base = {
    name: champion.name,
    title: champion.title,
    gender: champion.gender,
    portraitIndex: champion.portraitIndex,
    maxHealth: champion.maxHealth,
    maxStamina: champion.maxStamina,
    maxMana: champion.maxMana,
    attributes: { ...champion.attributes },
    skills: champion.progression.experience.map((xp) => rankForExperience(xp)),
    startingItems: gearNames(gear),
    startingGearDefs: gear
  };
  return { def: { ...base, id: rosterChampionId(base) }, gearCarried: gear.length, gearLeftBehind: left };
}

export function exportRoster(state: GameState): RosterExportResult {
  const living = state.party.champions.filter((c) => c.alive);
  if (living.length === 0) return { ok: false, message: 'ROSTER NOT EXPORTED: NO LIVING CHAMPIONS.' };
  let gearCarried = 0;
  let gearLeftBehind = 0;
  const champions = living.map((c) => {
    const r = championToDefinition(state, c);
    gearCarried += r.gearCarried;
    gearLeftBehind += r.gearLeftBehind;
    return r.def;
  });
  const deadLeftBehind = state.party.champions.length - living.length;
  const body = JSON.stringify(champions);
  const text = JSON.stringify({
    format: ROSTER_FORMAT, version: ROSTER_VERSION, checksum: checksumText(body), champions: JSON.parse(body) as unknown
  });
  const left = [
    deadLeftBehind > 0 ? `${deadLeftBehind} DEAD` : '',
    gearLeftBehind > 0 ? `${gearLeftBehind} ITEMS` : ''
  ].filter(Boolean).join(', ');
  return {
    ok: true,
    text,
    summary: { exported: champions.length, deadLeftBehind, gearCarried, gearLeftBehind },
    messages: [
      `ROSTER EXPORTED: ${champions.length} CHAMPIONS, ${gearCarried} ITEMS.`,
      ...(left ? [`LEFT BEHIND: ${left}.`] : [])
    ]
  };
}

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const intIn = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length >= 1 && v.length <= max && /^[\x20-\x7e]+$/.test(v);

function parseGear(value: unknown): StartingGearSpec[] | null {
  if (!Array.isArray(value) || value.length > MAX_ROSTER_GEAR) return null;
  const out: StartingGearSpec[] = [];
  for (const g of value) {
    if (!isRec(g) || typeof g.category !== 'string' || !CATEGORIES.includes(g.category as ItemCategory)
      || !intIn(g.subtype, 0, 255) || !intIn(g.charges ?? 0, 0, 255)) return null;
    const category = g.category as ItemCategory;
    const subtype = g.subtype;
    if (!ITEM_CATALOG_180.some((d) => d.category === category && d.subtype === subtype)) return null;
    out.push({ category, subtype, charges: (g.charges as number | undefined) ?? 0 });
  }
  return out;
}

function parseChampion(value: unknown): ChampionDefinition | null {
  if (!isRec(value)) return null;
  const a = value.attributes;
  const keys = ['luck', 'strength', 'dexterity', 'wisdom', 'vitality', 'antiMagic', 'antiFire'] as const;
  if (!text(value.name, 16) || !text(value.title, 32) || (value.gender !== 'M' && value.gender !== 'F')
    || !intIn(value.portraitIndex, 0, 255) || !intIn(value.maxHealth, 1, 999)
    || !intIn(value.maxStamina, 1, 9999) || !intIn(value.maxMana, 0, 999) || !isRec(a)
    || !keys.every((k) => intIn(a[k], 0, 300))
    || !Array.isArray(value.skills) || value.skills.length !== 16 || !value.skills.every((s) => intIn(s, 0, 15))) return null;
  const gear = parseGear(value.startingGearDefs);
  if (!gear) return null;
  const base = {
    name: value.name, title: value.title, gender: value.gender as 'M' | 'F', portraitIndex: value.portraitIndex,
    maxHealth: value.maxHealth, maxStamina: value.maxStamina, maxMana: value.maxMana,
    attributes: Object.fromEntries(keys.map((k) => [k, a[k] as number])) as unknown as ChampionDefinition['attributes'],
    skills: value.skills as number[], startingItems: gearNames(gear), startingGearDefs: gear
  };
  return { ...base, id: rosterChampionId(base) };
}

export function parseRoster(input: string | null | undefined): RosterParseResult {
  const fail = (reason: RosterFailureReason): RosterParseResult => ({ ok: false, reason, text: FAIL_TEXT[reason] });
  if (input === null || input === undefined || input.trim() === '') return fail('EMPTY');
  let envelope: unknown;
  try { envelope = JSON.parse(input); } catch { return fail('NOT_JSON'); }
  if (!isRec(envelope) || envelope.format !== ROSTER_FORMAT) return fail('WRONG_FORMAT');
  if (envelope.version !== ROSTER_VERSION) return fail('UNSUPPORTED_VERSION');
  if (typeof envelope.checksum !== 'string' || !Array.isArray(envelope.champions)) return fail('INVALID_ROSTER');
  if (checksumText(JSON.stringify(envelope.champions)) !== envelope.checksum) return fail('CHECKSUM_MISMATCH');
  if (envelope.champions.length < 1 || envelope.champions.length > MAX_ROSTER_CHAMPIONS) return fail('INVALID_ROSTER');
  const champions: ChampionDefinition[] = [];
  for (const c of envelope.champions) {
    const parsed = parseChampion(c);
    if (!parsed) return fail('INVALID_ROSTER');
    champions.push(parsed);
  }
  return { ok: true, champions };
}

export interface RosterImportOutcome {
  readonly state: GameState;
  readonly message: string;
  /** Every line appended to the message log, in order. */
  readonly lines: readonly string[];
  readonly placed: number;
}

/** Adds roster champions to the catalog and re-points the first free mirrors on the party's level. */
export function applyRosterImport(state: GameState, champions: readonly ChampionDefinition[]): RosterImportOutcome {
  const refuse = (message: string): RosterImportOutcome => ({
    state: { ...state, messages: [...state.messages, message].slice(-24) }, message, lines: [message], placed: 0
  });
  const clip = (text: string): string => (text.length > 44 ? `${text.slice(0, 43)}.` : text);
  const level = state.levels.find((l) => l.id === state.party.level);
  if (!level) return refuse('NO LEVEL: ROSTER NOT PLACED.');
  const fresh = champions.filter((c) => !state.championsCatalog[c.id] && /^roster_[a-z0-9]+_[0-9a-f]{8}$/.test(c.id));
  if (fresh.length === 0) return refuse('ROSTER ALREADY IMPORTED.');
  const room = Math.max(0, PARTY_LIMIT - state.party.champions.length);
  if (room === 0) return refuse('PARTY IS FULL: ROSTER NOT PLACED.');
  const slots: { x: number; y: number; index: number }[] = [];
  for (let y = 0; y < level.height; y++) for (let x = 0; x < level.width; x++) {
    (level.tiles[y]?.[x]?.wallFeatures ?? []).forEach((f, index) => {
      if (f.kind === 'CHAMPION_MIRROR' && f.championId && !f.championId.startsWith('roster_')) slots.push({ x, y, index });
    });
  }
  if (slots.length === 0) return refuse('NO CHAMPION MIRRORS ON THIS LEVEL.');
  const place = fresh.slice(0, Math.min(room, slots.length));
  const replaced: string[] = [];
  const edits = new Map<string, ChampionDefinition>();
  place.forEach((def, i) => {
    const slot = slots[i]!;
    const old = level.tiles[slot.y]![slot.x]!.wallFeatures[slot.index]!;
    replaced.push(state.championsCatalog[old.championId!]?.name ?? old.championId!);
    edits.set(`${slot.x},${slot.y},${slot.index}`, def);
  });
  const levels = state.levels.map((l) => l.id !== level.id ? l : {
    ...l,
    tiles: l.tiles.map((row, y) => row.map((tile, x) => ({
      ...tile,
      wallFeatures: tile.wallFeatures.map((f, index): WallFeature => {
        const def = edits.get(`${x},${y},${index}`);
        return def ? { ...f, championId: def.id, portraitIndex: def.portraitIndex } : f;
      })
    })))
  });
  const catalog = { ...state.championsCatalog };
  for (const def of place) catalog[def.id] = def;
  const skipped = fresh.length - place.length;
  const shown = replaced.slice(0, 3).join(', ') + (replaced.length > 3 ? ` +${replaced.length - 3} MORE` : '');
  const message = `ROSTER: ${place.length} NOW WAIT AT THE MIRRORS.`;
  const lines = [message, clip(`REPLACING ${shown}.`), ...(skipped > 0 ? [`${skipped} NOT PLACED (NO ROOM).`] : [])];
  const messages = [...state.messages, ...lines].slice(-24);
  return { state: { ...state, levels, championsCatalog: catalog, messages }, message, lines, placed: place.length };
}
