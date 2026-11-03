/**
 * Task 1.3 tests: ProjectileEngine, SurvivalEngine and hand-aware wall interactions.
 *
 * TLDR:
 *   Exercises corridor throws (range, lanes, grates, walls, teleporters, pits, pressure plates),
 *   food/water metabolism, regeneration, starvation, torch burn, sleep/wake, champion death with
 *   BONES, Vi Altar rebirth, fountain drink/refill, keyhole unlock and alcove pick/drop on the
 *   clean-room campaign via the real SimulationReducer.
 */

import { describe, expect, it } from 'vitest';
import { updateTileInLevels } from '../../src/engine/actuators';
import { itemLightBonus } from '../../src/engine/inventory';
import { laneQuadrant, throwRangeTiles } from '../../src/engine/projectiles';
import { killChampion, torchIconForCharges } from '../../src/engine/survival';
import type { GameState } from '../../src/engine/types';
import {
  floorItemIds,
  hold,
  lastMessage,
  partyOf,
  patchChampion,
  placeAt,
  run,
  setStrength,
  tick,
  tileAt,
  withItem
} from './testkit';

describe('Task 1.3: throw range & lanes', () => {
  it('range grows with strength, shrinks with weight, and is clamped to 1..8', () => {
    expect(throwRangeTiles(80, 140)).toBeGreaterThan(throwRangeTiles(20, 140));
    expect(throwRangeTiles(40, 10)).toBeGreaterThan(throwRangeTiles(40, 140));
    expect(throwRangeTiles(1, 500)).toBe(1);
    expect(throwRangeTiles(999, 1)).toBe(8);
  });

  it('maps lanes to the far-left / far-right quadrant of the travel direction', () => {
    expect(laneQuadrant(0, 'LEFT')).toBe(0);
    expect(laneQuadrant(0, 'RIGHT')).toBe(1);
    expect(laneQuadrant(1, 'LEFT')).toBe(1);
    expect(laneQuadrant(1, 'RIGHT')).toBe(2);
    expect(laneQuadrant(3, 'RIGHT')).toBe(0);
  });
});

