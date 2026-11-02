/**
 * Deterministic ~6 Hz FTL simulation clock and seeded PRNG utilities.
 *
 * TLDR:
 *   Provides FTL_TICK_HZ (6 Hz / 166.67ms), FixedTickAccumulator for decoupling 60 FPS
 *   browser rendering from discrete simulation ticks, and nextRandom for reproducible RNG.
 */

export const FTL_TICK_HZ = 6;
export const FTL_TICK_MS = 1000 / FTL_TICK_HZ;
export const MAX_CATCHUP_TICKS = 6;

/**
 * Pure Mulberry32 step returning deterministic [0, 1) float and next 32-bit state.
 */
export function nextRandom(seedState: number): { readonly value: number; readonly nextState: number } {
  const nextState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(nextState ^ (nextState >>> 15), 1 | nextState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}

/**
 * Accumulates frame delta milliseconds and emits discrete 6 Hz simulation tick counts.
 */
export class FixedTickAccumulator {
  private accumulatedMs = 0;

  public advance(deltaMs: number): number {
    if (deltaMs <= 0) {
      return 0;
    }
    this.accumulatedMs += Math.min(deltaMs, FTL_TICK_MS * MAX_CATCHUP_TICKS);
    const ticks = Math.floor(this.accumulatedMs / FTL_TICK_MS);
    this.accumulatedMs -= ticks * FTL_TICK_MS;
    return ticks;
  }

  public reset(): void {
    this.accumulatedMs = 0;
  }
}
