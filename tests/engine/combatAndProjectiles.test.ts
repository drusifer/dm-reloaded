import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import { createInitialGameState, dispatchCommand, nextRandom } from '../../src/engine';
import type { CombatTargetState, Direction, GameState, ProjectileState } from '../../src/engine/types';
import { hold, partyOf, patchChampion, placeAt, run, withItem } from './testkit';

function target(
  id: string,
  x: number,
  y: number,
  lane: 'LEFT' | 'RIGHT',
  health = 100
): CombatTargetState {
  return {
    id,
    level: 0,
    x,
    y,
    lane,
    traits: [],
    maxHealth: health,
    health,
    defeated: false
  };
}

function withRightHand(state: GameState, championIndex: number, id: string, name: string): GameState {
  const itemState = withItem(state, id, name);
  const champion = itemState.party.champions[championIndex]!;
  return patchChampion(itemState, championIndex, {
    inventory: {
      ...champion.inventory,
      slots: { ...champion.inventory.slots, rightHand: id }
    }
  });
}

describe('Sprint 3 Phase 2 combat transactions', () => {
  it('rejects a back-rank melee action without costs, cooldown, RNG, damage, or XP', () => {
    let state = partyOf('iaido', 'zed', 'chani');
    state = withRightHand(state, 2, 'blade', 'SWORD');
    state = placeAt(state, 0, 1, 2, 1);
    state = { ...state, combatTargets: [target('dummy', 2, 2, 'LEFT')] };
    const before = state;

    const result = dispatchCommand(state, {
      type: 'EXECUTE_COMBAT_ACTION',
      championIndex: 2,
      hand: 'rightHand',
      actionId: 'SWING'
    });

    expect(result.state.party).toBe(before.party);
    expect(result.state.combatTargets).toBe(before.combatTargets);
    expect(result.state.rngState).toBe(before.rngState);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'ACTION_REJECTED', reason: 'OUT_OF_REACH' }));
    expect(result.events.some((event) => event.type === 'SKILL_XP_AWARDED')).toBe(false);
  });

  it('commits melee stamina, cooldown, two RNG draws, damage, and successful-effect XP once', () => {
    let state = partyOf('iaido');
    state = withRightHand(state, 0, 'blade', 'SWORD');
    state = placeAt(state, 0, 1, 2, 1);
    state = { ...state, rngState: 99, combatTargets: [target('dummy', 2, 2, 'LEFT')] };
    const champion = state.party.champions[0]!;
    const afterOne = nextRandom(state.rngState);
    const afterTwo = nextRandom(afterOne.nextState);

    const result = dispatchCommand(state, {
      type: 'EXECUTE_COMBAT_ACTION',
      championIndex: 0,
      hand: 'rightHand',
      actionId: 'SWING'
    });

    expect(result.state.rngState).toBe(afterTwo.nextState);
    expect(result.state.party.champions[0]!.stamina).toBe(champion.stamina - 2);
    expect(result.state.party.champions[0]!.actionCooldowns.SWING).toBeGreaterThan(state.tick);
    expect(result.state.combatTargets[0]!.health).toBeLessThan(100);
    expect(result.events.filter((event) => event.type === 'DAMAGE_APPLIED')).toHaveLength(1);
    expect(result.events.filter((event) => event.type === 'SKILL_XP_AWARDED')).toHaveLength(1);

    const rejected = dispatchCommand(result.state, {
      type: 'EXECUTE_COMBAT_ACTION',
      championIndex: 0,
      hand: 'rightHand',
      actionId: 'SWING'
    });
    expect(rejected.state.party).toBe(result.state.party);
    expect(rejected.state.combatTargets).toBe(result.state.combatTargets);
    expect(rejected.state.rngState).toBe(result.state.rngState);
    expect(rejected.events).toContainEqual(expect.objectContaining({ type: 'ACTION_REJECTED', reason: 'COOLDOWN' }));
  });

  it('atomically consumes quiver ammunition and launches an owned ranged projectile', () => {
    let state = partyOf('iaido');
    state = withRightHand(state, 0, 'bow', 'BOW');
    state = withItem(state, 'arrow', 'ARROW');
    const champion = state.party.champions[0]!;
    state = patchChampion(state, 0, {
      inventory: {
        ...champion.inventory,
        slots: { ...champion.inventory.slots, rightHand: 'bow', quiver1: 'arrow' }
      }
    });
    state = placeAt(state, 0, 1, 2, 1);
    state = { ...state, rngState: 99, combatTargets: [target('dummy', 2, 2, 'LEFT')] };

    const fired = dispatchCommand(state, {
      type: 'EXECUTE_COMBAT_ACTION',
      championIndex: 0,
      hand: 'rightHand',
      actionId: 'SHOOT'
    });
    expect(fired.state.party.champions[0]!.inventory.slots.quiver1).toBeNull();
    expect(fired.state.projectiles).toHaveLength(1);
    expect(fired.state.projectiles[0]).toMatchObject({
      ownerChampionId: 'iaido',
      itemId: 'arrow',
      payload: { kind: 'AMMUNITION', itemId: 'arrow', actionId: 'SHOOT' }
    });

    const impact = dispatchCommand(fired.state, { type: 'TICK' });
    expect(impact.state.projectiles).toHaveLength(0);
    expect(impact.state.combatTargets[0]!.health).toBeLessThan(100);
    expect(impact.events.filter((event) => event.type === 'PROJECTILE_IMPACT')).toHaveLength(1);
    expect(impact.events.filter((event) => event.type === 'DAMAGE_APPLIED')).toHaveLength(1);
  });

  it('rejects missing ammunition before RNG, stamina, cooldown, or ownership changes', () => {
    let state = withRightHand(partyOf('iaido'), 0, 'bow', 'BOW');
    state = placeAt(state, 0, 1, 2, 1);
    state = { ...state, combatTargets: [target('dummy', 2, 2, 'LEFT')] };
    const champion = state.party.champions[0]!;
    const result = dispatchCommand(state, {
      type: 'EXECUTE_COMBAT_ACTION',
      championIndex: 0,
      hand: 'rightHand',
      actionId: 'SHOOT'
    });

    expect(result.state.rngState).toBe(state.rngState);
    expect(result.state.party.champions[0]!.stamina).toBe(champion.stamina);
    expect(result.state.party.champions[0]!.actionCooldowns).toEqual(champion.actionCooldowns);
    expect(result.state.party.champions[0]!.inventory).toBe(champion.inventory);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'ACTION_REJECTED',
      reason: 'MISSING_AMMUNITION'
    }));
  });
});

