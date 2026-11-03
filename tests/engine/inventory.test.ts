/**
 * Task 1.2 tests: pure InventoryEngine (slots, backpack, chests, hand, floor, load, light).
 *
 * TLDR:
 *   Drives the real SimulationReducer on the clean-room campaign: recruits champions (which grants
 *   starting gear), then exercises slot validation ("CANNOT EQUIP THERE"), swaps, backpack,
 *   nested 8-slot chests, eating/drinking, floor pickup/drop, Load/MaxLoad encumbrance penalties on
 *   movement, persistent handItem across inventory toggles, and torch/Illumulet light.
 */

import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import { findItemDefByLegacyName } from '../../src/data/itemCatalog';
import {
  championLoadTenths,
  itemLightBonus,
  maxLoadTenths,
  partyLightBonus,
  slotAcceptsDef
} from '../../src/engine/inventory';
import type { GameState } from '../../src/engine/types';
import { hold, lastMessage, partyOf, run, withItem } from './testkit';

describe('Task 1.2: starting gear on recruit', () => {
  it('creates item instances and equips them into compatible slots (weapons into hands)', () => {
    const state = partyOf('iaido');
    const c = state.party.champions[0]!;
    expect(c.alive).toBe(true);
    expect(c.food).toBe(1500);
    expect(c.water).toBe(1500);
    const slotName = (slot: keyof typeof c.inventory.slots): string | null => {
      const id = c.inventory.slots[slot];
      return id ? (state.items[id]?.name ?? null) : null;
    };
    expect(slotName('torso')).toBe('GHI');
    expect(slotName('legs')).toBe('GHI TROUSERS');
    expect([slotName('rightHand'), slotName('leftHand')]).toContain('SAMURAI SWORD');
    // HUD labels stay in sync with the slots
    expect([c.leftHand, c.rightHand]).toContain('SAMURAI SWORD');
  });

  it('puts every starting item somewhere (slot or backpack) for all four clean-room heroes', () => {
    const state = partyOf('iaido', 'zed', 'chani', 'elija');
    for (const c of state.party.champions) {
      const placed = [
        ...Object.values(c.inventory.slots),
        ...c.inventory.backpack
      ].filter((v): v is string => v !== null);
      expect(placed.length).toBe(c.startingItems.length);
    }
  });
});

describe('Task 1.2: slot compatibility & cursor hand', () => {
  it('maps equip masks onto slots', () => {
    const helm = findItemDefByLegacyName('HELMET');
    expect(slotAcceptsDef('head', helm)).toBe(true);
    expect(slotAcceptsDef('torso', helm)).toBe(false);
    expect(slotAcceptsDef('leftHand', helm)).toBe(true);
    const sword = findItemDefByLegacyName('SAMURAI SWORD');
    expect(slotAcceptsDef('quiver1', sword)).toBe(true);
    expect(slotAcceptsDef('pouch1', sword)).toBe(false);
  });

  it('rejects an incompatible slot, keeps the hand item and logs CANNOT EQUIP THERE', () => {
    let state = withItem(partyOf('iaido'), 'h1', 'HELMET');
    state = hold(state, 'h1');
    const res = run(state, { type: 'CLICK_EQUIP_SLOT', championIndex: 0, slot: 'feet' });
    expect(res.state.handItem).toBe('h1');
    expect(res.state.party.champions[0]!.inventory.slots.feet).toBeNull();
    expect(lastMessage(res.state)).toBe('CANNOT EQUIP THERE');
  });

  it('equips into an empty slot then swaps with an occupied one', () => {
    let state = withItem(withItem(partyOf('zed'), 'h1', 'HELMET'), 'h2', 'BASINET');
    state = hold(state, 'h1');
    let res = run(state, { type: 'CLICK_EQUIP_SLOT', championIndex: 0, slot: 'head' });
    expect(res.state.handItem).toBeNull();
    expect(res.state.party.champions[0]!.inventory.slots.head).toBe('h1');
    expect(res.events.some((e) => e.type === 'ITEM_EQUIPPED')).toBe(true);

    res = run(hold(res.state, 'h2'), { type: 'CLICK_EQUIP_SLOT', championIndex: 0, slot: 'head' });
    expect(res.state.party.champions[0]!.inventory.slots.head).toBe('h2');
    expect(res.state.handItem).toBe('h1');
  });

  it('picks an equipped item back up into the hand and refreshes hand labels', () => {
    const state = partyOf('zed');
    const c = state.party.champions[0]!;
    const torchId = c.inventory.slots.rightHand ?? c.inventory.slots.leftHand;
    const slot = c.inventory.slots.rightHand ? 'rightHand' : 'leftHand';
    expect(torchId).toBeTruthy();
    const res = run(state, { type: 'CLICK_EQUIP_SLOT', championIndex: 0, slot });
    expect(res.state.handItem).toBe(torchId);
    const after = res.state.party.champions[0]!;
    expect(after.inventory.slots[slot]).toBeNull();
    expect(slot === 'rightHand' ? after.rightHand : after.leftHand).toBeNull();
  });

  it('ignores clicks for missing champions and empty-to-empty clicks', () => {
    const state = partyOf('zed');
    expect(run(state, { type: 'CLICK_EQUIP_SLOT', championIndex: 3, slot: 'head' }).state).toBe(state);
    expect(run(state, { type: 'CLICK_EQUIP_SLOT', championIndex: 0, slot: 'neck' }).state.handItem).toBeNull();
  });

  it('keeps handItem across opening, switching and closing the inventory', () => {
    let state = hold(withItem(partyOf('iaido', 'zed'), 'a1', 'APPLE'), 'a1');
    state = run(state, { type: 'TOGGLE_INVENTORY', championIndex: 0 }).state;
    expect(state.openInventoryChampionIndex).toBe(0);
    state = run(state, { type: 'TOGGLE_INVENTORY', championIndex: 1 }).state;
    expect(state.openInventoryChampionIndex).toBe(1);
    state = run(state, { type: 'TOGGLE_INVENTORY', championIndex: 1 }).state;
    expect(state.openInventoryChampionIndex).toBeNull();
    expect(state.handItem).toBe('a1');
    expect(run(state, { type: 'TOGGLE_INVENTORY', championIndex: 9 }).state.openInventoryChampionIndex).toBeNull();
  });

  it('selects a living champion as leader and blocks inventory while a mirror is open', () => {
    const state = partyOf('iaido', 'zed');
    expect(run(state, { type: 'SELECT_LEADER', championIndex: 1 }).state.party.leaderIndex).toBe(1);
    expect(run(state, { type: 'SELECT_LEADER', championIndex: 5 }).state.party.leaderIndex).toBe(0);
    const bundle = createCleanRoomBundle();
    const modal = { ...state, activeMirror: { wallX: 2, wallY: 1, face: 2 as const, champion: bundle.dungeon.champions.chani! } };
    expect(run(modal, { type: 'TOGGLE_INVENTORY', championIndex: 0 }).state).toBe(modal);
  });
});