describe('Task 1.3: throwing', () => {
  it('launches a projectile, empties the hand, costs stamina and plays the swoosh', () => {
    let state = placeAt(withItem(partyOf('zed'), 'd1', 'DAGGER'), 0, 1, 2, 1);
    state = hold(state, 'd1');
    const stamina = state.party.champions[0]!.stamina;
    const res = run(state, { type: 'THROW_HAND_ITEM', side: 'RIGHT' });
    expect(res.state.handItem).toBeNull();
    expect(res.state.projectiles).toHaveLength(1);
    expect(res.state.projectiles[0]).toMatchObject({ itemId: 'd1', direction: 1, lane: 'RIGHT', x: 1, y: 2 });
    expect(res.state.party.champions[0]!.stamina).toBeLessThan(stamina);
    expect(res.events.some((e) => e.type === 'ITEM_THROWN')).toBe(true);
    expect(res.events.some((e) => e.type === 'SOUND_CUE' && e.cue === 'THROW_SWOOSH')).toBe(true);
  });

  it('refuses to throw with an empty hand, an open inventory, asleep, or during the mirror modal', () => {
    const base = placeAt(withItem(partyOf('zed'), 'd1', 'DAGGER'), 0, 1, 2, 1);
    expect(run(base, { type: 'THROW_HAND_ITEM', side: 'LEFT' }).state.projectiles).toHaveLength(0);
    const holding = hold(base, 'd1');
    expect(run({ ...holding, openInventoryChampionIndex: 0 }, { type: 'THROW_HAND_ITEM', side: 'LEFT' }).state.handItem).toBe('d1');
    expect(run({ ...holding, party: { ...holding.party, sleeping: true } }, { type: 'THROW_HAND_ITEM', side: 'LEFT' }).state.party.sleeping).toBe(false); // wakes only
    const modal = { ...holding, activeMirror: { wallX: 2, wallY: 1, face: 2 as const, champion: holding.party.champions[0]! } };
    expect(run(modal, { type: 'THROW_HAND_ITEM', side: 'LEFT' }).state.projectiles).toHaveLength(0);
  });

  it('flies one tile per tick down the corridor and lands before the end wall in the lane quadrant', () => {
    let state = placeAt(withItem(partyOf('zed'), 'd1', 'DAGGER'), 0, 1, 2, 1);
    state = hold(setStrength(state, 0, 90), 'd1');
    state = run(state, { type: 'THROW_HAND_ITEM', side: 'RIGHT' }).state;

    state = tick(state).state;
    expect(state.projectiles[0]).toMatchObject({ x: 2, y: 2 });
    state = tick(state).state;
    expect(state.projectiles[0]).toMatchObject({ x: 3, y: 2 });

    state = tick(state, 10).state;
    expect(state.projectiles).toHaveLength(0);
    // corridor runs x=1..5; (6,2) is a wall
    expect(tileAt(state, 0, 5, 2).floorItems?.[2]).toContain('d1');
    expect(state.items.d1).toBeDefined();
  });

  it('lands when kinetic energy is exhausted before any obstacle', () => {
    let state = placeAt(withItem(partyOf('zed'), 'd1', 'DAGGER'), 0, 1, 2, 1);
    state = hold(setStrength(state, 0, 3), 'd1'); // range 2
    state = run(state, { type: 'THROW_HAND_ITEM', side: 'LEFT' }).state;
    state = tick(state, 2).state;
    expect(state.projectiles).toHaveLength(0);
    expect(tileAt(state, 0, 3, 2).floorItems?.[1]).toContain('d1');
  });

  it('stops a heavy item at a closed iron grate but lets a slender dagger slip through to the plate', () => {
    // Level 1: grate door at (5,3) closed, pressure plate at (5,2); party at (5,4) facing North.
    const base = placeAt(partyOf('zed'), 1, 5, 4, 0);
    expect(tileAt(base, 1, 5, 3).door?.targetProgress).toBe(4);

    // Heavy plate armour: not pass-through -> lands on the party tile before the grate
    let heavy = withItem(base, 'tp', 'TORSO PLATE');
    heavy = hold(setStrength(heavy, 0, 90), 'tp');
    heavy = run(heavy, { type: 'THROW_HAND_ITEM', side: 'LEFT' }).state;
    heavy = tick(heavy, 2).state;
    expect(heavy.projectiles).toHaveLength(0);
    expect(tileAt(heavy, 1, 5, 4).floorItems?.[0]).toContain('tp');
    expect(tileAt(heavy, 1, 5, 3).door?.targetProgress).toBe(4);

    // Slender dagger with range 2: through the grate, lands on the plate, which opens the grate.
    let slim = withItem(base, 'd1', 'DAGGER');
    slim = hold(setStrength(slim, 0, 3), 'd1');
    slim = run(slim, { type: 'THROW_HAND_ITEM', side: 'LEFT' }).state;
    slim = tick(slim, 1).state;
    expect(slim.projectiles[0]).toMatchObject({ x: 5, y: 3 });
    const landed = tick(slim, 1);
    expect(landed.state.projectiles).toHaveLength(0);
    expect(tileAt(landed.state, 1, 5, 2).floorItems?.[0]).toContain('d1');
    expect(landed.events.some((e) => e.type === 'SOUND_CUE' && e.cue === 'SWITCH_CLICK')).toBe(true);
    expect(tileAt(landed.state, 1, 5, 3).door?.targetProgress).toBe(0);
  });

  it('drops an item through an open pit onto the level below', () => {
    // Level 1 pit at (4,2); throw West from (5,2).
    let state = placeAt(withItem(partyOf('zed'), 'd1', 'DAGGER'), 1, 5, 2, 3);
    state = hold(setStrength(state, 0, 90), 'd1');
    state = run(state, { type: 'THROW_HAND_ITEM', side: 'LEFT' }).state;
    state = tick(state, 1).state;
    expect(state.projectiles).toHaveLength(0);
    expect(floorItemIds(state, 2)).toContain('d1');
    expect(floorItemIds(state, 1)).not.toContain('d1');
  });

  it('teleports an item through an active object teleporter and keeps it flying', () => {
    // Level 0 corridor: turn (3,2) into an OBJECT teleporter that sends items to (5,2) heading West.
    const base = partyOf('zed');
    const levels = updateTileInLevels(base.levels, 0, 3, 2, (t) => ({
      ...t,
      type: 'TELEPORTER',
      teleporter: {
        active: true,
        visibleHaze: true,
        destLevel: 0,
        destX: 5,
        destY: 2,
        rotation: 3,
        absoluteRotation: true,
        scope: 'OBJECTS',
        playSound: false
      }
    }));
    let state = placeAt({ ...base, levels }, 0, 2, 2, 1);
    state = hold(setStrength(withItem(state, 'd1', 'DAGGER'), 0, 90), 'd1');
    state = run(state, { type: 'THROW_HAND_ITEM', side: 'LEFT' }).state;
    state = tick(state, 1).state; // enters the teleporter tile -> jumps
    expect(state.projectiles[0]).toMatchObject({ x: 5, y: 2, direction: 3 });
    expect(state.projectiles[0]!.kineticEnergy).toBeGreaterThan(0);
  });
});

