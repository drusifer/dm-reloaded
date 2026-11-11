import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import {
  createInitialGameState,
  createSprint3ReviewScenario,
  dispatchCommand
} from '../../src/engine';
import type {
  CombatTargetState,
  Direction,
  GameState,
  ProjectilePayload,
  ProjectileState,
  Tile
} from '../../src/engine/types';
import { partyOf, patchChampion, placeAt, tileAt, withItem } from './testkit';

function target(
  id: string,
  x: number,
  y: number,
  lane: 'LEFT' | 'RIGHT',
  health = 40
): CombatTargetState {
  return { id, level: 0, x, y, lane, traits: [], maxHealth: health, health, defeated: false };
}

function equipHand(state: GameState, championIndex: number, itemId: string, name: string): GameState {
  const withDefinition = withItem(state, itemId, name);
  const champion = withDefinition.party.champions[championIndex]!;
  return patchChampion(withDefinition, championIndex, {
    inventory: {
      ...champion.inventory,
      slots: { ...champion.inventory.slots, rightHand: itemId }
    }
  });
}

function openArena(): GameState {
  const initial = createInitialGameState(createCleanRoomBundle());
  const source = initial.levels[0]!.tiles[2]![1]!;
  const levels = initial.levels.map((level) => level.id !== 0 ? level : ({
    ...level,
    tiles: level.tiles.map((row) => row.map((): Tile => ({
      ...source,
      type: 'FLOOR',
      floorItems: { 0: [], 1: [], 2: [], 3: [] },
      wallItems: undefined,
      door: undefined,
      pit: undefined,
      teleporter: undefined,
      trickWall: undefined,
      stairs: undefined,
      wallFeatures: [],
      actuators: []
    })))
  }));
  return placeAt({ ...initial, levels }, 0, 3, 3, 0);
}

function replaceTile(state: GameState, levelId: number, x: number, y: number, tile: Tile): GameState {
  return {
    ...state,
    levels: state.levels.map((level) => level.id !== levelId ? level : ({
      ...level,
      tiles: level.tiles.map((row, rowIndex) => rowIndex !== y ? row :
        row.map((entry, columnIndex) => columnIndex === x ? tile : entry))
    }))
  };
}

function projectile(
  id: string,
  payload: ProjectilePayload,
  overrides: Partial<ProjectileState> = {}
): ProjectileState {
  return {
    id,
    itemId: payload.kind === 'SPELL' ? null : payload.itemId,
    ownerChampionId: 'qa-owner',
    level: 0,
    x: 3,
    y: 3,
    direction: 0,
    lane: 'LEFT',
    power: 12,
    kineticEnergy: 3,
    stepEnergyCost: 1,
    payload,
    ...overrides
  };
}

function execute(state: GameState, championIndex: number, actionId: 'SWING' | 'SHOOT') {
  return dispatchCommand(state, {
    type: 'EXECUTE_COMBAT_ACTION',
    championIndex,
    hand: 'rightHand',
    actionId
  });
}

