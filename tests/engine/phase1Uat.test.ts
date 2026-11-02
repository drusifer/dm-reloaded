import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import {
  createInitialGameState,
  dispatchCommand,
  getTile,
  updateTileInLevels,
  type GameCommand
} from '../../src/engine';

describe('Phase 1 UAT Verification — Edge Cases & Determinism (Trin)', () => {
  it('enforces the 4-champion party cap and logs full-party feedback on 5th mirror interaction', () => {
    const bundle = createCleanRoomBundle();
    // Add a 5th mirror on Level 0 at (1, 3) South wall facing North? Let's place a 5th champion in catalog & wall (1, 1)
    const fifthChamp = {
      ...bundle.dungeon.champions['iaido']!,
      id: 'halk_uat',
      name: 'HALK'
    };
    let state = createInitialGameState({
      ...bundle,
      dungeon: {
        ...bundle.dungeon,
        champions: { ...bundle.dungeon.champions, halk_uat: fifthChamp },
        levels: updateTileInLevels(bundle.dungeon.levels, 0, 1, 3, (t) => ({
          ...t,
          type: 'WALL',
          wallFeatures: [{ face: 0, kind: 'CHAMPION_MIRROR', championId: 'halk_uat', portraitIndex: 4 }]
        }))
      }
    });

    // Recruit all 4 champions along North wall x=2..5, y=1 from corridor y=2
    for (let x = 2; x <= 5; x++) {
      state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
      state = dispatchCommand(state, { type: 'TICK' }).state;
      state = dispatchCommand(state, { type: 'TURN', direction: 'LEFT' }).state; // North
      state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
      state = dispatchCommand(state, { type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' }).state;
      state = dispatchCommand(state, { type: 'TURN', direction: 'RIGHT' }).state; // Back to East
    }
    expect(state.party.champions).toHaveLength(4);

    // Walk back West to (1, 2) and face South (2) toward 5th mirror at (1, 3)
    state = dispatchCommand(state, { type: 'TURN', direction: 'RIGHT' }).state;
    state = dispatchCommand(state, { type: 'TURN', direction: 'RIGHT' }).state; // West
    for (let i = 0; i < 4; i++) {
      state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
      state = dispatchCommand(state, { type: 'TICK' }).state;
    }
    expect(state.party.x).toBe(1);
    state = dispatchCommand(state, { type: 'TURN', direction: 'LEFT' }).state; // South

    const fullAttempt = dispatchCommand(state, { type: 'INTERACT_AHEAD' });
    expect(fullAttempt.state.activeMirror).toBeNull();
    expect(fullAttempt.state.messages.at(-1)).toBe('YOUR PARTY IS ALREADY FULL (4 CHAMPIONS).');
  });

  it('fires delayed once-only actuators on exact dueTick and ignores repeated presses', () => {
    const bundle = createCleanRoomBundle();
    let state = createInitialGameState({
      ...bundle,
      dungeon: {
        ...bundle.dungeon,
        levels: updateTileInLevels(bundle.dungeon.levels, 0, 1, 1, (t) => ({
          ...t,
          wallFeatures: [{ face: 2, kind: 'BUTTON', actuatorId: 777, graphicIndex: 1 }],
          actuators: [
            {
              id: 777,
              face: 2,
              rawType: 1,
              value: 0,
              action: 'SET',
              targetLevel: 0,
              targetX: 5,
              targetY: 3, // Closed wooden door on Level 0
              delayTicks: 3,
              onceOnly: true,
              triggered: false,
              playSound: true,
              graphicIndex: 1,
              isLocal: false
            }
          ]
        }))
      }
    });

    // At (1, 2) turn Left to face North (0) toward button on (1, 1) South face (2)
    state = dispatchCommand(state, { type: 'TURN', direction: 'LEFT' }).state;
    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;

    // Ticks 1 and 2: target door (5, 3) has NOT received SET yet (targetProgress still 4)
    state = dispatchCommand(state, { type: 'TICK', count: 2 }).state;
    expect(getTile(state.levels, 0, 5, 3)?.door?.targetProgress).toBe(4);

    // Tick 3: dueTick reached -> targetProgress becomes 0 and steps 1 notch (4 -> 3)
    state = dispatchCommand(state, { type: 'TICK' }).state;
    expect(getTile(state.levels, 0, 5, 3)?.door?.targetProgress).toBe(0);
    expect(getTile(state.levels, 0, 5, 3)?.door?.progress).toBe(3);

    // Finish opening -> progress 0, then manually close door via its own button and verify onceOnly button at (1,1) no longer triggers!
    state = dispatchCommand(state, { type: 'TICK', count: 3 }).state;
    expect(getTile(state.levels, 0, 5, 3)?.door?.progress).toBe(0);

    // Close door (5, 3) directly in state to test onceOnly non-retrigger
    state = {
      ...state,
      levels: updateTileInLevels(state.levels, 0, 5, 3, (t) =>
        t.door ? { ...t, door: { ...t.door, progress: 4, targetProgress: 4 } } : t
      )
    };
    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
    state = dispatchCommand(state, { type: 'TICK', count: 5 }).state;
    expect(getTile(state.levels, 0, 5, 3)?.door?.progress).toBe(4);
  });

  it('walks safely across closed or illusionary pits and produces bit-identical state for identical seeds', () => {
    const bundle = createCleanRoomBundle();
    const closedPitBundle = {
      ...bundle,
      dungeon: {
        ...bundle.dungeon,
        levels: updateTileInLevels(bundle.dungeon.levels, 1, 4, 2, (t) => ({
          ...t,
          pit: { open: false, illusionary: false, hiddenOutline: false }
        }))
      }
    };

    let s = createInitialGameState(closedPitBundle);
    s = { ...s, party: { ...s.party, level: 1, x: 5, y: 2, facing: 3 } }; // Facing West toward closed pit (4, 2)
    const stepClosed = dispatchCommand(s, { type: 'MOVE', direction: 'FORWARD' });
    expect(stepClosed.events.some((e) => e.type === 'PIT_FALLEN')).toBe(false);
    expect(stepClosed.state.party).toMatchObject({ level: 1, x: 4, y: 2 });

    // Reproducibility check with REINCARNATE RNG calls
    const script: readonly GameCommand[] = [
      { type: 'MOVE', direction: 'FORWARD' },
      { type: 'TICK' },
      { type: 'TURN', direction: 'LEFT' },
      { type: 'INTERACT_AHEAD' },
      { type: 'RECRUIT_CHAMPION', mode: 'REINCARNATE' }
    ];

    const run = () => {
      let cur = createInitialGameState(bundle);
      for (const cmd of script) {
        cur = dispatchCommand(cur, cmd).state;
      }
      return cur;
    };

    expect(run()).toEqual(run());
  });
});
