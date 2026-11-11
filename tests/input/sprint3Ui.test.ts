import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle } from '../../src/data';
import { combatActionFailureReason, dispatchCommand, experienceFloorForRank, nextRandom } from '../../src/engine';
import { resolveKeyboardCommand, resolvePointerHitCommand } from '../../src/input';
import {
  ACTION_PANEL_RECTS, Framebuffer, LAYOUT_RECTS, RUNE_RECTS,
  RUNE_PANEL_RECTS, combatFailureDisplayText, projectileMarkerRect, renderFrame
} from '../../src/render';
import { partyOf, patchChampion, withItem } from '../engine/testkit';

function equippedParty() {
  let state = withItem(partyOf('iaido', 'zed'), 'sword', 'SWORD');
  const champion = state.party.champions[0]!;
  state = patchChampion(state, 0, {
    inventory: { ...champion.inventory, slots: { ...champion.inventory.slots, rightHand: 'sword' } }
  });
  return state;
}

describe('Sprint 3 Phase 4 shared interaction owner', () => {
  it('opens an action panel from an occupied hand and captures panel mouse flow', () => {
    const state = equippedParty();
    const hand = { x: 54, y: 10 };
    expect(resolvePointerHitCommand(hand.x + 2, hand.y + 2, state)).toEqual({
      type: 'OPEN_ACTION_MENU', championIndex: 0, hand: 'rightHand'
    });
    const opened = dispatchCommand(state, resolvePointerHitCommand(hand.x + 2, hand.y + 2, state)!).state;
    expect(opened.interaction).toEqual({ kind: 'ACTION_MENU', championIndex: 0, hand: 'rightHand' });
    expect(resolvePointerHitCommand(ACTION_PANEL_RECTS.RUNES.x + 2, ACTION_PANEL_RECTS.RUNES.y + 2, opened))
      .toEqual({ type: 'OPEN_RUNE_PANEL', championIndex: 0 });
    expect(resolvePointerHitCommand(LAYOUT_RECTS.MOVEMENT_PAD.x + 10, LAYOUT_RECTS.MOVEMENT_PAD.y + 5, opened))
      .toBeNull();
  });

  it('uses canonical combat validation for missing ammunition and invalid target without mutation', () => {
    let bow = withItem(partyOf('iaido'), 'bow', 'BOW');
    const champion = bow.party.champions[0]!;
    bow = patchChampion(bow, 0, { inventory: {
      ...champion.inventory, slots: { ...champion.inventory.slots, rightHand: 'bow' }
    } });
    const ahead = { id: 'target', level: bow.party.level, x: bow.party.x + 1, y: bow.party.y,
      lane: 'LEFT' as const, traits: [], maxHealth: 10, health: 10, defeated: false };
    const missingAmmo = { ...bow, combatTargets: [ahead] };
    expect(combatActionFailureReason(missingAmmo, { championIndex: 0, hand: 'rightHand', actionId: 'SHOOT' }))
      .toBe('MISSING_AMMUNITION');
    expect(combatFailureDisplayText('MISSING_AMMUNITION')).toBe('MISSING AMMO');
    const noTarget = withItem(bow, 'arrow', 'ARROW');
    const withArrow = patchChampion(noTarget, 0, { inventory: {
      ...noTarget.party.champions[0]!.inventory,
      slots: { ...noTarget.party.champions[0]!.inventory.slots, quiver1: 'arrow' }
    } });
    expect(combatActionFailureReason(withArrow, { championIndex: 0, hand: 'rightHand', actionId: 'SHOOT' }))
      .toBe('INVALID_TARGET');
    expect(combatFailureDisplayText('INVALID_TARGET')).toBe('INVALID TARGET');
    const rejected = dispatchCommand(withArrow, { type: 'EXECUTE_COMBAT_ACTION', championIndex: 0, hand: 'rightHand', actionId: 'SHOOT' });
    expect(rejected.state.rngState).toBe(withArrow.rngState);
    expect(rejected.state.party.champions[0]!.stamina).toBe(withArrow.party.champions[0]!.stamina);
  });

  it('gives mirror and every Sprint 3 interaction pointer ownership before utility pills', () => {
    const base = equippedParty();
    const utilityPoints = [[280, 4], [280, 13], [307, 22]] as const;
    expect(resolvePointerHitCommand(280, 4, base)).toEqual({ type: 'TOGGLE_QOL_MODE' });
    const mirror = { ...base, activeMirror: { wallX: 1, wallY: 1, face: 0 as const, champion: base.party.champions[0]! } };
    for (const [x, y] of utilityPoints) expect(resolvePointerHitCommand(x, y, mirror)).toBeNull();
    for (const command of [
      { type: 'OPEN_ACTION_MENU', championIndex: 0, hand: 'rightHand' as const },
      { type: 'OPEN_RUNE_PANEL', championIndex: 0 },
      { type: 'OPEN_PROGRESSION_VIEW', championIndex: 0 }
    ] as const) {
      const owned = dispatchCommand(base, command).state;
      for (const [x, y] of utilityPoints) expect(resolvePointerHitCommand(x, y, owned)).toBeNull();
    }
  });

  it('maps all rune cells by shared rectangles, gates shortcuts to QoL, and closes on Escape', () => {
    let state = dispatchCommand(equippedParty(), { type: 'OPEN_RUNE_PANEL', championIndex: 0 }).state;
    expect(RUNE_RECTS).toHaveLength(24);
    expect(resolvePointerHitCommand(RUNE_RECTS[23]!.x + 1, RUNE_RECTS[23]!.y + 1, state))
      .toEqual({ type: 'ADD_RUNE', championIndex: 0, rune: 'SAR' });
    expect(resolveKeyboardCommand('1', state)).toBeNull();
    state = dispatchCommand(state, { type: 'TOGGLE_QOL_MODE' }).state;
    expect(resolveKeyboardCommand('1', state)).toEqual({ type: 'ADD_RUNE', championIndex: 0, rune: 'LO' });
    expect(resolveKeyboardCommand('g', state)).toEqual({ type: 'ADD_RUNE', championIndex: 0, rune: 'BRO' });
    expect(resolveKeyboardCommand('b', state)).toEqual({ type: 'ADD_RUNE', championIndex: 0, rune: 'RA' });
    expect(resolveKeyboardCommand('Escape', state)).toEqual({ type: 'CLOSE_INTERACTION' });
  });

  it('closes rune focus after every committed outcome but preserves rejected recovery state', () => {
    const seedFor = (predicate: (value: number) => boolean) => {
      for (let seed = 1; seed < 20_000; seed += 1) if (predicate(nextRandom(seed).value)) return seed;
      throw new Error('seed not found');
    };
    for (const predicate of [
      (value: number) => value < 0.6,
      (value: number) => value >= 0.6 && value < 0.85,
      (value: number) => value >= 0.85
    ]) {
      let state = equippedParty();
      const champion = state.party.champions[0]!;
      const experience = champion.progression.experience.map((value, index) =>
        index === 12 ? experienceFloorForRank(1) : value);
      state = patchChampion(state, 0, { progression: { experience } });
      state = { ...state, rngState: seedFor(predicate) };
      state = dispatchCommand(state, { type: 'OPEN_RUNE_PANEL', championIndex: 0 }).state;
      for (const rune of ['LO', 'FUL', 'IR'] as const) state = dispatchCommand(state, { type: 'ADD_RUNE', championIndex: 0, rune }).state;
      expect(dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 0 }).state.interaction.kind).toBe('NONE');
    }
    let rejected = dispatchCommand(equippedParty(), { type: 'OPEN_RUNE_PANEL', championIndex: 0 }).state;
    rejected = dispatchCommand(rejected, { type: 'ADD_RUNE', championIndex: 0, rune: 'FUL' }).state;
    const result = dispatchCommand(rejected, { type: 'INVOKE_RUNES', championIndex: 0 });
    expect(result.state.interaction.kind).toBe('RUNE_PANEL');
    expect(result.state.runeFormulas.iaido).toEqual(['FUL']);
  });

  it('cleans interaction ownership on inventory, sleep, death, and mirror lifecycle', () => {
    const opened = dispatchCommand(equippedParty(), { type: 'OPEN_ACTION_MENU', championIndex: 0, hand: 'rightHand' }).state;
    expect(dispatchCommand(opened, { type: 'TOGGLE_INVENTORY', championIndex: 0 }).state.interaction.kind).toBe('NONE');
    expect(dispatchCommand(opened, { type: 'SET_SLEEPING', sleeping: true }).state.interaction.kind).toBe('NONE');
    const dying = patchChampion(opened, 0, { health: 0 });
    expect(dispatchCommand(dying, { type: 'TICK' }).state.interaction.kind).toBe('NONE');
    const mirrored = { ...opened, activeMirror: { wallX: 1, wallY: 1, face: 0 as const, champion: opened.party.champions[0]! } };
    expect(dispatchCommand(mirrored, { type: 'TICK' }).state.interaction.kind).toBe('NONE');
  });
});

