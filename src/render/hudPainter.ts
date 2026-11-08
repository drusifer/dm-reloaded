import { itemIconIndex } from '../data/itemCatalog';
/**
 * Classic 320x200 Amiga HUD, Movement Pad, Utility Pills, Message Strip, and Mirror Modal painter.
 *
 * TLDR:
 *   Renders the 4x68px Champion Status Bar (x=0..271), non-overlapping Utility Pills (x=272..319),
 *   Right Control Deck & 6-cell Movement Arrow Pad (item[14] at 224,124,96,45), scrolling Message
 *   Strip (y=169..199), and Hall of Champions Resurrect/Reincarnate/Cancel modal.
 */

import { DIRECTION_NAMES } from '../engine/types';
import { getItemDef } from '../data/itemCatalog';
import { partyLightBonus } from '../engine/inventory';
import { partyMagicLightBonus } from '../engine/effects';
import type { ChampionState, GameState, MirrorModalState } from '../engine/types';
import { extractChampionPortrait } from '../data/graphicsDatParser';
import type { GraphicsBundle, RgbColor } from '../data/graphicsDatParser';
import { drawBitmapText } from './bitmapFont';
import type { Framebuffer } from './framebuffer';
import { LAYOUT_RECTS, championSlotRect, championHandRect } from './layout';
import type { AudioUnlockBadge, ScreenRect } from './layout';
import { PALETTE_INDEX, getUiPalette } from './palette';
import { createSpriteSource } from './spriteSource';

function drawStatBar(
  fb: Framebuffer,
  x: number,
  y: number,
  h: number,
  current: number,
  max: number,
  color: RgbColor,
  bg: RgbColor
): void {
  fb.fillRect(x, y, 3, h, bg);
  if (max <= 0 || current <= 0) return;
  const ratio = Math.max(0, Math.min(1, current / max));
  const fillH = Math.max(1, Math.round(h * ratio));
  fb.fillRect(x, y + (h - fillH), 3, fillH, color);
}

function paintChampionSlot(
  fb: Framebuffer,
  slotIndex: number,
  champion: ChampionState | undefined,
  uiPalette: readonly RgbColor[],
  bundle?: GraphicsBundle
): void {
  const rect = championSlotRect(slotIndex);
  const dark = uiPalette[PALETTE_INDEX.DARKEST_GRAY_KEY] ?? [36, 36, 36];
  const mid = uiPalette[PALETTE_INDEX.DARK_GRAY] ?? [73, 73, 73];
  const light = uiPalette[PALETTE_INDEX.LIGHT_GRAY] ?? [182, 182, 182];
  const black = uiPalette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];

  if (!champion) {
    fb.drawBevelBox(rect.x, rect.y, rect.w - 1, rect.h, black, mid, dark);
    drawBitmapText(fb, `SLOT ${slotIndex + 1}`, rect.x + 14, rect.y + 11, mid, bundle?.systemFont);
    return;
  }

  fb.drawBevelBox(rect.x, rect.y, rect.w - 1, rect.h, dark, light, black);
  drawBitmapText(
    fb,
    champion.name.slice(0, 7),
    rect.x + 2,
    rect.y + 2,
    uiPalette[PALETTE_INDEX.YELLOW] ?? [255, 255, 0],
    bundle?.systemFont
  );

  if (!champion.alive) {
    drawBitmapText(fb, 'DEAD', rect.x + 23, rect.y + 13, uiPalette[PALETTE_INDEX.WHITE] ?? [255, 255, 255], bundle?.systemFont);
    const skull = createSpriteSource(bundle).getSprite('inventory.skull');
    fb.blitSprite(skull, rect.x + 3, rect.y + 10, uiPalette, { dstWidth: 16, dstHeight: 16, transparentIndex: 0 });
    return;
  }

  // Mini portrait or hand slots
  const portrait = bundle ? extractChampionPortrait(bundle, champion.portraitIndex) : null;
  if (portrait) {
    fb.blitSprite(portrait, rect.x + 2, rect.y + 9, uiPalette, { dstWidth: 20, dstHeight: 18 });
  } else {
    fb.drawBevelBox(rect.x + 2, rect.y + 9, 20, 18, mid, light, black);
  }

  // Health (Red), Stamina (Green), Mana (Blue) vertical bars between portrait and hand targets (x + 25..37)
  drawStatBar(
    fb,
    rect.x + 25,
    rect.y + 10,
    16,
    champion.health,
    champion.maxHealth,
    uiPalette[PALETTE_INDEX.RED] ?? [255, 0, 0],
    black
  );
  drawStatBar(
    fb,
    rect.x + 30,
    rect.y + 10,
    16,
    champion.stamina,
    champion.maxStamina,
    uiPalette[PALETTE_INDEX.LIGHT_GREEN] ?? [0, 219, 0],
    black
  );
  drawStatBar(
    fb,
    rect.x + 35,
    rect.y + 10,
    16,
    champion.mana,
    champion.maxMana,
    uiPalette[PALETTE_INDEX.CYAN] ?? [0, 219, 219],
    black
  );
}