describe('Task 1.2: backpack & chests', () => {
  it('stores to and retrieves from the 17-slot backpack by swapping with the hand', () => {
    let state = hold(withItem(partyOf('zed'), 'a1', 'APPLE'), 'a1');
    const freeIdx = state.party.champions[0]!.inventory.backpack.indexOf(null);
    state = run(state, { type: 'CLICK_BACKPACK_SLOT', championIndex: 0, slotIndex: freeIdx }).state;
    expect(state.handItem).toBeNull();
    expect(state.party.champions[0]!.inventory.backpack[freeIdx]).toBe('a1');
    state = run(state, { type: 'CLICK_BACKPACK_SLOT', championIndex: 0, slotIndex: freeIdx }).state;
    expect(state.handItem).toBe('a1');
    expect(run(state, { type: 'CLICK_BACKPACK_SLOT', championIndex: 0, slotIndex: 99 }).state).toBe(state);
  });

  it('opens a chest from the hand, packs up to 8 fitting items and rejects chests/non-fitting items', () => {
    let state = withItem(partyOf('zed'), 'c1', 'CHEST');
    state = { ...state, items: { ...state.items, c1: { ...state.items.c1!, contents: [] } } };
    state = hold(state, 'c1');
    state = run(state, { type: 'INSPECT_HAND_ITEM', championIndex: 0 }).state;
    expect(state.openContainerId).toBe('c1');

    // chest inside chest rejected
    state = withItem(state, 'c2', 'CHEST');
    state = run(hold(state, 'c2'), { type: 'CLICK_CONTAINER_SLOT', slotIndex: 0 }).state;
    expect(lastMessage(state)).toBe("IT WON'T FIT IN THE CHEST");
    expect(state.handItem).toBe('c2');

    // non-fitting item (sword) rejected
    state = withItem(state, 's1', 'SAMURAI SWORD');
    state = run(hold(state, 's1'), { type: 'CLICK_CONTAINER_SLOT', slotIndex: 0 }).state;
    expect(lastMessage(state)).toBe("IT WON'T FIT IN THE CHEST");

    // fill with 8 apples, 9th rejected as full
    for (let i = 0; i < 8; i++) {
      state = withItem(state, `ap${i}`, 'APPLE');
      state = run(hold(state, `ap${i}`), { type: 'CLICK_CONTAINER_SLOT', slotIndex: Math.min(i, 7) }).state;
      expect(state.handItem).toBeNull();
    }
    expect(state.items.c1!.contents).toHaveLength(8);
    state = withItem(state, 'ap9', 'APPLE');
    state = run(hold(state, 'ap9'), { type: 'CLICK_CONTAINER_SLOT', slotIndex: 7 }).state; // swap with slot 7
    expect(state.handItem).toBe('ap7');
    expect(state.items.c1!.contents![7]).toBe('ap9');

    // take one out
    state = run(hold(state, null), { type: 'CLICK_CONTAINER_SLOT', slotIndex: 0 }).state;
    expect(state.handItem).toBe('ap0');
    expect(state.items.c1!.contents).toHaveLength(7);
  });

  it('reports a full chest when adding to an empty slot index beyond capacity', () => {
    let state = withItem(partyOf('zed'), 'c1', 'CHEST');
    const ids = Array.from({ length: 8 }, (_, i) => `f${i}`);
    for (const id of ids) {
      state = withItem(state, id, 'APPLE');
    }
    state = { ...state, items: { ...state.items, c1: { ...state.items.c1!, contents: ids } }, openContainerId: 'c1' };
    expect(state.items.c1!.contents).toHaveLength(8);
  });

  it('reads a scroll into the message log and describes plain items with weight', () => {
    let state = withItem(partyOf('zed'), 'sc', 'SCROLL');
    state = { ...state, items: { ...state.items, sc: { ...state.items.sc!, scrollText: ['LINE ONE', 'LINE TWO'] } } };
    state = run(hold(state, 'sc'), { type: 'INSPECT_HAND_ITEM', championIndex: 0 }).state;
    expect(state.messages.slice(-2)).toEqual(['LINE ONE', 'LINE TWO']);

    state = withItem(state, 'a1', 'APPLE');
    state = run(hold(state, 'a1'), { type: 'INSPECT_HAND_ITEM', championIndex: 0 }).state;
    expect(lastMessage(state)).toMatch(/^APPLE \(\d+\.\d KG\)$/);
  });
});

