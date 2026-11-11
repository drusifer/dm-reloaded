/** Right-deck action, rune, and progression panels using canonical shared rectangles. */
import { COMBAT_ACTIONS } from '../data/combatCatalog';
import { MAGIC_RUNES } from '../data/magicCatalog';
import { combatActionFailureReason } from '../engine/combat';
import { rankForExperience } from '../engine/progression';
import type { CombatFailureReason, GameState } from '../engine/types';
import type { GraphicsBundle, RgbColor } from '../data/graphicsDatParser';
import { drawBitmapText } from './bitmapFont';
import type { Framebuffer } from './framebuffer';
import {
  ACTION_PANEL_RECTS, LAYOUT_RECTS, PROGRESSION_PANEL_RECTS, RUNE_PANEL_RECTS, RUNE_RECTS,
  type ScreenRect
} from './layout';
import { PALETTE_INDEX, getUiPalette } from './palette';

function button(fb: Framebuffer, rect: ScreenRect, label: string, enabled: boolean, palette: readonly RgbColor[], bundle?: GraphicsBundle): void {
  const dark = palette[PALETTE_INDEX.DARK_GRAY]!, mid = palette[PALETTE_INDEX.MEDIUM_GRAY]!;
  const light = palette[PALETTE_INDEX.LIGHT_GRAY]!, black = palette[PALETTE_INDEX.BLACK]!;
  fb.drawBevelBox(rect.x, rect.y, rect.w, rect.h, enabled ? mid : dark, light, black);
  drawBitmapText(fb, label, rect.x + 2, rect.y + Math.max(1, Math.floor((rect.h - 6) / 2)), enabled ? palette[PALETTE_INDEX.WHITE]! : light, bundle?.systemFont, Math.floor((rect.w - 3) / 6));
}

function actionLabel(bundle: GraphicsBundle | undefined, action: 'SWING' | 'SHOOT'): string {
  const index = action === 'SWING' ? 0 : 1;
  if (bundle?.source === 'AMIGA_GRAPHICS_DAT') return bundle.actionLabels?.[index] ?? COMBAT_ACTIONS[action].label;
  return COMBAT_ACTIONS[action].label;
}

export function combatFailureDisplayText(reason: CombatFailureReason): string {
  if (reason === 'INSUFFICIENT_STAMINA') return 'NO STAMINA';
  if (reason === 'MISSING_AMMUNITION') return 'MISSING AMMO';
  return reason.replaceAll('_', ' ');
}

function drawOriginalRune(fb: Framebuffer, runeIndex: number, x: number, y: number, color: RgbColor, bundle?: GraphicsBundle): boolean {
  if (bundle?.source !== 'AMIGA_GRAPHICS_DAT' || bundle.systemFont?.length !== 768) return false;
  const code = 97 + runeIndex;
  for (let row = 0; row < 6; row += 1) {
    const bits = bundle.systemFont[row * 128 + code] ?? 0;
    for (let col = 0; col < 6; col += 1) if (((bits >> (5 - col)) & 1) !== 0) fb.setPixel(x + col, y + row, color);
  }
  return true;
}

function paintFormulaPreview(
  fb: Framebuffer,
  formula: GameState['runeFormulas'][string],
  palette: readonly RgbColor[],
  bundle?: GraphicsBundle
): void {
  const rect = RUNE_PANEL_RECTS.FORMULA;
  const black = palette[PALETTE_INDEX.BLACK]!, dark = palette[PALETTE_INDEX.DARKEST_GRAY_KEY]!;
  const light = palette[PALETTE_INDEX.LIGHT_GRAY]!, gold = palette[PALETTE_INDEX.YELLOW]!;
  fb.drawBevelBox(rect.x, rect.y, rect.w, rect.h, black, light, dark);
  if (formula.length === 0) {
    drawBitmapText(fb, '-', rect.x + 44, rect.y + 3, light, bundle?.systemFont, 1);
    return;
  }
  if (bundle?.source === 'AMIGA_GRAPHICS_DAT') {
    let authentic = true;
    formula.forEach((rune, position) => {
      const runeIndex = MAGIC_RUNES.findIndex((definition) => definition.id === rune);
      authentic = runeIndex >= 0 && drawOriginalRune(fb, runeIndex, rect.x + 7 + position * 20, rect.y + 3, gold, bundle) && authentic;
      if (position > 0) drawBitmapText(fb, '+', rect.x + position * 20, rect.y + 3, light, bundle.systemFont, 1);
    });
    if (authentic) return;
    fb.fillRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, black);
  }
  const labels = formula.map((rune) => MAGIC_RUNES.find((definition) => definition.id === rune)?.name ?? rune);
  drawBitmapText(fb, labels.join(' '), rect.x + 3, rect.y + 3, gold,
    bundle?.source === 'AMIGA_GRAPHICS_DAT' ? bundle.systemFont : null, 14);
}