describe('Task 1.3: metabolism & regeneration', () => {
  it('drains 1 food and 1 water every 4 ticks awake (half rate asleep)', () => {
    let state = partyOf('zed');
    state = tick(state, 8).state;
    expect(state.party.champions[0]).toMatchObject({ food: 1498, water: 1498 });

    let asleep = run(partyOf('zed'), { type: 'SET_SLEEPING', sleeping: true }).state;
    asleep = tick(asleep, 8).state;
    expect(asleep.party.champions[0]).toMatchObject({ food: 1499, water: 1499 });
  });

  it('regenerates stamina when fed, then heals health and mana once stamina is full', () => {
    let state = partyOf('zed');
    const c = state.party.champions[0]!;
    state = patchChampion(state, 0, { stamina: 0, health: c.maxHealth - 5, mana: 0 });
    state = tick(state, 6).state;
    expect(state.party.champions[0]!.stamina).toBeGreaterThan(0);
    expect(state.party.champions[0]!.health).toBe(c.maxHealth - 5);

    state = patchChampion(state, 0, { stamina: c.maxStamina });
    state = tick(state, 6).state;
    expect(state.party.champions[0]!.health).toBe(c.maxHealth - 4);
    expect(state.party.champions[0]!.mana).toBeGreaterThan(0);
  });

  it('sleep triples regeneration cadence', () => {
    const awakeBase = patchChampion(partyOf('zed'), 0, { stamina: 0 });
    const awake = tick(awakeBase, 6).state.party.champions[0]!.stamina;
    const asleepBase = run(awakeBase, { type: 'SET_SLEEPING', sleeping: true }).state;
    const asleep = tick(asleepBase, 6).state.party.champions[0]!.stamina;
    expect(asleep).toBeGreaterThan(awake);
  });

  it('drains stamina then health when food or water is negative', () => {
    let state = patchChampion(partyOf('zed'), 0, { food: -5, stamina: 10 });
    state = tick(state, 6).state;
    expect(state.party.champions[0]!.stamina).toBe(8);
    const maxHealth = state.party.champions[0]!.maxHealth;

    state = patchChampion(state, 0, { stamina: 0 });
    state = tick(state, 6).state;
    expect(state.party.champions[0]!.health).toBe(maxHealth - 1);
  });
});

describe('Task 1.3: torch burn', () => {
  it('burns one charge per 24 ticks, steps the icon, and reports burn-out', () => {
    expect(torchIconForCharges(15)).toBe(7);
    expect(torchIconForCharges(10)).toBe(6);
    expect(torchIconForCharges(5)).toBe(5);
    expect(torchIconForCharges(0)).toBe(4);

    let state = partyOf('zed');
    const c = state.party.champions[0]!;
    const slot = c.inventory.slots.rightHand ? 'rightHand' : 'leftHand';
    const id = c.inventory.slots[slot]!;
    state = { ...state, party: { ...state.party, torchLight: 0 } };
    expect(itemLightBonus(state)).toBe(3);

    state = tick(state, 24).state;
    expect(state.items[id]!.charges).toBe(14);

    state = { ...state, items: { ...state.items, [id]: { ...state.items[id]!, charges: 1 } } };
    const res = tick(state, 24);
    expect(res.state.items[id]!.charges).toBe(0);
    expect(res.state.items[id]!.iconIndex).toBe(4);
    expect(itemLightBonus(res.state)).toBe(0);
    expect(res.events.some((e) => e.type === 'MESSAGE_LOGGED' && /BURNS OUT/.test(e.text))).toBe(true);

    // burned-out torches stay at 0
    expect(tick(res.state, 24).state.items[id]!.charges).toBe(0);
  });
});

