import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import {
  SAVE_FORMAT, SAVE_VERSION, checksumText, createInitialGameState, createSprint4ReviewScenario,
  deserializeSave, dispatchCommand, serializeSave
} from '../../src/engine';
import type { GameState } from '../../src/engine/types';
import { partyOf, tick } from './testkit';

const CAMPAIGN = createCleanRoomBundle().dungeon.campaignId;

function midFight(): GameState {
  let state = createSprint4ReviewScenario(partyOf('iaido', 'zed'));
  state = tick(state, 40).state;
  return state;
}

describe('S5-1 save codec', () => {
  it('round-trips fresh, recruited, and mid-fight states exactly', () => {
    for (const state of [createInitialGameState(createCleanRoomBundle()), partyOf('iaido'), midFight()]) {
      const loaded = deserializeSave(serializeSave(state), state.campaignId);
      expect(loaded.ok).toBe(true);
      if (loaded.ok) expect(loaded.state).toEqual(state);
    }
  });

  it('resumes deterministically: 200 ticks after loading equal 200 ticks from the original', () => {
    const state = midFight();
    const loaded = deserializeSave(serializeSave(state), state.campaignId);
    if (!loaded.ok) throw new Error('load failed');
    const a = dispatchCommand(state, { type: 'TICK', count: 200 });
    const b = dispatchCommand(loaded.state, { type: 'TICK', count: 200 });
    expect(b.state).toEqual(a.state);
    expect(b.events).toEqual(a.events);
  });

  it('rejects bad input with specific reasons and never throws', () => {
    const good = serializeSave(partyOf('iaido'));
    const parsed = JSON.parse(good) as Record<string, unknown>;
    const reason = (text: string | null | undefined, id = CAMPAIGN) => {
      const r = deserializeSave(text, id);
      return r.ok ? 'OK' : r.reason;
    };
    expect(reason(null)).toBe('EMPTY');
    expect(reason('   ')).toBe('EMPTY');
    expect(reason('{nope')).toBe('NOT_JSON');
    expect(reason('[]')).toBe('WRONG_FORMAT');
    expect(reason(JSON.stringify({ ...parsed, format: 'other' }))).toBe('WRONG_FORMAT');
    expect(reason(JSON.stringify({ ...parsed, version: SAVE_VERSION + 1 }))).toBe('UNSUPPORTED_VERSION');
    expect(reason(JSON.stringify({ ...parsed, checksum: 'deadbeef' }))).toBe('CHECKSUM_MISMATCH');
    expect(reason(good.replace('"tick":0', '"tick":1'))).toBe('CHECKSUM_MISMATCH');
    expect(reason(good, 'some-other-campaign')).toBe('WRONG_CAMPAIGN');
    const stripped = { ...(parsed.state as object), party: undefined };
    expect(reason(JSON.stringify({ ...parsed, state: stripped, checksum: checksumText(JSON.stringify(stripped)) }))).toBe('INVALID_STATE');
    expect(reason(JSON.stringify({ format: SAVE_FORMAT, version: SAVE_VERSION }))).toBe('INVALID_STATE');
    const r = deserializeSave('{nope', CAMPAIGN);
    expect(!r.ok && r.text).toMatch(/CORRUPT/);
  });

  it('checksum changes with content', () => {
    expect(checksumText('a')).not.toBe(checksumText('b'));
    expect(checksumText('abc')).toBe(checksumText('abc'));
  });
});