function paintPill(
  fb: Framebuffer,
  rect: ScreenRect,
  label: string,
  active: boolean,
  uiPalette: readonly RgbColor[],
  bundle?: GraphicsBundle
): void {
  const fill = active
    ? (uiPalette[PALETTE_INDEX.DARK_GREEN] ?? [0, 120, 0])
    : (uiPalette[PALETTE_INDEX.DARK_GRAY] ?? [73, 73, 73]);
  const hi = uiPalette[PALETTE_INDEX.LIGHT_GRAY] ?? [182, 182, 182];
  const lo = uiPalette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];
  const fg = active
    ? (uiPalette[PALETTE_INDEX.YELLOW] ?? [255, 255, 0])
    : (uiPalette[PALETTE_INDEX.WHITE] ?? [255, 255, 255]);

  fb.drawBevelBox(rect.x, rect.y, rect.w, rect.h, fill, hi, lo);
  drawBitmapText(fb, label.slice(0, 7), rect.x + 2, rect.y + 1, fg, bundle?.systemFont);
}

function paintMovementPad(
  fb: Framebuffer,
  uiPalette: readonly RgbColor[],
  bundle?: GraphicsBundle
): void {
  const pad = LAYOUT_RECTS.MOVEMENT_PAD;
  const arrowSprite = bundle?.sprites.get(13);
  if (arrowSprite) {
    fb.blitSprite(arrowSprite, pad.x, pad.y, uiPalette);
    return;
  }

  const cellW = 32;
  const labelsTop = ['TL', 'FWD', 'TR'] as const;
  const labelsBot = ['SL', 'BCK', 'SR'] as const;
  const fill = uiPalette[PALETTE_INDEX.MEDIUM_GRAY] ?? [120, 120, 120];
  const hi = uiPalette[PALETTE_INDEX.LIGHT_GRAY] ?? [190, 190, 190];
  const lo = uiPalette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];
  const ink = uiPalette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];

  for (let col = 0; col < 3; col += 1) {
    const cx = pad.x + col * cellW;
    fb.drawBevelBox(cx, pad.y, cellW, 22, fill, hi, lo);
    drawBitmapText(fb, labelsTop[col]!, cx + 6, pad.y + 8, ink, bundle?.systemFont);

    fb.drawBevelBox(cx, pad.y + 22, cellW, 23, fill, hi, lo);
    drawBitmapText(fb, labelsBot[col]!, cx + 6, pad.y + 30, ink, bundle?.systemFont);
  }
}

