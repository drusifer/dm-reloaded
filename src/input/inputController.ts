/**
 * Pointer hitbox mapper and Purist/QoL keyboard translator for the 320x200 Amiga UI.
 *
 * TLDR:
 *   Maps bounding-rect client coordinates onto canonical [0..319, 0..199] hitboxes
 *   (6-cell movement pad, ahead viewport interaction, Mirror modal buttons, x=272..319
 *   utility pills) and enforces 1988 Purist Mode keyboard gating until QoL Mode is active.
 */

import { DIRECTION_DELTAS, type EquipSlotId } from '../engine/types';
import type { GameCommand, GameState } from '../engine/types';
import { MAGIC_RUNES } from '../data/magicCatalog';
import {
  ACTION_PANEL_RECTS, BACKPACK_SLOT_RECTS, CHEST_SLOT_RECTS, EQUIP_SLOT_RECTS,
  PROGRESSION_PANEL_RECTS, RUNE_PANEL_RECTS, RUNE_RECTS, championHandRect, championSlotRect
} from '../render/layout';
import { FRAMEBUFFER_HEIGHT, FRAMEBUFFER_WIDTH, LAYOUT_RECTS, pointInRect } from '../render';

export interface BoundingClientRectLike {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface AmigaPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Maps a browser clientX/clientY pointer position onto the 320x200 Amiga coordinate space
 * using the canvas element's live getBoundingClientRect(). Returns null if out of bounds.
 */
export function clientPointToAmigaCoords(
  clientX: number,
  clientY: number,
  canvasRect: BoundingClientRectLike
): AmigaPoint | null {
  if (canvasRect.width <= 0 || canvasRect.height <= 0) {
    return null;
  }
  const relX = clientX - canvasRect.left;
  const relY = clientY - canvasRect.top;
  if (relX < 0 || relX >= canvasRect.width || relY < 0 || relY >= canvasRect.height) {
    return null;
  }
  const x = Math.floor((relX * FRAMEBUFFER_WIDTH) / canvasRect.width);
  const y = Math.floor((relY * FRAMEBUFFER_HEIGHT) / canvasRect.height);
  if (x < 0 || x >= FRAMEBUFFER_WIDTH || y < 0 || y >= FRAMEBUFFER_HEIGHT) {
    return null;
  }
  return { x, y };
}

/**
 * Resolves a [0..319, 0..199] Amiga pixel click into a pure GameCommand, or null if non-interactive.
 */
export function resolvePointerHitCommand(px: number, py: number, state: GameState, button = 0): GameCommand | null {
  if (state.gameOver) return null;
  if (state.party.sleeping) return { type: 'SET_SLEEPING', sleeping: false };
  // Modal dialog captures every click until resolved or cancelled.
  if (state.activeMirror !== null) {
    if (pointInRect(px, py, LAYOUT_RECTS.MIRROR_BTN_CANCEL)) {
      return { type: 'CANCEL_MIRROR' };
    }
    if (state.party.champions.length < 4) {
      if (pointInRect(px, py, LAYOUT_RECTS.MIRROR_BTN_RESURRECT)) {
        return { type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' };
      }
      if (pointInRect(px, py, LAYOUT_RECTS.MIRROR_BTN_REINCARNATE)) {
        return { type: 'RECRUIT_CHAMPION', mode: 'REINCARNATE' };
      }
    }
    return null;
  }

  if (state.interaction.kind === 'ACTION_MENU') {
    const interaction = state.interaction;
    if (pointInRect(px, py, ACTION_PANEL_RECTS.CLOSE)) return { type: 'CLOSE_INTERACTION' };
    if (pointInRect(px, py, ACTION_PANEL_RECTS.SWING)) return { type: 'EXECUTE_COMBAT_ACTION', championIndex: interaction.championIndex, hand: interaction.hand, actionId: 'SWING' };
    if (pointInRect(px, py, ACTION_PANEL_RECTS.SHOOT)) return { type: 'EXECUTE_COMBAT_ACTION', championIndex: interaction.championIndex, hand: interaction.hand, actionId: 'SHOOT' };
    if (pointInRect(px, py, ACTION_PANEL_RECTS.RUNES)) return { type: 'OPEN_RUNE_PANEL', championIndex: interaction.championIndex };
    if (pointInRect(px, py, ACTION_PANEL_RECTS.PROGRESSION)) return { type: 'OPEN_PROGRESSION_VIEW', championIndex: interaction.championIndex };
    return null;
  }
  if (state.interaction.kind === 'RUNE_PANEL') {
    const championIndex = state.interaction.championIndex;
    const runeIndex = RUNE_RECTS.findIndex((rect) => pointInRect(px, py, rect));
    if (runeIndex >= 0) return { type: 'ADD_RUNE', championIndex, rune: MAGIC_RUNES[runeIndex]!.id };
    if (pointInRect(px, py, RUNE_PANEL_RECTS.REMOVE)) return { type: 'REMOVE_RUNE', championIndex };
    if (pointInRect(px, py, RUNE_PANEL_RECTS.CLEAR)) return { type: 'CLEAR_RUNES', championIndex };
    if (pointInRect(px, py, RUNE_PANEL_RECTS.INVOKE)) return { type: 'INVOKE_RUNES', championIndex };
    if (pointInRect(px, py, RUNE_PANEL_RECTS.CLOSE)) return { type: 'CLOSE_INTERACTION' };
    if (pointInRect(px, py, RUNE_PANEL_RECTS.FLASK)) {
      const champion = state.party.champions[championIndex];
      const ids = champion ? [champion.inventory.slots.leftHand, champion.inventory.slots.rightHand,
        champion.inventory.slots.pouch1, champion.inventory.slots.pouch2, ...champion.inventory.backpack] : [];
      const flaskId = ids.find((id) => id && state.items[id]?.name === 'EMPTY FLASK') ?? null;
      return { type: 'SELECT_BREW_FLASK', championIndex, flaskId };
    }
    return null;
  }
  if (state.interaction.kind === 'PROGRESSION_VIEW') {
    return pointInRect(px, py, PROGRESSION_PANEL_RECTS.CLOSE) ? { type: 'CLOSE_INTERACTION' } : null;
  }

  // Ordinary utility pills resolve only after mirror and Sprint 3 interaction ownership.
  if (pointInRect(px, py, LAYOUT_RECTS.QOL_PILL)) return { type: 'TOGGLE_QOL_MODE' };
  if (pointInRect(px, py, LAYOUT_RECTS.AUTOMAP_PILL)) return { type: 'TOGGLE_AUTOMAP' };
  if (pointInRect(px, py, LAYOUT_RECTS.AUDIO_PILL)) {
    return { type: 'SET_AUDIO_MUTED', muted: !state.settings.audioMuted };
  }

  if (state.settings.qolMode && state.settings.automapOpen && pointInRect(px, py, LAYOUT_RECTS.VIEWPORT)) return { type: 'TOGGLE_AUTOMAP' };
  if (pointInRect(px, py, LAYOUT_RECTS.SLEEP_PILL)) return { type: 'SET_SLEEPING', sleeping: true };
  if (button === 2) {
    const index = px < 272 && py < 29 ? Math.floor(px / 68) : state.openInventoryChampionIndex ?? state.party.leaderIndex;
    return { type: 'TOGGLE_INVENTORY', championIndex: index };
  }
  if (button !== 0) return null;
  for (let i = 0; i < state.party.champions.length; i++) {
    if (!pointInRect(px, py, championSlotRect(i))) continue;
    for (const slot of ['leftHand', 'rightHand'] as const) {
      if (pointInRect(px, py, championHandRect(i, slot))) {
        const occupied = state.party.champions[i]?.inventory.slots[slot];
        if (occupied && !state.handItem && state.openInventoryChampionIndex === null) {
          return { type: 'OPEN_ACTION_MENU', championIndex: i, hand: slot };
        }
        return { type: 'CLICK_EQUIP_SLOT', championIndex: i, slot };
      }
    }
    return py < 9 ? { type: 'TOGGLE_INVENTORY', championIndex: i } : { type: 'SELECT_LEADER', championIndex: i };
  }
  const inventoryIndex = state.openInventoryChampionIndex;
  if (inventoryIndex !== null && pointInRect(px, py, LAYOUT_RECTS.VIEWPORT)) {
    if (pointInRect(px,py,LAYOUT_RECTS.INVENTORY_CLOSE)) return { type: 'TOGGLE_INVENTORY', championIndex: null };
    if (pointInRect(px,py,LAYOUT_RECTS.INVENTORY_SLEEP)) return { type: 'SET_SLEEPING', sleeping: true };
    if (pointInRect(px,py,LAYOUT_RECTS.INVENTORY_EYE)) return { type: 'INSPECT_HAND_ITEM', championIndex: inventoryIndex };
    if (pointInRect(px,py,LAYOUT_RECTS.INVENTORY_MOUTH)) return { type: 'CONSUME_HAND_ITEM', championIndex: inventoryIndex };
    const container=state.openContainerId ? state.items[state.openContainerId] : undefined;
    if (container?.contents) {
      const slotIndex=CHEST_SLOT_RECTS.findIndex(rect=>pointInRect(px,py,rect));
      if (slotIndex>=0) return {type:'CLICK_CONTAINER_SLOT',slotIndex};
    }
    for (const slot of Object.keys(EQUIP_SLOT_RECTS) as EquipSlotId[]) {
      if (pointInRect(px,py,EQUIP_SLOT_RECTS[slot])) return {type:'CLICK_EQUIP_SLOT',championIndex:inventoryIndex,slot};
    }
    const slotIndex=BACKPACK_SLOT_RECTS.findIndex(rect=>pointInRect(px,py,rect));
    return slotIndex>=0 ? {type:'CLICK_BACKPACK_SLOT',championIndex:inventoryIndex,slotIndex} : null;
  }

  // 3. Classic 6-button Movement Arrow Pad (224, 124, 96, 45)
  const pad = LAYOUT_RECTS.MOVEMENT_PAD;
  if (pointInRect(px, py, pad)) {
    const col = Math.min(2, Math.floor((px - pad.x) / 32));
    const isBottomRow = py >= pad.y + 22;
    if (!isBottomRow) {
      if (col === 0) return { type: 'TURN', direction: 'LEFT' };
      if (col === 1) return { type: 'MOVE', direction: 'FORWARD' };
      return { type: 'TURN', direction: 'RIGHT' };
    }
    if (col === 0) return { type: 'MOVE', direction: 'STRAFE_LEFT' };
    if (col === 1) return { type: 'MOVE', direction: 'BACKWARD' };
    return { type: 'MOVE', direction: 'STRAFE_RIGHT' };
  }

  // 4. Center viewport ahead interaction (switches, sconces, mirrors, door buttons)
  if (pointInRect(px, py, LAYOUT_RECTS.VIEWPORT)) {
    if (state.openInventoryChampionIndex !== null) return {type:'TOGGLE_INVENTORY',championIndex:null};
    if (state.settings.qolMode && state.settings.automapOpen) {
      return { type: 'TOGGLE_AUTOMAP' };
    }
    const delta=DIRECTION_DELTAS[state.party.facing];
    const tile=state.levels.find(level=>level.id===state.party.level)?.tiles[state.party.y+delta.dy]?.[state.party.x+delta.dx];
    const face=(state.party.facing+2)&3;
    if (pointInRect(px,py,LAYOUT_RECTS.WALL_FEATURE_HIT) && tile?.wallFeatures.some(feature=>feature.face===face && ['KEYHOLE','VI_ALTAR','FOUNTAIN','ALCOVE'].includes(feature.kind))) return {type:'INTERACT_AHEAD'};
    if (pointInRect(px,py,LAYOUT_RECTS.FLOOR_LEFT_HIT)) return {type:'PICKUP_OR_DROP_FLOOR',quadrant:state.party.facing};
    if (pointInRect(px,py,LAYOUT_RECTS.FLOOR_RIGHT_HIT)) return {type:'PICKUP_OR_DROP_FLOOR',quadrant:((state.party.facing+1)&3) as 0|1|2|3};
    if (state.handItem && py<132) return {type:'THROW_HAND_ITEM',side:px<112?'LEFT':'RIGHT'};
    if (pointInRect(px, py, LAYOUT_RECTS.VIEWPORT_CENTER_HIT)) {
      return { type: 'INTERACT_AHEAD' };
    }
  }

  return null;
}

/**
 * Translates keyboard events into GameCommands.
 * Escape always cancels active modals; QWEASD / Arrow keys / M require settings.qolMode === true.
 */
export function resolveKeyboardCommand(key: string, state: GameState): GameCommand | null {
  if (state.gameOver) return null;
  if (state.party.sleeping) return {type:'SET_SLEEPING',sleeping:false};
  if (key === 'Escape') {
    if (state.activeMirror !== null) {
      return { type: 'CANCEL_MIRROR' };
    }
    if (state.openInventoryChampionIndex !== null) return {type:'TOGGLE_INVENTORY',championIndex:null};
    if (state.interaction.kind !== 'NONE') return { type: 'CLOSE_INTERACTION' };
    if (state.settings.qolMode && state.settings.automapOpen) {
      return { type: 'TOGGLE_AUTOMAP' };
    }
    return null;
  }

  // 1988 Purist Mode disables modern keyboard movement and automap hotkeys
  if (!state.settings.qolMode || state.activeMirror !== null) {
    return null;
  }

  if (state.interaction.kind === 'ACTION_MENU') {
    const interaction = state.interaction;
    if (key === '1') return { type: 'EXECUTE_COMBAT_ACTION', championIndex: interaction.championIndex, hand: interaction.hand, actionId: 'SWING' };
    if (key === '2') return { type: 'EXECUTE_COMBAT_ACTION', championIndex: interaction.championIndex, hand: interaction.hand, actionId: 'SHOOT' };
    if (key.toLowerCase() === 'r') return { type: 'OPEN_RUNE_PANEL', championIndex: interaction.championIndex };
    if (key.toLowerCase() === 'p') return { type: 'OPEN_PROGRESSION_VIEW', championIndex: interaction.championIndex };
    return null;
  }
  if (state.interaction.kind === 'RUNE_PANEL') {
    const championIndex = state.interaction.championIndex;
    const shortcut = '123456qwertyasdfghzxcvbn'.indexOf(key.toLowerCase());
    if (shortcut >= 0 && shortcut < MAGIC_RUNES.length) return { type: 'ADD_RUNE', championIndex, rune: MAGIC_RUNES[shortcut]!.id };
    if (key === 'Backspace') return { type: 'REMOVE_RUNE', championIndex };
    if (key === 'Delete') return { type: 'CLEAR_RUNES', championIndex };
    if (key === 'Enter') return { type: 'INVOKE_RUNES', championIndex };
    return null;
  }
  if (state.interaction.kind === 'PROGRESSION_VIEW') return null;

  if (/^[1-4]$/.test(key)) return {type:'TOGGLE_INVENTORY',championIndex:Number(key)-1};
  if (key.toLowerCase()==='z') return {type:'SET_SLEEPING',sleeping:true};
  if (state.openInventoryChampionIndex!==null) return null;

  switch (key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      return { type: 'MOVE', direction: 'FORWARD' };
    case 's':
    case 'S':
    case 'ArrowDown':
      return { type: 'MOVE', direction: 'BACKWARD' };
    case 'a':
    case 'A':
      return { type: 'MOVE', direction: 'STRAFE_LEFT' };
    case 'd':
    case 'D':
      return { type: 'MOVE', direction: 'STRAFE_RIGHT' };
    case 'q':
    case 'Q':
    case 'ArrowLeft':
      return { type: 'TURN', direction: 'LEFT' };
    case 'e':
    case 'E':
    case 'ArrowRight':
      return { type: 'TURN', direction: 'RIGHT' };
    case 'm':
    case 'M':
      return { type: 'TOGGLE_AUTOMAP' };
    case ' ':
    case 'Enter':
      return { type: 'INTERACT_AHEAD' };
    default:
      return null;
  }
}
