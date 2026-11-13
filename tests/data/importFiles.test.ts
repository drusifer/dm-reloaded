import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importCampaignFiles } from '../../src/data';

const DUNGEON = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');
const GRAPHICS = resolve(process.cwd(), 'public/assets/extracted/dm1/graphics.dat');

describe('S5-2 import validation', () => {
  it('rejects missing, tiny, and garbage dungeon files with typed reasons', () => {
    const reason = (r: ReturnType<typeof importCampaignFiles>) => (r.ok ? 'OK' : r.reason);
    expect(reason(importCampaignFiles({ dungeon: null }))).toBe('EMPTY');
    expect(reason(importCampaignFiles({ dungeon: new Uint8Array(0) }))).toBe('EMPTY');
    expect(reason(importCampaignFiles({ dungeon: new Uint8Array(10) }))).toBe('NOT_DUNGEON_DAT');
    const noise = new Uint8Array(5000).map((_, i) => (i * 131 + 7) & 255);
    expect(['NOT_DUNGEON_DAT', 'PARSE_FAILED']).toContain(reason(importCampaignFiles({ dungeon: noise })));
    const zeros = importCampaignFiles({ dungeon: new Uint8Array(5000) });
    expect(zeros.ok).toBe(false);
    const html = new TextEncoder().encode('<html>'.repeat(100));
    expect(importCampaignFiles({ dungeon: html }).ok).toBe(false);
  });

  it.skipIf(!existsSync(DUNGEON))('accepts the real Dungeon.dat with generated art and never mutates the input', () => {
    const bytes = new Uint8Array(readFileSync(DUNGEON));
    const copy = bytes.slice();
    const r = importCampaignFiles({ dungeon: bytes });
    expect(r.ok).toBe(true);
    expect(bytes).toEqual(copy);
    if (r.ok) {
      expect(r.campaign.dungeon.levels.length).toBe(14);
      expect(r.usedFallbackGraphics).toBe(true);
      expect(r.text).toMatch(/14 LEVELS/);
    }
  });

  it.skipIf(!existsSync(DUNGEON) || !existsSync(GRAPHICS))('accepts real graphics and rejects a corrupt graphics file', () => {
    const dungeon = new Uint8Array(readFileSync(DUNGEON));
    const good = importCampaignFiles({ dungeon, graphics: new Uint8Array(readFileSync(GRAPHICS)) });
    expect(good.ok && !good.usedFallbackGraphics).toBe(true);
    const bad = importCampaignFiles({ dungeon, graphics: new Uint8Array(300).fill(7) });
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.reason).toBe('GRAPHICS_PARSE_FAILED');
  });
});

describe('S7-3 campaign identity', () => {
  const DM2 = resolve(process.cwd(), 'public/assets/extracted/dm2/DUNGEON.DAT');

  it.skipIf(!existsSync(DUNGEON))('keeps the DM1 id and the recognized message for the 14-level file', () => {
    const r = importCampaignFiles({ dungeon: new Uint8Array(readFileSync(DUNGEON)) });
    expect(r.ok && r.recognized).toBe(true);
    expect(r.ok && r.campaign.dungeon.campaignId).toBe('dm1-amiga-v2');
  });

  it.skipIf(!existsSync(DM2))('imports the DM2 map container as an unrecognized campaign with its own id', async () => {
    const bytes = new Uint8Array(readFileSync(DM2));
    const r = importCampaignFiles({ dungeon: bytes });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recognized).toBe(false);
    expect(r.campaign.dungeon.levels).toHaveLength(44);
    expect(r.campaign.dungeon.campaignId).toMatch(/^amiga-dat-44maps-[0-9a-f]{8}$/);
    expect(r.campaign.dungeon.campaignId).not.toBe('dm1-amiga-v2');
    expect(r.campaign.dungeon.title).toMatch(/unrecognized/);
    expect(r.text).toBe('IMPORTED 44 LEVELS: UNRECOGNIZED, NO PARTY.');
    expect(r.text.length).toBeLessThanOrEqual(46);
    const { createInitialGameState } = await import('../../src/engine');
    expect(createInitialGameState(r.campaign).messages).toEqual(['NO CHAMPIONS IN THIS CAMPAIGN. LOOK AROUND.']);
    const again = importCampaignFiles({ dungeon: bytes });
    expect(again.ok && again.campaign.dungeon.campaignId).toBe(r.campaign.dungeon.campaignId);
  });

  it.skipIf(!existsSync(DUNGEON) || !existsSync(DM2))('a DM1 save is refused by the DM2 campaign and vice versa', async () => {
    const { createInitialGameState, deserializeSave, serializeSave } = await import('../../src/engine');
    const dm1r = importCampaignFiles({ dungeon: new Uint8Array(readFileSync(DUNGEON)) });
    if (!dm1r.ok) throw new Error('dm1 import failed');
    const dm1 = createInitialGameState(dm1r.campaign);
    const dm2r = importCampaignFiles({ dungeon: new Uint8Array(readFileSync(DM2)) });
    if (!dm2r.ok) throw new Error('dm2 import failed');
    const dm2 = createInitialGameState(dm2r.campaign);
    const refused = deserializeSave(serializeSave(dm1), dm2.campaignId);
    expect(!refused.ok && refused.reason).toBe('WRONG_CAMPAIGN');
    const refused2 = deserializeSave(serializeSave(dm2), dm1.campaignId);
    expect(!refused2.ok && refused2.reason).toBe('WRONG_CAMPAIGN');
    expect(deserializeSave(serializeSave(dm2), dm2.campaignId).ok).toBe(true);
  });
});

describe('S8-4 GDAT recognition in import', () => {
  const DM2_GRAPHICS = resolve(process.cwd(), 'public/assets/extracted/dm2/GRAPHICS.DAT');
  const DM2_DUNGEON = resolve(process.cwd(), 'public/assets/extracted/dm2/DUNGEON.DAT');

  it.skipIf(!existsSync(DM2_GRAPHICS) || !existsSync(DM2_DUNGEON))('recognizes the DM2 graphics file honestly and keeps generated art', () => {
    const r = importCampaignFiles({
      dungeon: new Uint8Array(readFileSync(DM2_DUNGEON)),
      graphics: new Uint8Array(readFileSync(DM2_GRAPHICS))
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.usedFallbackGraphics).toBe(true);
    expect(r.graphics.source).not.toBe('AMIGA_GRAPHICS_DAT');
    expect(r.notes[0]).toBe('DM2 GRAPHICS: 3011 IMAGES, 77 CREATURES.');
    expect(r.notes.join(' ')).toMatch(/ART NOT USED YET/);
    expect(r.notes.every((line) => line.length <= 46)).toBe(true);
    expect(r.text).not.toMatch(/YOUR GRAPHICS/);
  });

  it.skipIf(!existsSync(DUNGEON) || !existsSync(GRAPHICS))('DM1 graphics are still used as before', () => {
    const r = importCampaignFiles({
      dungeon: new Uint8Array(readFileSync(DUNGEON)),
      graphics: new Uint8Array(readFileSync(GRAPHICS))
    });
    expect(r.ok && !r.usedFallbackGraphics).toBe(true);
    expect(r.ok && r.notes).toEqual([]);
    expect(r.ok && r.text).toMatch(/WITH YOUR GRAPHICS/);
  });
});
