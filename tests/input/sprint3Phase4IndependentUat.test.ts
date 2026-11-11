import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle } from '../../src/data';
import {
  combatActionFailureReason,
  dispatchCommand,
  validateCombatAction
} from '../../src/engine';
import type { GameState, RuneId } from '../../src/engine/types';
import { resolveKeyboardCommand, resolvePointerHitCommand } from '../../src/input';
import {
  Framebuffer,
  LAYOUT_RECTS,
  PALETTE_INDEX,
  PROGRESSION_PANEL_RECTS,
  RUNE_PANEL_RECTS,
  RUNE_RECTS,
  championHandRect,
  drawBitmapText,
  getUiPalette,
  projectileMarkerRect,
  renderFrame
} from '../../src/render';
import { hold, partyOf, patchChampion, placeAt, withItem } from '../engine/testkit';

const QA_RUNES: readonly RuneId[] = [
  'LO', 'UM', 'ON', 'POWER_EE', 'PAL', 'MON',
  'YA', 'VI', 'OH', 'FUL', 'DES', 'ZO',
  'VEN', 'EW', 'KATH', 'IR', 'BRO', 'GOR',
  'KU', 'ROS', 'DAIN', 'NETA', 'RA', 'SAR'
];

function center(rect: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }) {
  return { x: rect.x + Math.floor(rect.w / 2), y: rect.y + Math.floor(rect.h / 2) };
}

function equip(state = partyOf('iaido', 'zed', 'chani'), championIndex = 0): GameState {
  const id = `qa-sword-${championIndex}`;
  const withSword = withItem(state, id, 'SWORD');
  const champion = withSword.party.champions[championIndex]!;
  return patchChampion(withSword, championIndex, {
    inventory: {
      ...champion.inventory,
      slots: { ...champion.inventory.slots, rightHand: id }
    }
  });
}

function rgbaRegion(fb: Framebuffer, x: number, y: number, w: number, h: number): number[] {
  const out: number[] = [];
  for (let py = y; py < y + h; py += 1) {
    const start = (py * 320 + x) * 4;
    out.push(...fb.rgba.slice(start, start + w * 4));
  }
  return out;
}

