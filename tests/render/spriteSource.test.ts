import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle } from '../../src/data';
import { createSpriteSource } from '../../src/render/spriteSource';

describe('semantic SpriteSource', () => {
  it('crops both rows of item sheets without leaking adjacent icons', () => {
    const base = createCleanRoomGraphicsBundle();
    const pixels = new Uint8Array(256 * 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 256; x++) pixels[y * 256 + x] = Math.floor(x / 16) + (y >= 16 ? 16 : 0);
    const source = createSpriteSource({ ...base, sprites: new Map([[42, { index: 42, width: 256, height: 32, pixels }]]) });
    expect([...source.getSprite('item.icon.17').pixels].every((p) => p === 17)).toBe(true);
    expect([...source.getSprite('item.icon.15').pixels].every((p) => p === 15)).toBe(true);
  });
  it('resolves panels and supplies cached clean-room sprites when assets are missing', () => {
    const source = createSpriteSource();
    expect(source.getSprite('inventory.panel')).toMatchObject({ width: 224, height: 136 });
    expect(source.getSprite('inventory.chest')).toMatchObject({ width: 144, height: 73 });
    expect(source.getSprite('item.icon.30')).toBe(source.getSprite('item.icon.30'));
    expect(source.getSprite('item.icon.30').pixels.some((p) => p !== 0)).toBe(true);
  });
});