describe('Task 1.3: sleep', () => {
  it('toggles sleep, refuses it during the mirror modal, and wakes on any click or key without acting', () => {
    let state = partyOf('zed');
    const slept = run(state, { type: 'SET_SLEEPING', sleeping: true });
    expect(slept.state.party.sleeping).toBe(true);
    expect(slept.events.some((e) => e.type === 'SLEEP_STATE_CHANGED' && e.sleeping)).toBe(true);

    // time passing does not wake
    state = tick(slept.state, 3).state;
    expect(state.party.sleeping).toBe(true);

    // a movement input only wakes the party
    const before = { x: state.party.x, y: state.party.y };
    const woke = run(state, { type: 'MOVE', direction: 'FORWARD' });
    expect(woke.state.party.sleeping).toBe(false);
    expect({ x: woke.state.party.x, y: woke.state.party.y }).toEqual(before);

    const modal = { ...partyOf('zed'), activeMirror: { wallX: 2, wallY: 1, face: 2 as const, champion: state.party.champions[0]! } };
    expect(run(modal, { type: 'SET_SLEEPING', sleeping: true }).state.party.sleeping).toBe(false);
  });

  it('wakes when starvation damage lands', () => {
    let state = patchChampion(partyOf('zed'), 0, { food: -5, stamina: 0, health: 50 });
    state = run(state, { type: 'SET_SLEEPING', sleeping: true }).state;
    state = tick(state, 2).state; // asleep: regen/damage step every 2 ticks
    expect(state.party.champions[0]!.health).toBeLessThan(50);
    expect(state.party.sleeping).toBe(false);
  });
});

describe('Task 1.3: death, bones & Vi Altar', () => {
  function twoHeroesOnFloorTile(): GameState {
    return placeAt(partyOf('iaido', 'zed'), 0, 2, 2, 1);
  }

  it('drops all gear plus "<NAME> BONES" on the party tile and promotes a living leader', () => {
    const state = twoHeroesOnFloorTile();
    const events: Parameters<typeof killChampion>[2] = [];
    const next = killChampion(state, 0, events);
    const dead = next.party.champions[0]!;
    expect(dead.alive).toBe(false);
    expect(dead.health).toBe(0);
    expect(Object.values(dead.inventory.slots).every((v) => v === null)).toBe(true);
    expect(dead.inventory.backpack.every((v) => v === null)).toBe(true);
    expect(next.party.leaderIndex).toBe(1);
    expect(next.gameOver).toBe(false);

    const ids = floorItemIds(next, 0);
    expect(ids).toContain('bones_iaido');
    expect(next.items.bones_iaido!.name).toBe(`${dead.name} BONES`);
    expect(next.items.bones_iaido!.bonesChampionId).toBe('iaido');
    expect(ids.some((id) => id.startsWith('gear_iaido_'))).toBe(true);
    expect(events.some((e) => e.type === 'CHAMPION_DIED')).toBe(true);
    expect(events.some((e) => e.type === 'SOUND_CUE' && e.cue === 'CHAMPION_DEATH')).toBe(true);
  });

  it('dies from starvation and ends the game when the whole party is dead', () => {
    let state = patchChampion(placeAt(partyOf('zed'), 0, 2, 2, 1), 0, { food: -5, stamina: 0, health: 1 });
    const res = tick(state, 6);
    state = res.state;
    expect(state.party.champions[0]!.alive).toBe(false);
    expect(state.gameOver).toBe(true);
    expect(res.events.some((e) => e.type === 'CHAMPION_DIED')).toBe(true);
    expect(state.messages.some((m) => /GAME OVER/.test(m))).toBe(true);
    // a dead party no longer ticks vitals
    expect(tick(state, 12).state.party.champions[0]!.health).toBe(0);
  });

  it('revives a fallen champion by placing their bones in a facing Vi Altar', () => {
    // Level 1: Vi Altar on the South wall tile (5,6), face 0; party at (5,5) facing South.
    let state = placeAt(partyOf('iaido', 'zed'), 1, 5, 5, 2);
    state = killChampion(state, 0, []);
    state = hold(state, 'bones_iaido');

    const res = run(state, { type: 'INTERACT_AHEAD' });
    const revived = res.state.party.champions[0]!;
    expect(revived.alive).toBe(true);
    expect(revived.health).toBe(Math.max(1, Math.floor(revived.maxHealth / 2)));
    expect(revived.food).toBe(1500);
    expect(res.state.handItem).toBeNull();
    expect(res.state.items.bones_iaido).toBeUndefined();
    expect(res.events.some((e) => e.type === 'CHAMPION_REVIVED_AT_ALTAR')).toBe(true);
    expect(res.events.some((e) => e.type === 'SOUND_CUE' && e.cue === 'CHAMPION_REVIVE')).toBe(true);
  });

  it('ignores non-bones items at the altar', () => {
    let state = placeAt(withItem(partyOf('zed'), 'a1', 'APPLE'), 1, 5, 5, 2);
    state = hold(state, 'a1');
    const res = run(state, { type: 'INTERACT_AHEAD' });
    expect(res.state.handItem).toBe('a1');
  });
});

