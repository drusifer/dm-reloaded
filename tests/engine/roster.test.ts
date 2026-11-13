import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle, parseDungeonDat } from '../../src/data';
import {
  DIRECTION_DELTAS, ROSTER_FORMAT, ROSTER_VERSION, applyRosterImport, checksumText, createInitialGameState,
  dispatchCommand, exportRoster, parseRoster, rankForExperience, serializeSave
} from '../../src/engine';
import type { ChampionDefinition, Direction, GameState } from '../../src/engine/types';
import { partyOf, patchChampion, withItem } from './testkit';

const DAT = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');

function veteran(): GameState {
  let state = withItem(partyOf('iaido', 'zed', 'chani'), 'vet-sword', 'SWORD', { charges: 0 });
  const iaido = state.party.champions[0]!;
  state = patchChampion(state, 0, {
    attributes: { ...iaido.attributes, strength: 77 },
    progression: { experience: iaido.progression.experience.map((_, i) => (i === 2 ? 5000 : i === 12 ? 900 : 0)) },
    inventory: { ...iaido.inventory, slots: { ...iaido.inventory.slots, rightHand: 'vet-sword' } }
  });
  return patchChampion(state, 1, { alive: false, health: 0 });
}

function mirrorPositions(state: GameState) {
  const level = state.levels.find((l) => l.id === state.party.level)!;
  const out: { x: number; y: number; face: Direction; championId: string }[] = [];
  level.tiles.forEach((row, y) => row.forEach((tile, x) => tile.wallFeatures.forEach((f) => {
    if (f.kind === 'CHAMPION_MIRROR' && f.championId) out.push({ x, y, face: f.face, championId: f.championId });
  })));
  return out;
}

function standInFront(state: GameState, m: { x: number; y: number; face: Direction }): GameState {
  const d = DIRECTION_DELTAS[m.face];
  return { ...state, party: { ...state.party, x: m.x + d.dx, y: m.y + d.dy, facing: ((m.face + 2) & 3) as Direction, moveCooldownTicks: 0 } };
}

describe('S6-1 roster export', () => {
  it('exports living champions with derived ranks and gear specs, reporting who was left behind', () => {
    const r = exportRoster(veteran());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.summary.exported).toBe(2);
    expect(r.summary.deadLeftBehind).toBe(1);
    expect(r.messages.join(' ')).toMatch(/LEFT BEHIND: 1 DEAD/);
    expect(r.messages.every((m) => m.length <= 46)).toBe(true);
    const env = JSON.parse(r.text) as { champions: ChampionDefinition[] };
    const iaido = env.champions.find((c) => c.name.startsWith('IAIDO'))!;
    expect(iaido.skills[2]).toBe(rankForExperience(5000));
    expect(iaido.skills[12]).toBe(rankForExperience(900));
    expect(iaido.attributes.strength).toBe(77);
    expect(iaido.startingGearDefs!.some((g) => g.category === 'WEAPON')).toBe(true);
    expect(iaido.startingItems).toContain('SWORD');
  });

  it('refuses with a visible message when nobody is alive', () => {
    const state = patchChampion(partyOf('iaido'), 0, { alive: false, health: 0 });
    const r = exportRoster(state);
    expect(!r.ok && r.message).toMatch(/NO LIVING/);
    expect(exportRoster(createInitialGameState(createCleanRoomBundle())).ok).toBe(false);
  });
});