describe('Task 1.2: eating & drinking', () => {
  it('eating consumes the item and raises food (clamped)', () => {
    let state = withItem(partyOf('zed'), 'ap', 'APPLE');
    state = { ...state, party: { ...state.party, champions: [{ ...state.party.champions[0]!, food: 100 }] } };
    const res = run(hold(state, 'ap'), { type: 'CONSUME_HAND_ITEM', championIndex: 0 });
    expect(res.state.party.champions[0]!.food).toBeGreaterThan(100);
    expect(res.state.handItem).toBeNull();
    expect(res.state.items.ap).toBeUndefined();
    expect(res.events.some((e) => e.type === 'ITEM_CONSUMED')).toBe(true);
    expect(res.events.some((e) => e.type === 'SOUND_CUE' && e.cue === 'GULP')).toBe(true);

    const full = { ...state, party: { ...state.party, champions: [{ ...state.party.champions[0]!, food: 2040 }] } };
    expect(run(hold(full, 'ap'), { type: 'CONSUME_HAND_ITEM', championIndex: 0 }).state.party.champions[0]!.food).toBe(2048);
  });

  it('a waterskin loses a charge and survives; an empty one refuses', () => {
    let state = withItem(partyOf('zed'), 'ws', 'WATERSKIN', { charges: 1 });
    state = { ...state, party: { ...state.party, champions: [{ ...state.party.champions[0]!, water: 0 }] } };
    let res = run(hold(state, 'ws'), { type: 'CONSUME_HAND_ITEM', championIndex: 0 });
    expect(res.state.party.champions[0]!.water).toBeGreaterThan(0);
    expect(res.state.items.ws!.charges).toBe(0);
    expect(res.state.handItem).toBe('ws');
    res = run(res.state, { type: 'CONSUME_HAND_ITEM', championIndex: 0 });
    expect(lastMessage(res.state)).toBe('THE WATERSKIN IS EMPTY');
  });

  it('refuses inedible items and ignores an empty hand', () => {
    let state = withItem(partyOf('zed'), 'sw', 'SAMURAI SWORD');
    const res = run(hold(state, 'sw'), { type: 'CONSUME_HAND_ITEM', championIndex: 0 });
    expect(lastMessage(res.state)).toBe('YOU CANNOT EAT OR DRINK THAT');
    expect(res.state.handItem).toBe('sw');
    state = hold(state, null);
    expect(run(state, { type: 'CONSUME_HAND_ITEM', championIndex: 0 }).state).toBe(state);
  });
});

