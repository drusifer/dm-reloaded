import { itemIconIndex } from '../data/itemCatalog';
/** Paperdoll painter using semantic sprites and empirically measured original slot geometry. */
import type { GraphicsBundle } from '../data/graphicsDatParser';
import type { GameState, ItemInstanceId } from '../engine/types';
import { ALL_EQUIP_SLOTS } from '../engine/types';
import { championLoadTenths, maxLoadTenths, effectiveChampionAttributes, championArmorRating, effectiveChampionMaxMana } from '../engine/inventory';
import { drawBitmapText } from './bitmapFont';
import type { Framebuffer } from './framebuffer';
import { BACKPACK_SLOT_RECTS, CHEST_SLOT_RECTS, EQUIP_SLOT_RECTS, SCROLL_TEXT_RECT } from './layout';
import type { ScreenRect } from './layout';
import { getUiPalette } from './palette';
import { createSpriteSource } from './spriteSource';

export function paintInventory(fb: Framebuffer, state: GameState, graphics?: GraphicsBundle): void {
  const index = state.openInventoryChampionIndex;
  const champion = index === null ? undefined : state.party.champions[index];
  if (!champion) return;
  const source = createSpriteSource(graphics), palette = getUiPalette(graphics);
  const panel = source.getSprite('inventory.panel');
  fb.blitSprite(panel, 0, 33, palette);
  const text = (label: string, x: number, y: number, color = palette[15]!) => drawBitmapText(fb, label, x, y, color, graphics?.systemFont);
  const item = (id: ItemInstanceId | null | undefined, rect: ScreenRect): void => {
    fb.strokeRect(rect.x-1, rect.y-1, 18, 18, palette[2]!);
    if (id && state.items[id]) fb.blitSprite(source.getSprite(`item.icon.${itemIconIndex(state.items[id]!)}`), rect.x, rect.y, palette, { transparentIndex: 0 });
  };
  for (const slot of ALL_EQUIP_SLOTS) item(champion.inventory.slots[slot], EQUIP_SLOT_RECTS[slot]);
  champion.inventory.backpack.forEach((id, i) => { const rect = BACKPACK_SLOT_RECTS[i]; if (rect) item(id, rect); });
  text(champion.name, 3, 35);
  fb.fillRect(225,73,94,49,palette[1]!);
  text(`HP ${champion.health}/${champion.maxHealth}`,230,77);
  text(`ST ${champion.stamina}/${champion.maxStamina}`,230,89);
  text(`MP ${champion.mana}/${effectiveChampionMaxMana(state, champion)}`,230,101);
  text(`ARMOR ${championArmorRating(state, champion)}`,230,113);
  const container = state.openContainerId ? state.items[state.openContainerId] : undefined;
  if (container?.contents) {
    fb.blitSprite(source.getSprite('inventory.chest'), 80, 85, palette);
    CHEST_SLOT_RECTS.forEach((rect, i) => item(container.contents?.[i], rect));
  } else if (container?.scrollText) {
    fb.blitSprite(source.getSprite('inventory.scroll'), 80, 85, palette);
    const columns = Math.floor(SCROLL_TEXT_RECT.w / 6);
    const rows = Math.floor(SCROLL_TEXT_RECT.h / 8);
    const lines: string[] = [];
    for (const paragraph of container.scrollText) {
      let remaining = paragraph.trim();
      if (!remaining) lines.push('');
      while (remaining) {
        let end = Math.min(columns, remaining.length);
        if (remaining.length > columns) {
          const space = remaining.lastIndexOf(' ', columns);
          if (space > 0) end = space;
        }
        lines.push(remaining.slice(0, end));
        remaining = remaining.slice(end).trimStart();
      }
    }
    lines.slice(0, rows).forEach((line, i) => {
      const visible = i === rows - 1 && lines.length > rows ? line.slice(0, columns - 3) + '...' : line;
      text(visible, SCROLL_TEXT_RECT.x, SCROLL_TEXT_RECT.y + i*8, palette[0]!);
    });
  } else {
    fb.fillRect(98, 87, 126, 64, palette[1]!);
    const attributes = effectiveChampionAttributes(state, champion);
    const stats = [['STR',attributes.strength],['DEX',attributes.dexterity],['WIS',attributes.wisdom],['VIT',attributes.vitality],['ANTI-MAGIC',attributes.antiMagic],['ANTI-FIRE',attributes.antiFire]];
    stats.forEach(([label, value], i) => text(`${label} ${value}`, 100, 89 + i*9));
  }
  const gauge = (name: string, value: number, y: number, color: number): void => {
    const warning = value < 0 ? 8 : value < 512 ? 11 : color;
    text(name, 3, y, palette[value < 512 ? warning : 15]!);
    fb.fillRect(34, y, 60, 6, palette[0]!);
    fb.fillRect(34, y, Math.round(Math.max(0, Math.min(1, value / 2048)) * 60), 6, palette[warning]!);
    if (value < 0) fb.strokeRect(33, y - 1, 62, 8, palette[8]!);
  };
  gauge('FOOD',champion.food,143,6); gauge('WATR',champion.water,151,14);
  const load=championLoadTenths(state,champion), max=maxLoadTenths(champion,state);
  text(`LOAD ${(load/10).toFixed(1)} / MAX ${(max/10).toFixed(1)} KG`,3,160,palette[load>max?8:load>max*.75?11:15]!);
  // Fallback panels have no authored control glyphs; labels keep controls discoverable.
  if (panel.index < 0) {
    text('EYE',9,47); text('EAT',53,47); text('S',174,36); text('ZZZ',187,36); text('X',211,36);
  }
}