export function paintMirrorModal(
  fb: Framebuffer,
  mirror: MirrorModalState,
  partyFull: boolean,
  uiPalette: readonly RgbColor[],
  bundle?: GraphicsBundle
): void {
  const rect = LAYOUT_RECTS.MIRROR_MODAL;
  const champ = mirror.champion;
  const bg = uiPalette[PALETTE_INDEX.DARK_GRAY] ?? [73, 73, 73];
  const hi = uiPalette[PALETTE_INDEX.LIGHT_GRAY] ?? [182, 182, 182];
  const lo = uiPalette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];
  const gold = uiPalette[PALETTE_INDEX.YELLOW] ?? [255, 255, 0];
  const white = uiPalette[PALETTE_INDEX.WHITE] ?? [255, 255, 255];
  const cyan = uiPalette[PALETTE_INDEX.CYAN] ?? [0, 219, 219];

  fb.drawBevelBox(rect.x, rect.y, rect.w, rect.h, bg, hi, lo);
  fb.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, lo);

  const portrait = bundle ? extractChampionPortrait(bundle, champ.portraitIndex) : null;
  if (portrait) {
    fb.blitSprite(portrait, rect.x + 8, rect.y + 8, uiPalette);
  } else {
    fb.drawBevelBox(rect.x + 8, rect.y + 8, 32, 29, lo, hi, lo);
  }
  fb.strokeRect(rect.x + 7, rect.y + 7, 34, 31, gold);

  drawBitmapText(fb, champ.name, rect.x + 46, rect.y + 9, gold, bundle?.systemFont, 24);
  drawBitmapText(fb, champ.title, rect.x + 46, rect.y + 18, white, bundle?.systemFont, 24);

  drawBitmapText(
    fb,
    `HP:${champ.maxHealth} STA:${champ.maxStamina} MANA:${champ.maxMana}`,
    rect.x + 46,
    rect.y + 29,
    cyan,
    bundle?.systemFont,
    25
  );

  const attr = champ.attributes;
  drawBitmapText(
    fb,
    `STR:${attr.strength} DEX:${attr.dexterity} WIS:${attr.wisdom}`,
    rect.x + 10,
    rect.y + 46,
    white,
    bundle?.systemFont,
    31
  );
  drawBitmapText(
    fb,
    `VIT:${attr.vitality} AMA:${attr.antiMagic} AFI:${attr.antiFire}`,
    rect.x + 10,
    rect.y + 56,
    white,
    bundle?.systemFont,
    31
  );

  const gearText = champ.startingItems.length > 0
    ? `GEAR: ${champ.startingItems.slice(0, 3).join(', ')}`
    : 'GEAR: NONE';
  drawBitmapText(fb, gearText, rect.x + 10, rect.y + 68, hi, bundle?.systemFont, 31);

  if (partyFull) {
    drawBitmapText(
      fb,
      'PARTY FULL (4 MAX) - CANCEL',
      rect.x + 10,
      rect.y + 82,
      uiPalette[PALETTE_INDEX.RED] ?? [255, 60, 60],
      bundle?.systemFont,
      31
    );
  } else {
    drawBitmapText(
      fb,
      'CHOOSE FATE OR CANCEL:',
      rect.x + 10,
      rect.y + 82,
      gold,
      bundle?.systemFont,
      31
    );
  }

  const btnFill = partyFull ? lo : (uiPalette[PALETTE_INDEX.DARK_BROWN] ?? [109, 36, 0]);
  const resBtn = LAYOUT_RECTS.MIRROR_BTN_RESURRECT;
  const reiBtn = LAYOUT_RECTS.MIRROR_BTN_REINCARNATE;
  const canBtn = LAYOUT_RECTS.MIRROR_BTN_CANCEL;

  fb.drawBevelBox(resBtn.x, resBtn.y, resBtn.w, resBtn.h, btnFill, hi, lo);
  drawBitmapText(fb, 'RESURRECT', resBtn.x + 4, resBtn.y + 5, partyFull ? hi : gold, bundle?.systemFont);

  fb.drawBevelBox(reiBtn.x, reiBtn.y, reiBtn.w, reiBtn.h, btnFill, hi, lo);
  drawBitmapText(fb, 'REINCARN', reiBtn.x + 9, reiBtn.y + 5, partyFull ? hi : cyan, bundle?.systemFont);

  fb.drawBevelBox(canBtn.x, canBtn.y, canBtn.w, canBtn.h, uiPalette[PALETTE_INDEX.MEDIUM_GRAY] ?? [109, 109, 109], hi, lo);
  drawBitmapText(fb, 'CANCEL', canBtn.x + 9, canBtn.y + 5, white, bundle?.systemFont);
}