describe('Sprint 3 Phase 2 independent combat UAT', () => {
  it('keeps every rejected action atomic apart from its explicit feedback message', () => {
    let noTarget = equipHand(partyOf('iaido'), 0, 'qa-sword', 'SWORD');
    noTarget = placeAt(noTarget, 0, 1, 2, 1);
    const invalidTarget = execute(noTarget, 0, 'SWING');
    const champion = noTarget.party.champions[0]!;
    expect(invalidTarget.events).toContainEqual(expect.objectContaining({
      type: 'ACTION_REJECTED', reason: 'INVALID_TARGET'
    }));
    expect(invalidTarget.state.rngState).toBe(noTarget.rngState);
    expect(invalidTarget.state.party).toBe(noTarget.party);
    expect(invalidTarget.state.combatTargets).toBe(noTarget.combatTargets);

    const targetAhead = target('qa-target', 2, 2, 'LEFT');
    const exhausted = patchChampion({ ...noTarget, combatTargets: [targetAhead] }, 0, { stamina: 1 });
    const noStamina = execute(exhausted, 0, 'SWING');
    expect(noStamina.events).toContainEqual(expect.objectContaining({
      type: 'ACTION_REJECTED', reason: 'INSUFFICIENT_STAMINA'
    }));
    expect(noStamina.state.rngState).toBe(exhausted.rngState);
    expect(noStamina.state.party).toBe(exhausted.party);
    expect(noStamina.state.combatTargets).toBe(exhausted.combatTargets);
    expect(noStamina.state.party.champions[0]!.progression).toBe(champion.progression);
  });

  it('commits two draws, costs, cooldown, damage, and XP to the acting front-lane champion once', () => {
    let state = equipHand(partyOf('iaido', 'zed'), 0, 'qa-sword', 'SWORD');
    state = placeAt(state, 0, 1, 2, 1);
    state = { ...state, rngState: 99, combatTargets: [target('left-target', 2, 2, 'LEFT')] };
    const actor = state.party.champions[0]!;
    const bystander = state.party.champions[1]!;
    const result = execute(state, 0, 'SWING');
    const damage = result.events.filter((event) => event.type === 'DAMAGE_APPLIED');

    expect(result.state.rngState).toBe(-631_835_571);
    expect(result.state.party.champions[0]!.stamina).toBe(actor.stamina - 2);
    expect(result.state.party.champions[0]!.actionCooldowns.SWING).toBe(state.tick + 3);
    expect(result.state.party.champions[1]).toBe(bystander);
    expect(damage).toHaveLength(1);
    expect(damage[0]).toMatchObject({ targetId: 'left-target', ownerChampionId: actor.id });
    expect(result.events.filter((event) => event.type === 'SKILL_XP_AWARDED')).toEqual([
      expect.objectContaining({ championId: actor.id, subskill: 0, amount: 8 })
    ]);
  });

  it('enforces formation lane and transfers ranged ammunition ownership exactly once', () => {
    let state = equipHand(partyOf('iaido', 'zed', 'chani'), 1, 'qa-bow', 'BOW');
    state = withItem(state, 'qa-arrow', 'ARROW');
    const rightChampion = state.party.champions[1]!;
    state = patchChampion(state, 1, {
      inventory: {
        ...rightChampion.inventory,
        slots: { ...rightChampion.inventory.slots, rightHand: 'qa-bow', quiver2: 'qa-arrow' }
      }
    });
    state = placeAt(state, 0, 1, 2, 1);
    state = { ...state, rngState: 99, combatTargets: [target('right-target', 2, 2, 'RIGHT')] };
    const shot = execute(state, 1, 'SHOOT');

    expect(shot.state.party.champions[1]!.inventory.slots.quiver2).toBeNull();
    expect(shot.state.projectiles).toHaveLength(1);
    expect(shot.state.projectiles[0]).toMatchObject({
      ownerChampionId: rightChampion.id,
      lane: 'RIGHT',
      payload: { kind: 'AMMUNITION', itemId: 'qa-arrow', actionId: 'SHOOT' }
    });
    const impact = dispatchCommand(shot.state, { type: 'TICK' });
    expect(impact.state.projectiles).toEqual([]);
    expect(impact.events.filter((event) => event.type === 'PROJECTILE_IMPACT')).toHaveLength(1);
    expect(impact.events.filter((event) => event.type === 'SKILL_XP_AWARDED')).toEqual([
      expect.objectContaining({ championId: rightChampion.id, subskill: 4, amount: 10 })
    ]);
    expect(impact.state.items['qa-arrow']).toBeDefined();
  });

  it('keeps passive review targets immobile and non-attacking across ticks', () => {
    const scenario = createSprint3ReviewScenario(createCleanRoomBundle());
    const result = dispatchCommand(scenario, { type: 'TICK', count: 6 });
    expect(result.state.combatTargets).toEqual(scenario.combatTargets);
    expect(result.events.some((event) => event.type === 'DAMAGE_APPLIED')).toBe(false);
  });
});

