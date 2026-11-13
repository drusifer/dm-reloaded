import { describe, expect, it } from 'vitest';
import { dispatchCommand } from '../../src/engine';
import {
  DIRECTION_DELTAS,
  type Direction,
  type GameCommand,
  type GameState,
  type ProjectileState
} from '../../src/engine/types';
import { projectileMarkerRect } from '../../src/render';
import { partyOf, placeAt } from './testkit';

function withInteraction(state: GameState): GameState {
  return {
    ...state,
    interaction: { kind: 'PROGRESSION_VIEW', championIndex: 0 }
  };
}

describe('Sprint 3 final stabilization independent UAT', () => {
  it('preserves exact identity and focus for every inventory-domain no-op branch', () => {
    const base = withInteraction(partyOf('zed'));
    const emptyFloor = placeAt(base, 0, 2, 2, base.party.facing);
    const wall = placeAt(base, 0, 0, 0, base.party.facing);
    const cases: readonly (readonly [GameState, GameCommand])[] = [
      [base, { type: 'TOGGLE_INVENTORY', championIndex: 9 }],
      [base, { type: 'SELECT_LEADER', championIndex: 9 }],
      [base, { type: 'CLICK_EQUIP_SLOT', championIndex: 9, slot: 'head' }],
      [base, { type: 'CLICK_EQUIP_SLOT', championIndex: 0, slot: 'neck' }],
      [base, { type: 'CLICK_BACKPACK_SLOT', championIndex: 0, slotIndex: 99 }],
      [base, { type: 'CLICK_CONTAINER_SLOT', slotIndex: 0 }],
      [base, { type: 'INSPECT_HAND_ITEM', championIndex: 0 }],
      [base, { type: 'CONSUME_HAND_ITEM', championIndex: 0 }],
      [emptyFloor, { type: 'PICKUP_OR_DROP_FLOOR', quadrant: 0 }],
      [wall, { type: 'PICKUP_OR_DROP_FLOOR', quadrant: 0 }]
    ];

    for (const [state, command] of cases) {
      const result = dispatchCommand(state, command);
      expect(result.state, command.type).toBe(state);
      expect(result.state.interaction, command.type).toBe(state.interaction);
      expect(result.events, command.type).toEqual([]);
    }
  });

  it('clears focus only after an accepted inventory transition', () => {
    const base = withInteraction(partyOf('zed'));
    const opened = dispatchCommand(base, { type: 'TOGGLE_INVENTORY', championIndex: 0 });
    expect(opened.state).not.toBe(base);
    expect(opened.state.openInventoryChampionIndex).toBe(0);
    expect(opened.state.interaction).toEqual({ kind: 'NONE' });
  });

  it('projects travel-relative lanes to the correct viewer side for the full facing matrix', () => {
    const seed = partyOf('zed');
    const expectedSize = { 1: 13, 3: 6 } as const;

    for (const facing of [0, 1, 2, 3] as const) {
      const state = placeAt(seed, 0, 3, 3, facing);
      const forward = DIRECTION_DELTAS[facing];
      for (const depth of [1, 3] as const) {
        for (const travel of ['RECEDING', 'APPROACHING'] as const) {
          const direction = (travel === 'APPROACHING' ? (facing + 2) & 3 : facing) as Direction;
          for (const lane of ['LEFT', 'RIGHT'] as const) {
            const projectile: ProjectileState = {
              id: `qa-${facing}-${depth}-${travel}-${lane}`,
              itemId: 'cr_dagger_1',
              ownerChampionId: 'zed',
              level: 0,
              x: state.party.x + forward.dx * depth,
              y: state.party.y + forward.dy * depth,
              direction,
              lane,
              power: 10,
              kineticEnergy: 10,
              stepEnergyCost: 1,
              payload: { kind: 'ITEM', itemId: 'cr_dagger_1' }
            };
            const before = structuredClone(projectile);
            const marker = projectileMarkerRect(state, projectile);

            expect(projectile).toEqual(before);
            expect(marker).not.toBeNull();
            expect(marker).toMatchObject({ w: expectedSize[depth], h: expectedSize[depth] });
            const centerX = marker!.x + marker!.w / 2;
            const expectedViewerLeft = travel === 'APPROACHING'
              ? lane === 'RIGHT'
              : lane === 'LEFT';
            expect(centerX === 112).toBe(false);
            expect(expectedViewerLeft ? centerX < 112 : centerX > 112).toBe(true);
          }
        }
      }
    }
  });
});