function qaSeed(predicate: (value: number) => boolean): number {
  for (let seed = 1; seed < 10_000; seed += 1) {
    const next = (seed + 1_831_565_813) | 0;
    let mixed = Math.imul(next ^ (next >>> 15), next | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    if (predicate(((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296)) return seed;
  }
  throw new Error('QA seed search exhausted');
}

describe('Sprint 3 Phase 4 independent interaction UAT', () => {
  it('keeps cursor/inventory hand ownership ahead of action menus and clears every lifecycle owner', () => {
    let state = equip();
    const hand = championHandRect(0, 'rightHand');
    const hit = center(hand);
    expect(resolvePointerHitCommand(hit.x, hit.y, state)).toEqual({
      type: 'OPEN_ACTION_MENU', championIndex: 0, hand: 'rightHand'
    });

    state = withItem(state, 'qa-cursor', 'APPLE');
    const carried = hold(state, 'qa-cursor');
    expect(resolvePointerHitCommand(hit.x, hit.y, carried)).toEqual({
      type: 'CLICK_EQUIP_SLOT', championIndex: 0, slot: 'rightHand'
    });
    expect(dispatchCommand(carried, {
      type: 'OPEN_ACTION_MENU', championIndex: 0, hand: 'rightHand'
    }).state.interaction.kind).toBe('NONE');

    const inventory = { ...state, openInventoryChampionIndex: 0 };
    expect(resolvePointerHitCommand(hit.x, hit.y, inventory)).toEqual({
      type: 'CLICK_EQUIP_SLOT', championIndex: 0, slot: 'rightHand'
    });

    const opened = dispatchCommand(state, {
      type: 'OPEN_ACTION_MENU', championIndex: 0, hand: 'rightHand'
    }).state;
    expect(dispatchCommand(opened, { type: 'TOGGLE_INVENTORY', championIndex: 0 }).state.interaction.kind)
      .toBe('NONE');
    expect(dispatchCommand(opened, { type: 'SET_SLEEPING', sleeping: true }).state.interaction.kind)
      .toBe('NONE');
    expect(dispatchCommand(patchChampion(opened, 0, { health: 0 }), { type: 'TICK' }).state.interaction.kind)
      .toBe('NONE');
    const mirrored = {
      ...opened,
      activeMirror: { wallX: 1, wallY: 1, face: 0 as const, champion: opened.party.champions[0]! }
    };
    expect(dispatchCommand(mirrored, { type: 'TICK' }).state.interaction.kind).toBe('NONE');
  });

  it('maps every shared mouse rectangle and captures QoL keys without Purist leakage', () => {
    let panel = dispatchCommand(equip(), { type: 'OPEN_RUNE_PANEL', championIndex: 0 }).state;
    expect(RUNE_RECTS).toHaveLength(24);
    for (let index = 0; index < QA_RUNES.length; index += 1) {
      const hit = center(RUNE_RECTS[index]!);
      expect(resolvePointerHitCommand(hit.x, hit.y, panel)).toEqual({
        type: 'ADD_RUNE', championIndex: 0, rune: QA_RUNES[index]
      });
    }
    for (const [rect, command] of [
      [RUNE_PANEL_RECTS.REMOVE, { type: 'REMOVE_RUNE', championIndex: 0 }],
      [RUNE_PANEL_RECTS.CLEAR, { type: 'CLEAR_RUNES', championIndex: 0 }],
      [RUNE_PANEL_RECTS.INVOKE, { type: 'INVOKE_RUNES', championIndex: 0 }],
      [RUNE_PANEL_RECTS.CLOSE, { type: 'CLOSE_INTERACTION' }]
    ] as const) {
      const hit = center(rect);
      expect(resolvePointerHitCommand(hit.x, hit.y, panel)).toEqual(command);
    }
    expect(resolveKeyboardCommand('g', panel)).toBeNull();
    expect(resolveKeyboardCommand('b', panel)).toBeNull();
    expect(resolveKeyboardCommand('ArrowUp', panel)).toBeNull();

    panel = dispatchCommand(panel, { type: 'TOGGLE_QOL_MODE' }).state;
    expect(resolveKeyboardCommand('g', panel)).toEqual({
      type: 'ADD_RUNE', championIndex: 0, rune: 'BRO'
    });
    expect(resolveKeyboardCommand('b', panel)).toEqual({
      type: 'ADD_RUNE', championIndex: 0, rune: 'RA'
    });
    expect(resolveKeyboardCommand('ArrowUp', panel)).toBeNull();
    expect(resolveKeyboardCommand('Escape', panel)).toEqual({ type: 'CLOSE_INTERACTION' });

    const closed = dispatchCommand(panel, { type: 'CLOSE_INTERACTION' }).state;
    expect(resolveKeyboardCommand('ArrowUp', closed)).toEqual({ type: 'MOVE', direction: 'FORWARD' });
    const progression = dispatchCommand(closed, { type: 'OPEN_PROGRESSION_VIEW', championIndex: 0 }).state;
    const close = center(PROGRESSION_PANEL_RECTS.CLOSE);
    expect(resolvePointerHitCommand(close.x, close.y, progression)).toEqual({ type: 'CLOSE_INTERACTION' });
    expect(resolvePointerHitCommand(LAYOUT_RECTS.MOVEMENT_PAD.x + 2, LAYOUT_RECTS.MOVEMENT_PAD.y + 2, progression))
      .toBeNull();
  });

  it('gives mirror and active interaction owners priority over all utility pointers', () => {
    const base = equip();
    const utilities = [
      center(LAYOUT_RECTS.QOL_PILL),
      center(LAYOUT_RECTS.AUTOMAP_PILL),
      center(LAYOUT_RECTS.AUDIO_PILL)
    ] as const;
    expect(resolvePointerHitCommand(utilities[0].x, utilities[0].y, base))
      .toEqual({ type: 'TOGGLE_QOL_MODE' });
    expect(resolvePointerHitCommand(utilities[1].x, utilities[1].y, base))
      .toEqual({ type: 'TOGGLE_AUTOMAP' });
    expect(resolvePointerHitCommand(utilities[2].x, utilities[2].y, base))
      .toEqual({ type: 'SET_AUDIO_MUTED', muted: true });

    const mirror: GameState = {
      ...base,
      activeMirror: { wallX: 1, wallY: 1, face: 0, champion: base.party.champions[0]! }
    };
    for (const point of utilities) expect(resolvePointerHitCommand(point.x, point.y, mirror)).toBeNull();

    for (const interaction of [
      { kind: 'ACTION_MENU', championIndex: 0, hand: 'rightHand' },
      { kind: 'RUNE_PANEL', championIndex: 0 },
      { kind: 'PROGRESSION_VIEW', championIndex: 0 }
    ] as const) {
      const owned = { ...base, interaction };
      for (const point of utilities) expect(resolvePointerHitCommand(point.x, point.y, owned)).toBeNull();
    }

    const sleeping = { ...base, party: { ...base.party, sleeping: true } };
    for (const point of utilities) {
      expect(resolvePointerHitCommand(point.x, point.y, sleeping))
        .toEqual({ type: 'SET_SLEEPING', sleeping: false });
      expect(resolvePointerHitCommand(point.x, point.y, { ...base, gameOver: true })).toBeNull();
    }
  });

  it('closes every committed outcome and preserves every pre-validation recovery state', () => {
    const wizard = (rank: 0 | 1, mana = 99): GameState => {
      let state = equip();
      const champion = state.party.champions[0]!;
      state = patchChampion(state, 0, {
        mana,
        progression: {
          experience: champion.progression.experience.map((xp, index) =>
            index === 12 ? (rank === 1 ? 100 : 0) : xp)
        }
      });
      state = dispatchCommand(state, { type: 'OPEN_RUNE_PANEL', championIndex: 0 }).state;
      for (const rune of ['LO', 'FUL', 'IR'] as const) {
        state = dispatchCommand(state, { type: 'ADD_RUNE', championIndex: 0, rune }).state;
      }
      return state;
    };

    for (const outcome of [
      { type: 'SPELL_SUCCEEDED', seed: qaSeed((value) => value < 0.6) },
      { type: 'SPELL_FIZZLED', seed: qaSeed((value) => value >= 0.6 && value < 0.85) },
      { type: 'SPELL_BACKFIRED', seed: qaSeed((value) => value >= 0.85) }
    ] as const) {
      const result = dispatchCommand({ ...wizard(1), rngState: outcome.seed }, {
        type: 'INVOKE_RUNES', championIndex: 0
      });
      expect(result.events.some((event) => event.type === outcome.type)).toBe(true);
      expect(result.state.interaction.kind).toBe('NONE');
      expect(result.state.runeFormulas.iaido).toEqual([]);
    }

    let brew = withItem(equip(), 'qa-flask', 'EMPTY FLASK');
    const brewer = brew.party.champions[0]!;
    brew = patchChampion(brew, 0, {
      mana: 99,
      progression: {
        experience: brewer.progression.experience.map((xp, index) => index === 8 ? 100 : xp)
      },
      inventory: {
        ...brewer.inventory,
        slots: { ...brewer.inventory.slots, pouch1: 'qa-flask' }
      }
    });
    brew = dispatchCommand(brew, { type: 'OPEN_RUNE_PANEL', championIndex: 0 }).state;
    brew = dispatchCommand(brew, {
      type: 'SELECT_BREW_FLASK', championIndex: 0, flaskId: 'qa-flask'
    }).state;
    for (const rune of ['LO', 'VI'] as const) {
      brew = dispatchCommand(brew, { type: 'ADD_RUNE', championIndex: 0, rune }).state;
    }
    const brewed = dispatchCommand({ ...brew, rngState: qaSeed((value) => value < 0.6) }, {
      type: 'INVOKE_RUNES', championIndex: 0
    });
    expect(brewed.events.some((event) => event.type === 'POTION_BREWED')).toBe(true);
    expect(brewed.state.interaction.kind).toBe('NONE');

    const invalidBase = dispatchCommand(equip(), {
      type: 'OPEN_RUNE_PANEL', championIndex: 0
    }).state;
    const invalid = dispatchCommand(invalidBase, {
      type: 'ADD_RUNE', championIndex: 0, rune: 'LO'
    }).state;
    for (const entry of [
      { state: invalid, reason: 'INVALID_FORMULA', formula: ['LO'] },
      { state: wizard(1, 0), reason: 'INSUFFICIENT_MANA', formula: ['LO', 'FUL', 'IR'] },
      { state: wizard(0), reason: 'INSUFFICIENT_SKILL', formula: ['LO', 'FUL', 'IR'] }
    ] as const) {
      const before = entry.state;
      const result = dispatchCommand(before, { type: 'INVOKE_RUNES', championIndex: 0 });
      expect(result.events).toContainEqual(expect.objectContaining({
        type: 'SPELL_REJECTED', reason: entry.reason
      }));
      expect(result.state.interaction.kind).toBe('RUNE_PANEL');
      expect(result.state.runeFormulas.iaido).toEqual(entry.formula);
      expect(result.state.rngState).toBe(before.rngState);
      expect(result.state.party.champions[0]!.mana).toBe(before.party.champions[0]!.mana);
    }
  });
});

describe('Sprint 3 Phase 4 independent render UAT', () => {
  it('renders the canonical ordered formula preview read-only in clean-room and source-guarded Amiga modes', () => {
    const formulaRect = RUNE_PANEL_RECTS.FORMULA;
    expect(formulaRect).toEqual({ x: 225, y: 84, w: 94, h: 12 });
    expect(RUNE_RECTS).toHaveLength(24);
    for (const runeRect of RUNE_RECTS) {
      const overlaps = runeRect.x < formulaRect.x + formulaRect.w
        && runeRect.x + runeRect.w > formulaRect.x
        && runeRect.y < formulaRect.y + formulaRect.h
        && runeRect.y + runeRect.h > formulaRect.y;
      expect(overlaps).toBe(false);
    }

    const clean = createCleanRoomGraphicsBundle();
    const gold = getUiPalette(clean)[PALETTE_INDEX.YELLOW]!;
    const colorMask = (fb: Framebuffer, color: readonly number[]) => {
      const mask: string[] = [];
      for (let y = formulaRect.y; y < formulaRect.y + formulaRect.h; y += 1) {
        for (let x = formulaRect.x; x < formulaRect.x + formulaRect.w; x += 1) {
          if (fb.getPixel(x, y).every((channel, index) => channel === color[index])) mask.push(`${x},${y}`);
        }
      }
      return mask;
    };
    const render = (state: GameState, graphics = clean) => {
      const fb = new Framebuffer();
      renderFrame(fb, state, { graphics });
      return fb;
    };
    const expectedLabelMask = (label: string) => {
      const fb = new Framebuffer();
      drawBitmapText(fb, label, formulaRect.x + 3, formulaRect.y + 3, gold, null, 14);
      return colorMask(fb, gold);
    };

    let state = dispatchCommand(equip(), { type: 'OPEN_RUNE_PANEL', championIndex: 0 }).state;
    expect(resolvePointerHitCommand(
      formulaRect.x + Math.floor(formulaRect.w / 2),
      formulaRect.y + Math.floor(formulaRect.h / 2),
      state
    )).toBeNull();
    for (const rune of ['LO', 'FUL', 'IR'] as const) {
      state = dispatchCommand(state, { type: 'ADD_RUNE', championIndex: 0, rune }).state;
    }
    const beforeRender = structuredClone(state);
    const fullClean = render(state);
    expect(state).toEqual(beforeRender);
    expect(colorMask(fullClean, gold)).toEqual(expectedLabelMask('LO FUL IR'));

    const deleted = dispatchCommand(state, { type: 'REMOVE_RUNE', championIndex: 0 }).state;
    expect(deleted.runeFormulas.iaido).toEqual(['LO', 'FUL']);
    expect(colorMask(render(deleted), gold)).toEqual(expectedLabelMask('LO FUL'));
    const cleared = dispatchCommand(deleted, { type: 'CLEAR_RUNES', championIndex: 0 }).state;
    expect(cleared.runeFormulas.iaido).toEqual([]);
    expect(rgbaRegion(render(cleared), formulaRect.x, formulaRect.y, formulaRect.w, formulaRect.h))
      .not.toEqual(rgbaRegion(fullClean, formulaRect.x, formulaRect.y, formulaRect.w, formulaRect.h));

    const invalid = dispatchCommand(cleared, { type: 'ADD_RUNE', championIndex: 0, rune: 'LO' }).state;
    const invalidBefore = render(invalid);
    const beforeActor = invalid.party.champions[0]!;
    const rejected = dispatchCommand(invalid, { type: 'INVOKE_RUNES', championIndex: 0 });
    expect(rejected.events).toContainEqual(expect.objectContaining({
      type: 'SPELL_REJECTED', reason: 'INVALID_FORMULA'
    }));
    expect(rejected.state.runeFormulas.iaido).toEqual(['LO']);
    expect(rejected.state.interaction.kind).toBe('RUNE_PANEL');
    expect(rejected.state.rngState).toBe(invalid.rngState);
    expect(rejected.state.party.champions[0]!.mana).toBe(beforeActor.mana);
    expect(rejected.state.party.champions[0]!.inventory).toEqual(beforeActor.inventory);
    expect(colorMask(render(rejected.state), gold)).toEqual(colorMask(invalidBefore, gold));

    const twoChampion: GameState = {
      ...state,
      interaction: { kind: 'RUNE_PANEL', championIndex: 1 },
      runeFormulas: { iaido: ['LO'], zed: ['FUL'] }
    };
    expect(colorMask(render(twoChampion), gold)).toEqual(expectedLabelMask('FUL'));

    const font = new Uint8Array(768);
    const patterns = new Map<number, readonly number[]>([
      [0, [0x20, 0x10, 0x08, 0x04, 0x02, 0x01]],
      [9, [0x21, 0x12, 0x0c, 0x0c, 0x12, 0x21]],
      [15, [0x3f, 0x01, 0x02, 0x04, 0x08, 0x3f]]
    ]);
    for (const [runeIndex, rows] of patterns) {
      rows.forEach((bits, row) => { font[row * 128 + 97 + runeIndex] = bits; });
    }
    const original = {
      ...clean,
      source: 'AMIGA_GRAPHICS_DAT' as const,
      systemFont: font
    };
    const originalGold = getUiPalette(original)[PALETTE_INDEX.YELLOW]!;
    const originalMask = colorMask(render(state, original), originalGold);
    const expectedGlyphs: string[] = [];
    [0, 9, 15].forEach((runeIndex, position) => {
      patterns.get(runeIndex)!.forEach((bits, row) => {
        for (let col = 0; col < 6; col += 1) {
          if (((bits >> (5 - col)) & 1) !== 0) {
            expectedGlyphs.push(`${formulaRect.x + 7 + position * 20 + col},${formulaRect.y + 3 + row}`);
          }
        }
      });
    });
    expect([...originalMask].sort()).toEqual([...expectedGlyphs].sort());
    expect(originalMask).not.toEqual(expectedLabelMask('LO FUL IR'));

    const originalFallback = { ...original, systemFont: null };
    expect(colorMask(render(state, originalFallback), originalGold))
      .toEqual(expectedLabelMask('LO FUL IR'));
  });

  it('shares pure missing-ammunition/invalid-target reasons with exact disabled presentation', () => {
    const graphics = createCleanRoomGraphicsBundle();
    let bow = withItem(partyOf('iaido'), 'qa-bow', 'BOW');
    const champion = bow.party.champions[0]!;
    bow = patchChampion(bow, 0, {
      inventory: {
        ...champion.inventory,
        slots: { ...champion.inventory.slots, rightHand: 'qa-bow' }
      }
    });
    const vectors = [
      { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
    ] as const;
    const forward = vectors[bow.party.facing];
    const target = {
      id: 'qa-target',
      level: bow.party.level,
      x: bow.party.x + forward.dx,
      y: bow.party.y + forward.dy,
      lane: 'LEFT' as const,
      traits: [],
      maxHealth: 20,
      health: 20,
      defeated: false
    };
    const missingAmmo = { ...bow, combatTargets: [target] };
    const command = {
      type: 'EXECUTE_COMBAT_ACTION' as const,
      championIndex: 0,
      hand: 'rightHand' as const,
      actionId: 'SHOOT' as const
    };
    const beforeValidation = structuredClone(missingAmmo);
    expect(validateCombatAction(missingAmmo, command)).toEqual({
      ok: false, reason: 'MISSING_AMMUNITION'
    });
    expect(combatActionFailureReason(missingAmmo, command)).toBe('MISSING_AMMUNITION');
    expect(missingAmmo).toEqual(beforeValidation);

    const withArrowItem = withItem(bow, 'qa-arrow', 'ARROW');
    const arrowChampion = withArrowItem.party.champions[0]!;
    const invalidTarget = patchChampion(withArrowItem, 0, {
      inventory: {
        ...arrowChampion.inventory,
        slots: { ...arrowChampion.inventory.slots, quiver1: 'qa-arrow' }
      }
    });
    expect(validateCombatAction(invalidTarget, command)).toEqual({
      ok: false, reason: 'INVALID_TARGET'
    });
    expect(combatActionFailureReason(invalidTarget, command)).toBe('INVALID_TARGET');

    for (const entry of [
      { state: missingAmmo, reason: 'MISSING_AMMUNITION', label: 'MISSING AMMO' },
      { state: invalidTarget, reason: 'INVALID_TARGET', label: 'INVALID TARGET' }
    ] as const) {
      const before = entry.state;
      const actor = before.party.champions[0]!;
      const result = dispatchCommand(before, command);
      expect(result.events).toContainEqual(expect.objectContaining({
        type: 'ACTION_REJECTED', reason: entry.reason
      }));
      expect(result.state.rngState).toBe(before.rngState);
      expect(result.state.party.champions[0]!.stamina).toBe(actor.stamina);
      expect(result.state.party.champions[0]!.actionCooldowns).toEqual(actor.actionCooldowns);
      expect(result.state.party.champions[0]!.inventory).toEqual(actor.inventory);
      expect(result.state.combatTargets).toEqual(before.combatTargets);
      expect(result.events.some((event) => event.type === 'SKILL_XP_AWARDED')).toBe(false);

      const panel = {
        ...before,
        interaction: { kind: 'ACTION_MENU' as const, championIndex: 0, hand: 'rightHand' as const }
      };
      const actual = new Framebuffer();
      const expected = new Framebuffer();
      renderFrame(actual, panel, { graphics });
      const red = getUiPalette(graphics)[PALETTE_INDEX.RED]!;
      drawBitmapText(expected, entry.label, 228, 117, red, null, 14);
      const redMask = (fb: Framebuffer) => {
        const mask: string[] = [];
        for (let y = 117; y < 123; y += 1) {
          for (let x = 228; x < 312; x += 1) {
            if (fb.getPixel(x, y).every((channel, index) => channel === red[index])) mask.push(`${x},${y}`);
          }
        }
        return mask;
      };
      expect(redMask(actual)).toEqual(redMask(expected));
    }
  });

  it('preserves bars/messages, draws all 24 runes, and exposes distinct disabled reasons', () => {
    const graphics = createCleanRoomGraphicsBundle();
    const base = equip();
    const runes = dispatchCommand(base, { type: 'OPEN_RUNE_PANEL', championIndex: 0 }).state;
    const before = new Framebuffer(), after = new Framebuffer();
    renderFrame(before, base, { graphics });
    renderFrame(after, runes, { graphics });
    expect(rgbaRegion(after, 0, 0, 320, 29)).toEqual(rgbaRegion(before, 0, 0, 320, 29));
    expect(rgbaRegion(after, 0, 169, 320, 31)).toEqual(rgbaRegion(before, 0, 169, 320, 31));

    const gold = getUiPalette(graphics)[PALETTE_INDEX.YELLOW]!;
    for (const rect of RUNE_RECTS) {
      let marked = false;
      for (let y = rect.y; y < rect.y + rect.h; y += 1) {
        for (let x = rect.x; x < rect.x + rect.w; x += 1) {
          if (after.getPixel(x, y).every((channel, index) => channel === gold[index])) marked = true;
        }
      }
      expect(marked).toBe(true);
    }

    const actionState = (state: GameState, championIndex = 0): GameState => ({
      ...state,
      interaction: { kind: 'ACTION_MENU', championIndex, hand: 'rightHand' }
    });
    const invalid = actionState(partyOf('iaido'));
    const cooldownBase = equip();
    const cooldown = actionState(patchChampion(cooldownBase, 0, {
      actionCooldowns: { ...cooldownBase.party.champions[0]!.actionCooldowns, SWING: cooldownBase.tick + 5 }
    }));
    const stamina = actionState(patchChampion(equip(), 0, { stamina: 0 }));
    const reach = actionState(equip(undefined, 2), 2);
    const signatures = [invalid, cooldown, stamina, reach].map((state) => {
      const fb = new Framebuffer();
      renderFrame(fb, state, { graphics });
      return JSON.stringify(rgbaRegion(fb, 224, 115, 96, 9));
    });
    expect(new Set(signatures).size).toBe(4);
  });

  it('projects both lanes at near/far depth for all facings and never substitutes item 13 for impact 14', () => {
    const base = placeAt(equip(), 0, 3, 3, 0);
    const vectors = [
      { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
    ] as const;
    for (const facing of [0, 1, 2, 3] as const) {
      const positioned = placeAt(base, 0, 3, 3, facing);
      const vector = vectors[facing];
      for (const depth of [1, 3] as const) {
        const rects = (['LEFT', 'RIGHT'] as const).map((lane) => projectileMarkerRect(positioned, {
          id: `${facing}-${depth}-${lane}`,
          itemId: null,
          ownerChampionId: 'iaido',
          level: 0,
          x: 3 + vector.dx * depth,
          y: 3 + vector.dy * depth,
          direction: facing,
          lane,
          power: 1,
          kineticEnergy: 1,
          stepEnergyCost: 1,
          payload: { kind: 'SPELL', spellId: 'QA', effectId: 'QA', explosive: false }
        }));
        expect(rects.every(Boolean)).toBe(true);
        expect(rects[0]!.x).toBeLessThan(rects[1]!.x);
        expect(rects[0]!.w).toBe(depth === 1 ? 13 : 6);
      }
    }

    const impactState: GameState = {
      ...base,
      impactMarkers: [{ level: 0, x: 3, y: 2, lane: 'LEFT', expiresAtTick: base.tick + 2 }]
    };
    const clean = createCleanRoomGraphicsBundle();
    const sprite = (index: number, color: number) => ({
      index, width: 2, height: 2, pixels: new Uint8Array([color, color, color, color])
    });
    const noImpact = { ...clean, source: 'AMIGA_GRAPHICS_DAT' as const, sprites: new Map() };
    const only13 = { ...noImpact, sprites: new Map([[13, sprite(13, 2)]]) };
    const with14 = { ...noImpact, sprites: new Map([[14, sprite(14, 3)]]) };
    const emptyFb = new Framebuffer(), item13Fb = new Framebuffer(), item14Fb = new Framebuffer();
    renderFrame(emptyFb, impactState, { graphics: noImpact });
    renderFrame(item13Fb, impactState, { graphics: only13 });
    renderFrame(item14Fb, impactState, { graphics: with14 });
    const emptyViewport = rgbaRegion(emptyFb, 0, 33, 224, 136);
    expect(rgbaRegion(item13Fb, 0, 33, 224, 136)).toEqual(emptyViewport);
    expect(rgbaRegion(item14Fb, 0, 33, 224, 136)).not.toEqual(emptyViewport);
  });
});