describe('Task 1.3: fountain', () => {
  // Level 0 fountain on the West wall tile (0,2), face 1; party at (1,2) facing West.
  it('drinks for the leader with an empty hand', () => {
    let state = patchChampion(placeAt(partyOf('zed'), 0, 1, 2, 3), 0, { water: 100 });
    const res = run(state, { type: 'INTERACT_AHEAD' });
    expect(res.state.party.champions[0]!.water).toBe(700);
    expect(res.events.some((e) => e.type === 'FOUNTAIN_USED')).toBe(true);
    expect(res.events.some((e) => e.type === 'SOUND_CUE' && e.cue === 'GULP')).toBe(true);
    state = patchChampion(state, 0, { water: 2000 });
    expect(run(state, { type: 'INTERACT_AHEAD' }).state.party.champions[0]!.water).toBe(2048);
  });

  it('refills a waterskin and fills an empty flask', () => {
    const base = placeAt(partyOf('zed'), 0, 1, 2, 3);
    let skin = hold(withItem(base, 'ws', 'WATERSKIN', { charges: 0 }), 'ws');
    skin = run(skin, { type: 'INTERACT_AHEAD' }).state;
    expect(skin.items.ws!.charges).toBe(3);
    expect(lastMessage(skin)).toBe('THE WATERSKIN IS REFILLED.');

    let flask = hold(withItem(base, 'fl', 'EMPTY FLASK'), 'fl');
    expect(flask.items.fl!.name).toBe('EMPTY FLASK');
    flask = run(flask, { type: 'INTERACT_AHEAD' }).state;
    expect(flask.items.fl!.name).toBe('WATER FLASK');
  });
});

describe('Task 1.3: keyholes & alcoves', () => {
  // Level 1 (6,4): button + iron keyhole on face 3; party at (5,4) facing East.
  it('unlocks the keyhole with the matching key (consumed) and opens the grate', () => {
    const base = placeAt(partyOf('zed'), 1, 5, 4, 1);
    expect(tileAt(base, 1, 5, 3).door?.targetProgress).toBe(4);

    const res = run(hold(withItem(base, 'k1', 'IRON KEY'), 'k1'), { type: 'INTERACT_AHEAD' });
    expect(res.state.handItem).toBeNull();
    expect(res.state.items.k1).toBeUndefined();
    expect(res.events.some((e) => e.type === 'LOCK_UNLOCKED')).toBe(true);
    expect(res.events.some((e) => e.type === 'SOUND_CUE' && e.cue === 'LOCK_CLICK')).toBe(true);
    expect(tileAt(res.state, 1, 6, 4).wallFeatures.find((f) => f.kind === 'KEYHOLE')?.unlocked).toBe(true);
    expect(tileAt(res.state, 1, 5, 3).door?.targetProgress).toBe(0);
  });

  it('refuses the wrong key and keeps it in hand', () => {
    const base = placeAt(partyOf('zed'), 1, 5, 4, 1);
    const res = run(hold(withItem(base, 'k2', 'GOLD KEY'), 'k2'), { type: 'INTERACT_AHEAD' });
    expect(res.state.handItem).toBe('k2');
    expect(lastMessage(res.state)).toBe('IT DOES NOT FIT THE LOCK.');
    expect(tileAt(res.state, 1, 5, 3).door?.targetProgress).toBe(4);
  });

  it('an empty click still presses the wall button, not the lock', () => {
    const base = placeAt(partyOf('zed'), 1, 5, 4, 1);
    const res = run(base, { type: 'INTERACT_AHEAD' });
    expect(res.events.some((e) => e.type === 'SWITCH_TOGGLED')).toBe(true);
    expect(res.events.some((e) => e.type === 'LOCK_UNLOCKED')).toBe(false);
    expect(tileAt(res.state, 1, 6, 4).wallFeatures.find((f) => f.kind === 'KEYHOLE')?.unlocked).toBe(false);
  });

  // Level 1 (4,4): alcove on face 1 holding the iron key + scroll; party at (5,4) facing West.
  it('picks the top item out of a wall alcove and drops it back', () => {
    const base = placeAt(partyOf('zed'), 1, 5, 4, 3);
    let state = run(base, { type: 'INTERACT_AHEAD' }).state;
    expect(state.handItem).toBe('cr_scroll_1');
    expect(tileAt(state, 1, 4, 4).wallItems?.[1]).toEqual(['cr_key_iron']);

    state = run(state, { type: 'INTERACT_AHEAD' }).state;
    expect(state.handItem).toBeNull();
    expect(tileAt(state, 1, 4, 4).wallItems?.[1]).toEqual(['cr_key_iron', 'cr_scroll_1']);
  });
});