describe('S6-2 roster validation', () => {
  const good = (): { text: string; env: Record<string, unknown> } => {
    const r = exportRoster(veteran());
    if (!r.ok) throw new Error('export failed');
    return { text: r.text, env: JSON.parse(r.text) as Record<string, unknown> };
  };
  const reason = (t: string | null | undefined) => { const r = parseRoster(t); return r.ok ? 'OK' : r.reason; };
  const mutate = (fn: (champs: Record<string, unknown>[]) => void): string => {
    const { env } = good();
    const champs = env.champions as Record<string, unknown>[];
    fn(champs);
    return JSON.stringify({ ...env, champions: champs, checksum: checksumText(JSON.stringify(champs)) });
  };

  it('round-trips and namespaces ids', () => {
    const parsed = parseRoster(good().text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.champions).toHaveLength(2);
      for (const c of parsed.champions) expect(c.id).toMatch(/^roster_[a-z0-9]+_[0-9a-f]{8}$/);
    }
  });

  it('rejects envelope problems with specific reasons', () => {
    const { env, text } = good();
    expect(reason(null)).toBe('EMPTY');
    expect(reason('{bad')).toBe('NOT_JSON');
    expect(reason('[]')).toBe('WRONG_FORMAT');
    expect(reason(serializeSave(partyOf('iaido')))).toBe('WRONG_FORMAT');
    expect(reason(JSON.stringify({ ...env, version: ROSTER_VERSION + 1 }))).toBe('UNSUPPORTED_VERSION');
    expect(reason(JSON.stringify({ ...env, checksum: '00000000' }))).toBe('CHECKSUM_MISMATCH');
    expect(reason(text.replace('"strength":77', '"strength":78'))).toBe('CHECKSUM_MISMATCH');
    expect(reason(JSON.stringify({ format: ROSTER_FORMAT, version: ROSTER_VERSION }))).toBe('INVALID_ROSTER');
  });

  it('rejects out-of-range, malformed and over-large champion data even with a valid checksum', () => {
    expect(reason(mutate((c) => { (c[0]!.attributes as Record<string, number>).strength = 9999; }))).toBe('INVALID_ROSTER');
    expect(reason(mutate((c) => { c[0]!.skills = [1, 2, 3]; }))).toBe('INVALID_ROSTER');
    expect(reason(mutate((c) => { (c[0]!.skills as number[])[0] = 16; }))).toBe('INVALID_ROSTER');
    expect(reason(mutate((c) => { c[0]!.name = 'X'.repeat(40); }))).toBe('INVALID_ROSTER');
    expect(reason(mutate((c) => { c[0]!.name = 'BAD\u0007NAME'; }))).toBe('INVALID_ROSTER');
    expect(reason(mutate((c) => { c[0]!.gender = 'X'; }))).toBe('INVALID_ROSTER');
    expect(reason(mutate((c) => { c[0]!.maxHealth = 0; }))).toBe('INVALID_ROSTER');
    expect(reason(mutate((c) => { c[0]!.startingGearDefs = [{ category: 'WEAPON', subtype: 9999, charges: 0 }]; }))).toBe('INVALID_ROSTER');
    expect(reason(mutate((c) => { c[0]!.startingGearDefs = [{ category: 'BOGUS', subtype: 0, charges: 0 }]; }))).toBe('INVALID_ROSTER');
    expect(reason(mutate((c) => { c.length = 0; }))).toBe('INVALID_ROSTER');
    expect(reason(mutate((c) => { while (c.length < 9) c.push({ ...c[0]! }); }))).toBe('INVALID_ROSTER');
  });
});