describe('Sprint 3 Phase 2 generalized projectiles', () => {
  it('preserves free item throws as typed item payloads and inventory-owned landing', () => {
    let state = withItem(partyOf('iaido'), 'rock', 'ROCK');
    state = hold(placeAt(state, 0, 1, 2, 1), 'rock');
    const launched = run(state, { type: 'THROW_HAND_ITEM', side: 'RIGHT' }).state;
    expect(launched.projectiles[0]).toMatchObject({
      itemId: 'rock',
      ownerChampionId: 'iaido',
      payload: { kind: 'ITEM', itemId: 'rock' }
    });
    let landed = launched;
    while (landed.projectiles.length) landed = run(landed, { type: 'TICK' }).state;
    expect(landed.items.rock).toBeDefined();
  });

  it('hits the correct lane from all four facings without duplicate impact', () => {
    const deltas = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ] as const;
    for (let direction = 0; direction < 4; direction++) {
      for (const lane of ['LEFT', 'RIGHT'] as const) {
        const base = placeAt(createInitialGameState(createCleanRoomBundle()), 0, 3, 3, direction as Direction);
        const projectile: ProjectileState = {
          id: `spell-${direction}-${lane}`,
          itemId: null,
          ownerChampionId: 'caster',
          level: 0,
          x: 3,
          y: 3,
          direction: direction as Direction,
          lane,
          power: 9,
          kineticEnergy: 3,
          stepEnergyCost: 1,
          payload: { kind: 'SPELL', spellId: 'TEST', effectId: 'BOLT', explosive: false }
        };
        const d = deltas[direction]!;
        const matching = target('matching', 3 + d.dx, 3 + d.dy, lane, 30);
        const other = target('other', 3 + d.dx, 3 + d.dy, lane === 'LEFT' ? 'RIGHT' : 'LEFT', 30);
        const openLevels = base.levels.map((level) => level.id !== 0 ? level : {
          ...level,
          tiles: level.tiles.map((row, rowIndex) => rowIndex !== 3 + d.dy ? row : row.map((tile, columnIndex) =>
            columnIndex === 3 + d.dx ? { ...tile, type: 'FLOOR' as const } : tile
          ))
        });
        const state = { ...base, levels: openLevels, projectiles: [projectile], combatTargets: [matching, other] };
        const result = dispatchCommand(state, { type: 'TICK' });
        expect(result.state.combatTargets[0]!.health).toBeLessThan(30);
        expect(result.state.combatTargets[1]!.health).toBe(30);
        expect(result.events.filter((event) => event.type === 'PROJECTILE_IMPACT')).toHaveLength(1);
      }
    }
  });

  it('applies an explosive spell to each unique center/adjacent target once', () => {
    const base = createInitialGameState(createCleanRoomBundle());
    const projectile: ProjectileState = {
      id: 'blast',
      itemId: null,
      ownerChampionId: 'caster',
      level: 0,
      x: 1,
      y: 2,
      direction: 1,
      lane: 'LEFT',
      power: 12,
      kineticEnergy: 3,
      stepEnergyCost: 1,
      payload: { kind: 'SPELL', spellId: 'TEST', effectId: 'BLAST', explosive: true }
    };
    const state = {
      ...base,
      projectiles: [projectile],
      combatTargets: [
        target('center', 2, 2, 'LEFT', 40),
        target('center', 2, 2, 'LEFT', 40),
        target('adjacent', 3, 2, 'RIGHT', 40),
        target('outside', 5, 5, 'LEFT', 40)
      ]
    };
    const result = dispatchCommand(state, { type: 'TICK' });
    expect(result.state.combatTargets.map((entry) => entry.health)).toEqual([28, 40, 34, 40]);
    expect(result.events.filter((event) => event.type === 'DAMAGE_APPLIED')).toHaveLength(2);
    expect(result.events.filter((event) => event.type === 'EXPLOSION_RESOLVED')).toEqual([
      expect.objectContaining({ targetIds: ['center', 'adjacent'] })
    ]);
  });
});