describe('Task 1.2: floor pickup & drop', () => {
  function onStarterTile(): GameState {
    const state = partyOf('zed');
    return { ...state, party: { ...state.party, level: 0, x: 2, y: 2 } };
  }

  it('picks the top item from a sub-tile stack and drops it back onto another quadrant', () => {
    let state = onStarterTile();
    let res = run(state, { type: 'PICKUP_OR_DROP_FLOOR', quadrant: 2 });
    expect(res.state.handItem).toBe('cr_dagger_1');
    expect(res.events.some((e) => e.type === 'ITEM_PICKED_UP')).toBe(true);

    state = res.state;
    res = run(state, { type: 'PICKUP_OR_DROP_FLOOR', quadrant: 3 });
    expect(res.state.handItem).toBeNull();
    const tile = res.state.levels.find((l) => l.id === 0)!.tiles[2]![2]!;
    expect(tile.floorItems?.[3]).toEqual(['cr_dagger_1']);
    expect(tile.floorItems?.[2]).toEqual([]);
    expect(res.events.some((e) => e.type === 'ITEM_DROPPED')).toBe(true);
  });

  it('does nothing on an empty quadrant with an empty hand', () => {
    const state = onStarterTile();
    expect(run(state, { type: 'PICKUP_OR_DROP_FLOOR', quadrant: 0 }).state).toBe(state);
  });

  it('does not pick up from or drop into a wall tile', () => {
    const state = partyOf('zed');
    const inWall = { ...state, party: { ...state.party, level: 0, x: 0, y: 0 } };
    expect(run(inWall, { type: 'PICKUP_OR_DROP_FLOOR', quadrant: 0 }).state).toBe(inWall);
  });
});

describe('Task 1.2: load, encumbrance & light', () => {
  it('sums carried weight including chest contents and scales max load with strength', () => {
    let state = partyOf('zed');
    const c0 = state.party.champions[0]!;
    const base = championLoadTenths(state, c0);
    state = withItem(withItem(state, 'c1', 'CHEST'), 'ap', 'APPLE');
    state = { ...state, items: { ...state.items, c1: { ...state.items.c1!, contents: ['ap'] } } };
    const idx = c0.inventory.backpack.indexOf(null);
    const withChest = { ...c0, inventory: { ...c0.inventory, backpack: c0.inventory.backpack.map((v, i) => (i === idx ? 'c1' : v)) } };
    const chestW = findItemDefByLegacyName('CHEST').weightTenthsKg;
    const appleW = findItemDefByLegacyName('APPLE').weightTenthsKg;
    expect(championLoadTenths(state, withChest)).toBe(base + chestW + appleW);
    expect(maxLoadTenths({ ...c0, attributes: { ...c0.attributes, strength: 80 } })).toBeGreaterThan(
      maxLoadTenths({ ...c0, attributes: { ...c0.attributes, strength: 20 } })
    );
    expect(maxLoadTenths({ ...c0, stamina: 0 })).toBeLessThan(maxLoadTenths({ ...c0, stamina: c0.maxStamina }));
  });

  it('adds move cooldown ticks when burdened/overloaded and none when light', () => {
    const light = partyOf('zed');
    const lightStep = run(light, { type: 'MOVE', direction: 'FORWARD' });
    expect(lightStep.state.party.moveCooldownTicks).toBe(1);

    let heavy = withItem(partyOf('zed'), 'tp', 'TORSO PLATE');
    const c = heavy.party.champions[0]!;
    const idx = c.inventory.backpack.indexOf(null);
    heavy = {
      ...heavy,
      party: {
        ...heavy.party,
        champions: [
          {
            ...c,
            attributes: { ...c.attributes, strength: 1 },
            inventory: { ...c.inventory, backpack: c.inventory.backpack.map((v, i) => (i === idx ? 'tp' : v)) }
          }
        ]
      }
    };
    const step = run(heavy, { type: 'MOVE', direction: 'FORWARD' });
    expect(step.state.party.moveCooldownTicks).toBe(3);
  });

  it('computes light from lit torches in hands and Illumulet at the neck', () => {
    let state = partyOf('zed');
    const c = state.party.champions[0]!;
    const torchSlot = c.inventory.slots.rightHand ? 'rightHand' : 'leftHand';
    const torchId = c.inventory.slots[torchSlot]!;
    state = { ...state, party: { ...state.party, torchLight: 0 } };
    expect(state.items[torchId]!.name).toBe('TORCH');
    expect(itemLightBonus(state)).toBe(3);
    expect(partyLightBonus(state)).toBe(3);

    const burnedOut = { ...state, items: { ...state.items, [torchId]: { ...state.items[torchId]!, charges: 0 } } };
    expect(itemLightBonus(burnedOut)).toBe(0);

    state = withItem(burnedOut, 'ill', 'ILLUMULET');
    const worn = { ...state.party.champions[0]!, inventory: { ...c.inventory, slots: { ...c.inventory.slots, neck: 'ill' } } };
    state = { ...state, party: { ...state.party, champions: [worn] } };
    expect(itemLightBonus(state)).toBe(2);

    const dead = { ...state, party: { ...state.party, champions: [{ ...worn, alive: false }] } };
    expect(itemLightBonus(dead)).toBe(0);
  });
});
