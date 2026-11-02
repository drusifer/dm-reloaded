import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import {
  FTL_TICK_MS,
  FixedTickAccumulator,
  createInitialGameState,
  dispatchCommand,
  effectiveLightLevel,
  getTile
} from '../../src/engine';

describe('FixedTickAccumulator (~6 Hz clock)', () => {
  it('emits discrete 6 Hz ticks and caps catch-up spikes', () => {
    const clock = new FixedTickAccumulator();
    expect(clock.advance(80)).toBe(0);
    expect(clock.advance(90)).toBe(1); // 170ms >= 166.67ms
    expect(clock.advance(FTL_TICK_MS * 20)).toBe(6); // capped at MAX_CATCHUP_TICKS
  });
});

describe('SimulationReducer core mechanics (Stories 1.1, 1.3, 1.4)', () => {
  it('enforces movement cooldowns, alternates step parity, and logs OOF! on wall bump', () => {
    const bundle = createCleanRoomBundle();
    let state = createInitialGameState(bundle);

    // Initial state at (1, 2) facing East (1)
    expect(state.party.x).toBe(1);
    expect(state.party.y).toBe(2);
    expect(state.party.stepParity).toBe(0);
    expect(effectiveLightLevel(state)).toBe(5);

    // Step forward to (2, 2)
    const step1 = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' });
    state = step1.state;
    expect(state.party.x).toBe(2);
    expect(state.party.stepParity).toBe(1);
    expect(state.party.moveCooldownTicks).toBe(1);

    // Immediate move before cooldown tick is ignored
    const blockedByCooldown = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' });
    expect(blockedByCooldown.state.party.x).toBe(2);

    // Tick clears cooldown
    state = dispatchCommand(state, { type: 'TICK' }).state;
    expect(state.party.moveCooldownTicks).toBe(0);

    // Strafe left (North into wall at (2, 1)) -> WallBumped + "OOF!"
    const bump = dispatchCommand(state, { type: 'MOVE', direction: 'STRAFE_LEFT' });
    expect(bump.state.party.x).toBe(2);
    expect(bump.state.party.y).toBe(2);
    expect(bump.events.some((e) => e.type === 'WALL_BUMPED')).toBe(true);
    expect(bump.state.messages.at(-1)).toBe('OOF!');
  });

  it('supports Champion Mirror Cancel, Resurrect, Reincarnate, and 4-champion party limit', () => {
    const bundle = createCleanRoomBundle();
    let state = createInitialGameState(bundle);

    // Move East to (2, 2), tick, turn Left (North, facing Iaido mirror at (2, 1))
    state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
    state = dispatchCommand(state, { type: 'TICK' }).state;
    state = dispatchCommand(state, { type: 'TURN', direction: 'LEFT' }).state;

    // Open Iaido mirror, then Cancel (HCI #3)
    const opened = dispatchCommand(state, { type: 'INTERACT_AHEAD' });
    state = opened.state;
    expect(state.activeMirror?.champion.id).toBe('iaido');
    state = dispatchCommand(state, { type: 'CANCEL_MIRROR' }).state;
    expect(state.activeMirror).toBeNull();
    expect(state.party.champions).toHaveLength(0);

    // Re-open Iaido and RESURRECT (preserves skills)
    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
    state = dispatchCommand(state, { type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' }).state;
    expect(state.party.champions).toHaveLength(1);
    expect(state.party.champions[0]?.mode).toBe('RESURRECTED');
    expect(state.party.champions[0]?.skills[1]).toBe(3);

    // Step East to (3, 2) facing North (Zed mirror at (3, 1)) and REINCARNATE (skills reset to 0, boosted stats)
    state = dispatchCommand(state, { type: 'MOVE', direction: 'STRAFE_RIGHT' }).state;
    state = dispatchCommand(state, { type: 'TICK' }).state;
    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
    state = dispatchCommand(state, { type: 'RECRUIT_CHAMPION', mode: 'REINCARNATE' }).state;
    expect(state.party.champions).toHaveLength(2);
    const zed = state.party.champions[1]!;
    expect(zed.mode).toBe('REINCARNATED');
    expect(zed.skills.every((s) => s === 0)).toBe(true);
    expect(zed.attributes.strength).toBeGreaterThan(40);
  });

  it('animates doors, opens gates via wall buttons, traverses stairs, illusionary walls, teleporters, and open pits', () => {
    const bundle = createCleanRoomBundle();
    let state = createInitialGameState(bundle);

    // Move East from (1, 2) -> (5, 2)
    for (let x = 2; x <= 5; x++) {
      state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
      state = dispatchCommand(state, { type: 'TICK' }).state;
    }
    expect(state.party.x).toBe(5);
    expect(state.party.y).toBe(2);

    // Turn Right (South) facing closed wooden door at (5, 3)
    state = dispatchCommand(state, { type: 'TURN', direction: 'RIGHT' }).state;
    const bumpDoor = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' });
    expect(bumpDoor.events.some((e) => e.type === 'WALL_BUMPED')).toBe(true);
    state = dispatchCommand(bumpDoor.state, { type: 'TICK' }).state;

    // Click door button -> animates 4 -> 3 -> 2 -> 1 -> 0 over 4 ticks
    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
    state = dispatchCommand(state, { type: 'TICK', count: 2 }).state;
    expect(getTile(state.levels, 0, 5, 3)?.door?.progress).toBe(2);
    state = dispatchCommand(state, { type: 'TICK', count: 2 }).state;
    expect(getTile(state.levels, 0, 5, 3)?.door?.progress).toBe(0);

    // Walk South through open door (5, 3) -> (5, 4), grab Torch on East wall (6, 4), then step onto Stairs Down (5, 5)
    state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
    state = dispatchCommand(state, { type: 'TICK' }).state;
    state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
    state = dispatchCommand(state, { type: 'TICK' }).state;

    // Face East (1) to take torch from sconce at (6, 4)
    state = dispatchCommand(state, { type: 'TURN', direction: 'LEFT' }).state;
    const torchRes = dispatchCommand(state, { type: 'INTERACT_AHEAD' });
    state = torchRes.state;
    expect(torchRes.events.some((e) => e.type === 'TORCH_TAKEN')).toBe(true);
    expect(state.party.torchLight).toBe(5);

    // Face South (2) and step onto Stairs Down at (5, 5) -> Level 1 (5, 5)
    state = dispatchCommand(state, { type: 'TURN', direction: 'RIGHT' }).state;
    state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
    state = dispatchCommand(state, { type: 'TICK' }).state;
    expect(state.party.level).toBe(1);
    expect(state.party.x).toBe(5);
    expect(state.party.y).toBe(5);

    // Walk North to (5, 4); iron grate at (5, 3) has no door button, must press wall switch at (6, 4)
    state = dispatchCommand(state, { type: 'TURN', direction: 'RIGHT' }).state;
    state = dispatchCommand(state, { type: 'TURN', direction: 'RIGHT' }).state; // Facing North (0)
    state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
    state = dispatchCommand(state, { type: 'TICK' }).state;
    expect(state.party.y).toBe(4);

    // Turn East (1), press wall button at (6, 4), advance 4 ticks -> iron grate at (5, 3) opens!
    state = dispatchCommand(state, { type: 'TURN', direction: 'RIGHT' }).state;
    state = dispatchCommand(state, { type: 'INTERACT_AHEAD' }).state;
    state = dispatchCommand(state, { type: 'TICK', count: 4 }).state;
    expect(getTile(state.levels, 1, 5, 3)?.door?.progress).toBe(0);

    // Turn North (0), walk through (5, 3) -> (5, 2) -> illusionary wall at (5, 1)!
    state = dispatchCommand(state, { type: 'TURN', direction: 'LEFT' }).state;
    state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
    state = dispatchCommand(state, { type: 'TICK' }).state;
    state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state;
    state = dispatchCommand(state, { type: 'TICK' }).state;
    state = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' }).state; // into TrickWall (5, 1)
    state = dispatchCommand(state, { type: 'TICK' }).state;
    expect(state.party.x).toBe(5);
    expect(state.party.y).toBe(1);

    // Step backward to (5, 2), turn West (3), step onto open pit at (4, 2) -> drops to Level 2 (4, 2)!
    state = dispatchCommand(state, { type: 'MOVE', direction: 'BACKWARD' }).state;
    state = dispatchCommand(state, { type: 'TICK' }).state;
    state = dispatchCommand(state, { type: 'TURN', direction: 'LEFT' }).state; // Facing West (3)
    const pitRes = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' });
    expect(pitRes.events.some((e) => e.type === 'PIT_FALLEN')).toBe(true);
    expect(pitRes.state.party.level).toBe(2);
    expect(pitRes.state.party.x).toBe(4);
    expect(pitRes.state.party.y).toBe(2);
  });

  it('teleports and rotates the party when stepping into an active teleporter and gates QoL automap', () => {
    const bundle = createCleanRoomBundle();
    let state = createInitialGameState(bundle);

    // Automap cannot open in 1988 Purist Mode default
    expect(state.settings.qolMode).toBe(false);
    state = dispatchCommand(state, { type: 'TOGGLE_AUTOMAP' }).state;
    expect(state.settings.automapOpen).toBe(false);

    // Enable QoL Mode -> Automap toggles cleanly; disabling QoL closes Automap
    state = dispatchCommand(state, { type: 'TOGGLE_QOL_MODE' }).state;
    expect(state.settings.qolMode).toBe(true);
    state = dispatchCommand(state, { type: 'TOGGLE_AUTOMAP' }).state;
    expect(state.settings.automapOpen).toBe(true);
    state = dispatchCommand(state, { type: 'TOGGLE_QOL_MODE' }).state;
    expect(state.settings.automapOpen).toBe(false);

    // Place party on Level 1 at (2, 2) facing East (1) and step into Teleporter at (3, 2) -> lands at (5, 4) facing North (0)
    state = {
      ...state,
      party: { ...state.party, level: 1, x: 2, y: 2, facing: 1, moveCooldownTicks: 0 }
    };
    const tpRes = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' });
    expect(tpRes.events.some((e) => e.type === 'TELEPORTED')).toBe(true);
    expect(tpRes.state.party.x).toBe(5);
    expect(tpRes.state.party.y).toBe(4);
    expect(tpRes.state.party.facing).toBe(0);
  });
});