describe('Sprint 3 Phase 2 independent projectile UAT', () => {
  it('hits only the selected lane for all four facings and emits one impact', () => {
    const deltas = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ] as const;
    for (let facing = 0; facing < 4; facing++) {
      for (const lane of ['LEFT', 'RIGHT'] as const) {
        const delta = deltas[facing]!;
        const state = {
          ...placeAt(openArena(), 0, 3, 3, facing as Direction),
          projectiles: [projectile(`qa-${facing}-${lane}`, {
            kind: 'SPELL', spellId: 'QA', effectId: 'BOLT', explosive: false
          }, { direction: facing as Direction, lane })],
          combatTargets: [
            target('selected', 3 + delta.dx, 3 + delta.dy, lane),
            target('other-lane', 3 + delta.dx, 3 + delta.dy, lane === 'LEFT' ? 'RIGHT' : 'LEFT')
          ]
        };
        const result = dispatchCommand(state, { type: 'TICK' });
        expect(result.state.combatTargets.map((entry) => entry.health)).toEqual([28, 40]);
        expect(result.events.filter((event) => event.type === 'PROJECTILE_IMPACT')).toHaveLength(1);
      }
    }
  });

  it('preserves distinct item, ammunition, and spell ownership/landing semantics', () => {
    for (const [kind, payload, itemId] of [
      ['item', { kind: 'ITEM' as const, itemId: 'qa-item' }, 'qa-item'],
      ['ammunition', { kind: 'AMMUNITION' as const, itemId: 'qa-ammo', actionId: 'SHOOT' }, 'qa-ammo'],
      ['spell', { kind: 'SPELL' as const, spellId: 'QA', effectId: 'BOLT', explosive: false }, null]
    ] as const) {
      let state = openArena();
      if (itemId) state = withItem(state, itemId, itemId === 'qa-ammo' ? 'ARROW' : 'ROCK');
      state = {
        ...state,
        projectiles: [projectile(`qa-${kind}`, payload, { kineticEnergy: 1 })]
      };
      const result = dispatchCommand(state, { type: 'TICK' });
      expect(result.state.projectiles).toEqual([]);
      expect(result.events.filter((event) => event.type === 'PROJECTILE_IMPACT')).toHaveLength(1);
      const landed = Object.values(tileAt(result.state, 0, 3, 2).floorItems ?? {}).flat();
      if (itemId) expect(landed).toContain(itemId);
      else expect(landed).toEqual([]);
    }
  });

  it('stops at walls and closed doors, drops physical items through pits, and teleports survivors', () => {
    const baseFloor = tileAt(openArena(), 0, 3, 2);

    let wallState = withItem(openArena(), 'qa-wall-item', 'ROCK');
    wallState = replaceTile(wallState, 0, 3, 2, { ...baseFloor, type: 'WALL' });
    wallState = { ...wallState, projectiles: [projectile('qa-wall', { kind: 'ITEM', itemId: 'qa-wall-item' })] };
    const wall = dispatchCommand(wallState, { type: 'TICK' });
    expect(wall.state.projectiles).toEqual([]);
    expect(Object.values(tileAt(wall.state, 0, 3, 3).floorItems ?? {}).flat()).toContain('qa-wall-item');

    let doorState = withItem(openArena(), 'qa-door-item', 'ROCK');
    doorState = replaceTile(doorState, 0, 3, 2, {
      ...baseFloor,
      type: 'DOOR',
      door: {
        orientation: 'WEST_EAST', material: 'WOODEN', progress: 4, targetProgress: 4,
        hasButton: false, bashable: true, fireballDestructible: true
      }
    });
    doorState = { ...doorState, projectiles: [projectile('qa-door', { kind: 'ITEM', itemId: 'qa-door-item' })] };
    const door = dispatchCommand(doorState, { type: 'TICK' });
    expect(Object.values(tileAt(door.state, 0, 3, 3).floorItems ?? {}).flat()).toContain('qa-door-item');

    let pitState = withItem(openArena(), 'qa-pit-item', 'ROCK');
    pitState = replaceTile(pitState, 0, 3, 2, {
      ...baseFloor,
      type: 'PIT',
      pit: { open: true, illusionary: false, hiddenOutline: false }
    });
    pitState = { ...pitState, projectiles: [projectile('qa-pit', { kind: 'ITEM', itemId: 'qa-pit-item' })] };
    const pit = dispatchCommand(pitState, { type: 'TICK' });
    expect(pit.state.projectiles).toEqual([]);
    expect(Object.values(tileAt(pit.state, 1, 3, 2).floorItems ?? {}).flat()).toContain('qa-pit-item');

    let teleporterState = openArena();
    teleporterState = replaceTile(teleporterState, 0, 3, 2, {
      ...baseFloor,
      type: 'TELEPORTER',
      teleporter: {
        active: true, visibleHaze: true, destLevel: 0, destX: 5, destY: 5,
        rotation: 2, absoluteRotation: true, scope: 'ALL', playSound: false
      }
    });
    teleporterState = {
      ...teleporterState,
      projectiles: [projectile('qa-teleport', {
        kind: 'SPELL', spellId: 'QA', effectId: 'BOLT', explosive: false
      })]
    };
    const teleported = dispatchCommand(teleporterState, { type: 'TICK' });
    expect(teleported.state.projectiles).toEqual([
      expect.objectContaining({ id: 'qa-teleport', level: 0, x: 5, y: 5, direction: 2, kineticEnergy: 2 })
    ]);
  });

  it('damages each unique explosion target id no more than once', () => {
    const state = {
      ...openArena(),
      projectiles: [projectile('qa-blast', {
        kind: 'SPELL', spellId: 'QA', effectId: 'BLAST', explosive: true
      })],
      combatTargets: [
        target('duplicate', 3, 2, 'LEFT'),
        target('duplicate', 3, 2, 'LEFT'),
        target('adjacent', 4, 2, 'RIGHT')
      ]
    };
    const result = dispatchCommand(state, { type: 'TICK' });
    const damageIds = result.events
      .filter((event) => event.type === 'DAMAGE_APPLIED')
      .map((event) => event.targetId);
    const explosion = result.events.find((event) => event.type === 'EXPLOSION_RESOLVED');

    expect(damageIds).toEqual(['duplicate', 'adjacent']);
    expect(explosion).toEqual(expect.objectContaining({ targetIds: ['duplicate', 'adjacent'] }));
  });
});
