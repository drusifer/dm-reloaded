/** Final accepted-story feedback regressions: depleted vitals and total party wipe. */
import { describe, expect, it } from 'vitest';
import { Framebuffer, renderFrame, getUiPalette } from '../../src/render';
import { partyOf, patchChampion } from '../engine/testkit';
describe('Sprint 2 accepted feedback', () => {
  it('marks depleted food red and low water yellow in the open inventory', () => {
    const state = { ...patchChampion(partyOf('iaido'), 0, { food: -1, water: 200 }), openInventoryChampionIndex: 0 };
    const fb = new Framebuffer(); renderFrame(fb, state);
    const palette = getUiPalette();
    expect(fb.getPixel(33, 142)).toEqual(palette[8]);
    expect(fb.getPixel(35, 152)).toEqual(palette[11]);
  });
  it('puts the game-over panel above inventory and sleeping views', () => {
    const base = partyOf('iaido');
    const state = { ...base, gameOver: true, openInventoryChampionIndex: 0, party: { ...base.party, sleeping: true } };
    const fb = new Framebuffer(); renderFrame(fb, state);
    expect(fb.getPixel(28, 67)).toEqual([220, 40, 40]);
    expect(fb.getPixel(29, 68)).toEqual([0, 0, 0]);
  });
});
