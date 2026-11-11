/**
 * Pure deterministic random-number authority for simulation rules.
 *
 * One call consumes exactly one integer state transition. Rule engines validate
 * before calling this helper so rejected commands never advance randomness.
 */

/** Pure Mulberry32 step returning a deterministic [0, 1) value and next state. */
export function nextRandom(seedState: number): { readonly value: number; readonly nextState: number } {
  const nextState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(nextState ^ (nextState >>> 15), 1 | nextState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}