export function paintInteractionPanel(fb: Framebuffer, state: GameState, bundle?: GraphicsBundle): void {
  if (state.interaction.kind === 'NONE') return;
  const palette = getUiPalette(bundle), deck = LAYOUT_RECTS.RIGHT_DECK;
  const black = palette[PALETTE_INDEX.BLACK]!, dark = palette[PALETTE_INDEX.DARKEST_GRAY_KEY]!;
  const light = palette[PALETTE_INDEX.LIGHT_GRAY]!, gold = palette[PALETTE_INDEX.YELLOW]!;
  fb.drawBevelBox(deck.x, deck.y, deck.w, 91, dark, light, black);
  const champion = state.party.champions[state.interaction.championIndex];

  if (state.interaction.kind === 'ACTION_MENU') {
    const swingReason = combatActionFailureReason(state, { championIndex: state.interaction.championIndex, hand: state.interaction.hand, actionId: 'SWING' });
    const shootReason = combatActionFailureReason(state, { championIndex: state.interaction.championIndex, hand: state.interaction.hand, actionId: 'SHOOT' });
    button(fb, ACTION_PANEL_RECTS.CLOSE, 'X', true, palette, bundle);
    button(fb, ACTION_PANEL_RECTS.SWING, actionLabel(bundle, 'SWING'), !swingReason, palette, bundle);
    button(fb, ACTION_PANEL_RECTS.SHOOT, actionLabel(bundle, 'SHOOT'), !shootReason, palette, bundle);
    button(fb, ACTION_PANEL_RECTS.RUNES, 'RUNES', true, palette, bundle);
    button(fb, ACTION_PANEL_RECTS.PROGRESSION, 'PROGRESS', true, palette, bundle);
    const reason = swingReason === 'INVALID_ITEM' ? shootReason : swingReason;
    drawBitmapText(fb, reason ? combatFailureDisplayText(reason) : 'READY', deck.x + 4, deck.y + 84, reason ? palette[PALETTE_INDEX.RED]! : gold, bundle?.systemFont, 14);
    return;
  }

  if (state.interaction.kind === 'RUNE_PANEL') {
    for (let index = 0; index < MAGIC_RUNES.length; index += 1) {
      const rect = RUNE_RECTS[index]!;
      fb.drawBevelBox(rect.x, rect.y, rect.w, rect.h, black, light, dark);
      if (!drawOriginalRune(fb, index, rect.x + 5, rect.y + 4, gold, bundle)) {
        drawBitmapText(fb, MAGIC_RUNES[index]!.name.slice(0, 2), rect.x + 2, rect.y + 4, gold, null, 2);
      }
    }
    paintFormulaPreview(fb, state.runeFormulas[champion?.id ?? ''] ?? [], palette, bundle);
    button(fb, RUNE_PANEL_RECTS.REMOVE, 'DEL', true, palette, bundle);
    button(fb, RUNE_PANEL_RECTS.CLEAR, 'CLR', true, palette, bundle);
    button(fb, RUNE_PANEL_RECTS.FLASK, 'FLK', true, palette, bundle);
    button(fb, RUNE_PANEL_RECTS.CLOSE, 'X', true, palette, bundle);
    button(fb, RUNE_PANEL_RECTS.INVOKE, 'INVOKE', true, palette, bundle);
    return;
  }

  button(fb, PROGRESSION_PANEL_RECTS.CLOSE, 'X', true, palette, bundle);
  drawBitmapText(fb, champion?.name ?? 'CHAMPION', deck.x + 3, deck.y + 4, gold, bundle?.systemFont, 12);
  champion?.progression.experience.forEach((xp, index) => {
    const col = index % 4, row = Math.floor(index / 4);
    drawBitmapText(fb, `${index}:${rankForExperience(xp)}`, deck.x + 3 + col * 23, deck.y + 20 + row * 15, light, bundle?.systemFont, 4);
  });
}