export function paintHud(
  fb: Framebuffer,
  state: GameState,
  audioStatus: AudioUnlockBadge = 'LOCKED',
  bundle?: GraphicsBundle
): void {
  const uiPalette = getUiPalette(bundle);
  const black = uiPalette[PALETTE_INDEX.BLACK] ?? [0, 0, 0];
  const dark = uiPalette[PALETTE_INDEX.DARKEST_GRAY_KEY] ?? [36, 36, 36];
  const mid = uiPalette[PALETTE_INDEX.DARK_GRAY] ?? [73, 73, 73];
  const light = uiPalette[PALETTE_INDEX.LIGHT_GRAY] ?? [182, 182, 182];
  const white = uiPalette[PALETTE_INDEX.WHITE] ?? [255, 255, 255];
  const cyan = uiPalette[PALETTE_INDEX.CYAN] ?? [0, 219, 219];
  const gold = uiPalette[PALETTE_INDEX.YELLOW] ?? [255, 255, 0];

  // Top divider strip (y=29..32)
  fb.fillRect(0, 29, 320, 4, black);
  fb.fillRect(0, 31, 320, 1, mid);

  // 4 Champion Status Boxes strictly inside x=0..271
  for (let i = 0; i < 4; i += 1) {
    const champion = state.party.champions[i];
    paintChampionSlot(fb, i, champion, uiPalette, bundle);
    if (champion?.alive) {
      for (const hand of ['leftHand', 'rightHand'] as const) {
        const id = champion.inventory.slots[hand];
        const item = id ? state.items[id] : undefined;
        const rect=championHandRect(i,hand);
        fb.fillRect(rect.x, rect.y, rect.w, rect.h, dark);
        if (item) fb.blitSprite(createSpriteSource(bundle).getSprite(`item.icon.${itemIconIndex(item)}`),
          rect.x, rect.y, uiPalette, { dstWidth: rect.w, dstHeight: rect.h, transparentIndex: 0 });
      }
      const status = `${champion.effects.some((effect) => effect.kind === 'SHIELD') ? 'S' : ''}${champion.effects.some((effect) => effect.kind === 'STRENGTH') ? 'K' : ''}${champion.effects.some((effect) => effect.kind === 'LIGHT') ? 'L' : ''}${champion.poisonSeverity > 0 ? 'P' : ''}`;
      if (status) drawBitmapText(fb, status, championSlotRect(i).x + 58, 2, gold, bundle?.systemFont, 2);
    }
  }

  // Non-overlapping Utility Pills strictly inside x=272..319 (Smith Gate 2 requirement)
  fb.fillRect(
    LAYOUT_RECTS.UTILITY_BAR.x,
    LAYOUT_RECTS.UTILITY_BAR.y,
    LAYOUT_RECTS.UTILITY_BAR.w,
    LAYOUT_RECTS.UTILITY_BAR.h,
    black
  );
  paintPill(
    fb,
    LAYOUT_RECTS.QOL_PILL,
    state.settings.qolMode ? 'QOL:ON' : '1988',
    state.settings.qolMode,
    uiPalette,
    bundle
  );
  paintPill(
    fb,
    LAYOUT_RECTS.AUTOMAP_PILL,
    state.settings.qolMode ? (state.settings.automapOpen ? 'MAP:ON' : 'MAP') : 'NO MAP',
    state.settings.qolMode && state.settings.automapOpen,
    uiPalette,
    bundle
  );
  paintPill(fb, LAYOUT_RECTS.SLEEP_PILL, 'ZZZ', state.party.sleeping, uiPalette, bundle);
  paintPill(
    fb,
    LAYOUT_RECTS.AUDIO_PILL,
    'SFX',
    audioStatus === 'ACTIVE' && !state.settings.audioMuted,
    uiPalette,
    bundle
  );

  // Right Control Deck (224, 33, 96, 136)
  const deck = LAYOUT_RECTS.RIGHT_DECK;
  fb.drawBevelBox(deck.x, deck.y, deck.w, 91, dark, light, black);

  const facingName = DIRECTION_NAMES[state.party.facing];
  drawBitmapText(fb, `DIR:${facingName.slice(0, 5)}`, deck.x + 6, deck.y + 6, cyan, bundle?.systemFont);
  drawBitmapText(
    fb,
    `LVL:${state.party.level} (${state.party.x},${state.party.y})`,
    deck.x + 6,
    deck.y + 16,
    white,
    bundle?.systemFont
  );

  const lightVal = (state.levels[state.party.level]?.ambientLight ?? 0) + partyLightBonus(state) + partyMagicLightBonus(state);
  drawBitmapText(
    fb,
    lightVal > 0 ? `LIGHT:${Math.min(5, lightVal)}/5` : 'DARK! TORCH?',
    deck.x + 6,
    deck.y + 26,
    lightVal > 0 ? gold : (uiPalette[PALETTE_INDEX.RED] ?? [255, 60, 60]),
    bundle?.systemFont
  );

  // 2x2 Party Formation Widget
  for (let idx = 0; idx < 4; idx += 1) {
    const fx = deck.x + 16 + (idx % 2) * 34;
    const fy = deck.y + 40 + Math.floor(idx / 2) * 20;
    const hero = state.party.champions[idx];
    fb.drawBevelBox(fx, fy, 30, 16, hero ? mid : black, light, black);
    drawBitmapText(
      fb,
      hero ? hero.name.slice(0, 4) : '--',
      fx + 3,
      fy + 5,
      hero ? gold : mid,
      bundle?.systemFont
    );
  }

  // Classic 6-Button Movement Arrow Pad (224, 124, 96, 45)
  paintMovementPad(fb, uiPalette, bundle);

  // Bottom Scrolling Message Strip (0, 169, 320, 31)
  const msgRect = LAYOUT_RECTS.MESSAGE_STRIP;
  fb.drawBevelBox(msgRect.x, msgRect.y, msgRect.w, msgRect.h, black, mid, dark);
  const recent = state.messages.slice(-3);
  for (let i = 0; i < recent.length; i += 1) {
    const line = recent[i] ?? '';
    const color = i === recent.length - 1 ? white : light;
    drawBitmapText(fb, line, msgRect.x + 4, msgRect.y + 4 + i * 9, color, bundle?.systemFont, 51);
  }

  if (state.settings.qolMode) {
    drawBitmapText(fb, '[QWEASD/M]', 254, msgRect.y + 21, cyan, bundle?.systemFont);
  }

  if (state.handItem) {
    const item = state.items[state.handItem];
    if (item) {
      const weight = (bundle?.itemCatalog.find(def => def.defId === item.defId) ?? getItemDef(item.defId)).weightTenthsKg;
      fb.fillRect(2, msgRect.y + 2, 316, 9, black);
      drawBitmapText(fb, `HELD: ${item.name} (${(weight / 10).toFixed(1)} KG)`,
        4, msgRect.y + 3, gold, bundle?.systemFont, 51);

    }
  }
  if (state.party.sleeping) {
    const viewport = LAYOUT_RECTS.VIEWPORT;
    fb.fillDitherRect(viewport.x, viewport.y, viewport.w, viewport.h, black, [8, 8, 12]);
    drawBitmapText(fb, 'SLEEPING - CLICK OR ANY KEY', 32, 96, light, bundle?.systemFont);
  }

  // Champion Mirror Modal overlay when inspecting a Hall of Champions mirror
  if (state.activeMirror) {
    paintMirrorModal(fb, state.activeMirror, state.party.champions.length >= 4, uiPalette, bundle);
  }
}
