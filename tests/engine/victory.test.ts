import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle, createCleanRoomGraphicsBundle } from '../../src/data';
import {
  createInitialGameState, createVictoryReviewScenario, deserializeSave, dispatchCommand, serializeSave
} from '../../src/engine';
import { damageTarget } from '../../src/engine/combat';
import { resolveKeyboardCommand, resolvePointerHitCommand } from '../../src/input';
import { Framebuffer, renderFrame } from '../../src/render';
import type { EngineEvent, GameState } from '../../src/engine/types';
import { partyOf, tick } from './testkit';

function won(): { state: GameState; events: EngineEvent[] } {
  const state = createVictoryReviewScenario(partyOf('iaido', 'zed'));
  const killed = damageTarget(state, 'rv_chaos_0', 99, 'iaido', []);
  const r = tick(killed);
  return { state: r.state, events: [...r.events] };
}

describe('S5-3 victory ending', () => {
  it('Lord Chaos defeat sets victory exactly once with a logged ending', () => {
    const { state, events } = won();
    expect(state.victory).toBe(true);
    expect(state.gameOver).toBe(false);
    expect(events.filter((e) => e.type === 'VICTORY')).toHaveLength(1);
    expect(state.messages.some((m) => /VICTORY/.test(m))).toBe(true);
    const later = tick(state, 30);
    expect(later.events.filter((e) => e.type === 'VICTORY')).toHaveLength(0);
  });

  it('other kills and crushed Lord Chaos do not win', () => {
    let state = createVictoryReviewScenario(partyOf('iaido'));
    state = { ...state, combatTargets: state.combatTargets.map((t) => ({ ...t, monster: { ...t.monster!, typeId: 6 } })) };
    const r = tick(damageTarget(state, 'rv_chaos_0', 99, 'iaido', []));
    expect(r.state.victory).toBe(false);
  });

  it('halts monsters and ignores commands except time after victory', () => {
    const { state } = won();
    const screamer = createVictoryReviewScenario(partyOf('iaido')).combatTargets[0]!;
    const hunter = {
      ...screamer, id: 'late', x: 4, health: 55, maxHealth: 55,
      monster: { ...screamer.monster!, typeId: 6, awake: true }
    };
    const frozen = { ...state, combatTargets: [hunter] };
    const after = tick(frozen, 60).state;
    expect(after.combatTargets[0]!.x).toBe(4);
    const moved = dispatchCommand(state, { type: 'MOVE', direction: 'FORWARD' });
    expect(moved.state).toBe(state);
    expect(resolveKeyboardCommand('w', { ...state, settings: { ...state.settings, qolMode: true } })).toBeNull();
    expect(resolvePointerHitCommand(150, 100, state)).toBeNull();
  });

  it('survives a save/load round trip', () => {
    const { state } = won();
    const loaded = deserializeSave(serializeSave(state), state.campaignId);
    expect(loaded.ok && loaded.state.victory).toBe(true);
  });

  it('renders a distinct victory screen, not game over, and fresh games start unwon', () => {
    const { state } = won();
    const victory = new Framebuffer();
    const over = new Framebuffer();
    const graphics = createCleanRoomGraphicsBundle();
    renderFrame(victory, state, { graphics });
    renderFrame(over, { ...state, victory: false, gameOver: true }, { graphics });
    expect(Buffer.compare(Buffer.from(victory.rgba), Buffer.from(over.rgba))).not.toBe(0);
    const gold = (fb: Framebuffer): number => {
      let n = 0;
      for (let y = 40; y < 165; y++) for (let x = 0; x < 224; x++) if (fb.getPixel(x, y).join() === '255,215,64') n++;
      return n;
    };
    expect(gold(victory)).toBeGreaterThan(100);
    expect(gold(over)).toBe(0);
    expect(createInitialGameState(createCleanRoomBundle()).victory).toBe(false);
  });
});
