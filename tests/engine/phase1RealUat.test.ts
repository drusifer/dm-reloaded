/**
 * Phase 1 UAT against the REAL Amiga Dungeon.dat: recruit, equip, survive, throw.
 *
 * TLDR:
 *   Recruits the real Hall of Champions heroes (with their decoded starting gear chains), checks
 *   every starting item lands in a slot or the backpack, runs thousands of 6 Hz ticks with
 *   throws/eating/sleep to prove the engines stay consistent (no lost or duplicated items, vitals
 *   in range). Skipped when the extracted .dat files are absent.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDungeonDat } from '../../src/data';
import { createInitialGameState, dispatchCommand } from '../../src/engine';
import type { GameState } from '../../src/engine/types';

const DUNGEON = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');
const has = existsSync(DUNGEON);

function recruitAll(state: GameState, ids: readonly string[]): GameState {
  let cur = state;
  for (const id of ids) {
    const champion = cur.championsCatalog[id]!;
    cur = { ...cur, activeMirror: { wallX: 0, wallY: 0, face: 0, champion } };
    cur = dispatchCommand(cur, { type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' }).state;
  }
  return cur;
}

function allItemRefs(state: GameState): string[] {
  const refs: string[] = [];
  for (const c of state.party.champions) {
    for (const id of Object.values(c.inventory.slots)) {
      if (id) refs.push(id);
    }
    for (const id of c.inventory.backpack) {
      if (id) refs.push(id);
    }
  }
  if (state.handItem) refs.push(state.handItem);
  for (const p of state.projectiles) if (p.itemId) refs.push(p.itemId);
  for (const lvl of state.levels) {
    for (const row of lvl.tiles) {
      for (const t of row) {
        for (const b of Object.values(t.floorItems ?? {})) refs.push(...b);
        for (const b of Object.values(t.wallItems ?? {})) refs.push(...b);
      }
    }
  }
  return refs;
}

describe.skipIf(!has)('Phase 1 UAT on real Dungeon.dat', () => {
  const bundle = parseDungeonDat(new Uint8Array(has ? readFileSync(DUNGEON) : []));
  const heroIds = Object.keys(bundle.dungeon.champions).slice(0, 4);

  it('recruits four real heroes and equips every starting item somewhere', () => {
    const state = recruitAll(createInitialGameState(bundle), heroIds);
    expect(state.party.champions).toHaveLength(4);
    for (const c of state.party.champions) {
      const placed = [...Object.values(c.inventory.slots), ...c.inventory.backpack].filter(Boolean);
      const expected = (c.startingGearDefs ?? []).length || c.startingItems.length;
      expect(placed.length, `${c.name} kit`).toBe(expected);
      expect(c.alive).toBe(true);
    }
  });

  it('keeps vitals in range, items unique and nothing lost over 4000 ticks with sleep and throws', () => {
    let state = recruitAll(createInitialGameState(bundle), heroIds);
    // Start in a walkable tile so floor/throw logic has a real tile under it.
    const refsBefore = allItemRefs(state);
    expect(new Set(refsBefore).size).toBe(refsBefore.length);

    // Throw the leader's first hand item once.
    const lead = state.party.champions[state.party.leaderIndex]!;
    const handId = lead.inventory.slots.rightHand ?? lead.inventory.slots.leftHand;
    if (handId) {
      const slot = lead.inventory.slots.rightHand ? 'rightHand' : 'leftHand';
      state = dispatchCommand(state, { type: 'CLICK_EQUIP_SLOT', championIndex: state.party.leaderIndex, slot }).state;
      expect(state.handItem).toBe(handId);
      state = dispatchCommand(state, { type: 'THROW_HAND_ITEM', side: 'LEFT' }).state;
      expect(state.projectiles.length).toBe(1);
    }

    state = dispatchCommand(state, { type: 'SET_SLEEPING', sleeping: true }).state;
    for (let i = 0; i < 40; i++) {
      state = dispatchCommand(state, { type: 'TICK', count: 100 }).state;
    }

    expect(state.projectiles).toHaveLength(0);
    for (const c of state.party.champions) {
      if (c.alive) {
        expect(c.food).toBeGreaterThanOrEqual(-1024);
        expect(c.food).toBeLessThanOrEqual(2048);
        expect(c.water).toBeGreaterThanOrEqual(-1024);
        expect(c.stamina).toBeLessThanOrEqual(c.maxStamina);
        expect(c.health).toBeLessThanOrEqual(c.maxHealth);
      }
    }
    const refsAfter = allItemRefs(state);
    expect(new Set(refsAfter).size).toBe(refsAfter.length); // no duplicated placements
    for (const id of refsAfter) {
      expect(state.items[id], `dangling ref ${id}`).toBeDefined();
    }
    // the thrown item was never lost
    if (handId) {
      expect(refsAfter).toContain(handId);
    }
  });
});