describe('S6-3 Hall placement and recruiting', () => {
  const roster = (): readonly ChampionDefinition[] => {
    const r = exportRoster(veteran());
    if (!r.ok) throw new Error('x');
    const p = parseRoster(r.text);
    if (!p.ok) throw new Error('y');
    return p.champions;
  };

  it('re-points the first mirrors, names who was replaced, and keeps the rest', () => {
    const fresh = createInitialGameState(createCleanRoomBundle());
    const before = mirrorPositions(fresh);
    const out = dispatchCommand(fresh, { type: 'IMPORT_ROSTER', champions: roster() });
    const after = mirrorPositions(out.state);
    expect(after).toHaveLength(before.length);
    expect(after.filter((m) => m.championId.startsWith('roster_'))).toHaveLength(2);
    expect(after.slice(2).map((m) => m.championId)).toEqual(before.slice(2).map((m) => m.championId));
    expect(out.state.messages.slice(-2).join(' ')).toMatch(/2 NOW WAIT AT THE MIRRORS.*REPLACING/);
    expect(out.state.messages.slice(-2).every((m) => m.length <= 46)).toBe(true);
    expect(out.events.some((e) => e.type === 'MESSAGE_LOGGED')).toBe(true);
    for (const m of after.filter((v) => v.championId.startsWith('roster_'))) expect(out.state.championsCatalog[m.championId]).toBeDefined();
  });

  it('recruits an imported champion through the real mirror flow and keeps skills, stats and gear', () => {
    let state = dispatchCommand(createInitialGameState(createCleanRoomBundle()), { type: 'IMPORT_ROSTER', champions: roster() }).state;
    const m = mirrorPositions(state).find((v) => v.championId.startsWith('roster_') && state.championsCatalog[v.championId]!.name.startsWith('IAIDO'))!;
    state = standInFront(state, m);
    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
    expect(state.activeMirror?.champion.id).toBe(m.championId);
    state = dispatchCommand(state, { type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' }).state;
    const c = state.party.champions[0]!;
    expect(c.name.startsWith('IAIDO')).toBe(true);
    expect(c.attributes.strength).toBe(77);
    expect(c.progression.experience[2]).toBeGreaterThanOrEqual(rankForExperience(5000) > 0 ? 1 : 0);
    expect(rankForExperience(c.progression.experience[2]!)).toBe(rankForExperience(5000));
    expect(Object.values(c.inventory.slots).some((id) => id && state.items[id]?.name === 'SWORD')).toBe(true);
    expect(mirrorPositions(state).some((v) => v.championId === m.championId)).toBe(false);
    const ids = Object.keys(state.items);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Reincarnate resets skills through the existing rule', () => {
    let state = dispatchCommand(createInitialGameState(createCleanRoomBundle()), { type: 'IMPORT_ROSTER', champions: roster() }).state;
    const m = mirrorPositions(state).find((v) => v.championId.startsWith('roster_'))!;
    state = dispatchCommand(standInFront(state, m), { type: 'INTERACT_AHEAD' }).state;
    state = dispatchCommand(state, { type: 'RECRUIT_CHAMPION', mode: 'REINCARNATE' }).state;
    expect(state.party.champions[0]!.progression.experience.every((xp) => rankForExperience(xp) === 0)).toBe(true);
  });

  it('is idempotent, respects the party limit, and refuses levels without mirrors', () => {
    const fresh = createInitialGameState(createCleanRoomBundle());
    const once = dispatchCommand(fresh, { type: 'IMPORT_ROSTER', champions: roster() }).state;
    const twice = dispatchCommand(once, { type: 'IMPORT_ROSTER', champions: roster() });
    expect(twice.state.levels).toEqual(once.levels);
    expect(twice.state.messages[twice.state.messages.length - 1]).toMatch(/ALREADY IMPORTED/);
    const full = partyOf('iaido', 'zed', 'chani', 'elija');
    expect(applyRosterImport(full, roster()).message).toMatch(/PARTY IS FULL/);
    const noMirror = { ...fresh, levels: fresh.levels.map((l) => ({ ...l, tiles: l.tiles.map((row) => row.map((t) => ({ ...t, wallFeatures: [] }))) })) };
    expect(applyRosterImport(noMirror, roster()).message).toMatch(/NO CHAMPION MIRRORS/);
    expect(applyRosterImport(noMirror, roster()).state.messages.at(-1)).toMatch(/NO CHAMPION MIRRORS/);
    const three = partyOf('iaido', 'zed', 'chani');
    const placed = applyRosterImport({ ...three, levels: fresh.levels, party: { ...three.party, level: fresh.party.level } }, roster());
    expect(placed.placed).toBe(1);
    expect(placed.lines.join(' ')).toMatch(/1 NOT PLACED/);
  });

  it('never overwrites existing catalog champions', () => {
    const fresh = createInitialGameState(createCleanRoomBundle());
    const [first] = roster();
    const evil = { ...first!, id: 'iaido' };
    const out = applyRosterImport(fresh, [evil]);
    expect(out.placed).toBe(0);
    expect(out.state.championsCatalog.iaido).toEqual(fresh.championsCatalog.iaido);
  });
});

describe.skipIf(!existsSync(DAT))('S6-3 real Amiga Hall', () => {
  it('places the roster on the real Hall mirrors and recruits', () => {
    const bundle = parseDungeonDat(new Uint8Array(readFileSync(DAT)));
    const fresh = createInitialGameState(bundle);
    const r = exportRoster(veteran());
    if (!r.ok) throw new Error('x');
    const p = parseRoster(r.text);
    if (!p.ok) throw new Error('y');
    const before = mirrorPositions(fresh);
    expect(before.length).toBeGreaterThanOrEqual(20);
    let state = dispatchCommand(fresh, { type: 'IMPORT_ROSTER', champions: p.champions }).state;
    const after = mirrorPositions(state);
    expect(after.filter((m) => m.championId.startsWith('roster_'))).toHaveLength(2);
    const m = after.find((v) => v.championId.startsWith('roster_'))!;
    state = dispatchCommand(standInFront(state, m), { type: 'INTERACT_AHEAD' }).state;
    expect(state.activeMirror?.champion.id).toBe(m.championId);
    state = dispatchCommand(state, { type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' }).state;
    expect(state.party.champions).toHaveLength(1);
  });
});