describe('Sprint 3 Phase 4 render presentation', () => {
  it('renders ordered formula previews through LO, Lo Ful Ir, DEL, CLR, and invalid recovery in both sources', () => {
    const clean = createCleanRoomGraphicsBundle();
    const font = new Uint8Array(768);
    for (let rune = 0; rune < 24; rune += 1) for (let row = 0; row < 6; row += 1) {
      font[row * 128 + 97 + rune] = ((rune + row) % 2 === 0 ? 0x2a : 0x15);
    }
    const original = { ...clean, source: 'AMIGA_GRAPHICS_DAT' as const, systemFont: font };
    const pixels = (state: ReturnType<typeof equippedParty>, graphics: typeof clean) => {
      const fb = new Framebuffer();
      renderFrame(fb, state, { graphics });
      const rect = RUNE_PANEL_RECTS.FORMULA;
      const out: number[] = [];
      for (let y = rect.y; y < rect.y + rect.h; y += 1) for (let x = rect.x; x < rect.x + rect.w; x += 1) out.push(...fb.getPixel(x, y));
      return out;
    };
    for (const graphics of [clean, original]) {
      let state = dispatchCommand(equippedParty(), { type: 'OPEN_RUNE_PANEL', championIndex: 0 }).state;
      const empty = pixels(state, graphics);
      state = dispatchCommand(state, { type: 'ADD_RUNE', championIndex: 0, rune: 'LO' }).state;
      const lo = pixels(state, graphics);
      expect(lo).not.toEqual(empty);
      for (const rune of ['FUL', 'IR'] as const) state = dispatchCommand(state, { type: 'ADD_RUNE', championIndex: 0, rune }).state;
      const full = pixels(state, graphics);
      expect(full).not.toEqual(lo);
      state = dispatchCommand(state, { type: 'REMOVE_RUNE', championIndex: 0 }).state;
      expect(pixels(state, graphics)).not.toEqual(full);
      state = dispatchCommand(state, { type: 'CLEAR_RUNES', championIndex: 0 }).state;
      expect(pixels(state, graphics)).toEqual(empty);
      state = dispatchCommand(state, { type: 'ADD_RUNE', championIndex: 0, rune: 'FUL' }).state;
      const invalid = pixels(state, graphics);
      const rejected = dispatchCommand(state, { type: 'INVOKE_RUNES', championIndex: 0 }).state;
      expect(rejected.runeFormulas.iaido).toEqual(['FUL']);
      expect(pixels(rejected, graphics)).toEqual(invalid);
    }
  });

  it('renders the active panel inside the right deck without changing champion bars or messages', () => {
    const base = equippedParty();
    const state = dispatchCommand(base, { type: 'OPEN_RUNE_PANEL', championIndex: 0 }).state;
    const before = new Framebuffer();
    const after = new Framebuffer();
    const graphics = createCleanRoomGraphicsBundle();
    renderFrame(before, base, { graphics });
    renderFrame(after, state, { graphics });
    expect(Array.from(after.rgba.slice(0, 320 * 29 * 4))).toEqual(Array.from(before.rgba.slice(0, 320 * 29 * 4)));
    expect(after.getPixel(LAYOUT_RECTS.RIGHT_DECK.x + 3, LAYOUT_RECTS.RIGHT_DECK.y + 3))
      .not.toEqual(before.getPixel(LAYOUT_RECTS.RIGHT_DECK.x + 3, LAYOUT_RECTS.RIGHT_DECK.y + 3));
  });

  it('projects near/far, left/right projectiles into the viewport for all facings', () => {
    const base = equippedParty();
    for (const facing of [0, 1, 2, 3] as const) {
      for (const lane of ['LEFT', 'RIGHT'] as const) {
        const fwd = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }][facing]!;
        const projectile = {
          id: 'near', itemId: null, ownerChampionId: 'iaido', level: base.party.level,
          x: base.party.x + fwd.dx, y: base.party.y + fwd.dy, direction: facing, lane,
          power: 4, kineticEnergy: 4, stepEnergyCost: 1,
          payload: { kind: 'SPELL', spellId: 'FIREBALL', effectId: 'FIRE', explosive: true }
        } as const;
        const near = projectileMarkerRect({ ...base, party: { ...base.party, facing } }, projectile);
        const far = projectileMarkerRect({ ...base, party: { ...base.party, facing } },
          { ...projectile, id: 'far', x: base.party.x + fwd.dx * 3, y: base.party.y + fwd.dy * 3 });
        expect(near).not.toBeNull();
        expect(far).not.toBeNull();
        expect(near!.w).toBeGreaterThan(far!.w);
        expect(near!.x).not.toBe(far!.x);
      }
    }
  });
});
