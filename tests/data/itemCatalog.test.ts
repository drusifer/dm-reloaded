/**
 * Task 1.1 tests: FTL item catalog, item[556]/[559] decoding, and DB5..DB10 world items.
 *
 * TLDR:
 *   Verifies the 180-entry ItemDef baseline (category counts, ids, names), cross-checks it against
 *   the REAL graphics.dat item[559] descriptors, and validates referential integrity of every
 *   DB5..DB10 item parsed from the REAL Dungeon.dat (floor/wall/chest/champion-gear chains) plus
 *   the clean-room fallback campaign. Real-asset tests are skipped when the .dat files are absent.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createCleanRoomBundle,
  createCleanRoomGraphicsBundle,
  parseDungeonDat,
  parseGraphicsDat
} from '../../src/data';
import {
  ITEM_CATALOG_180,
  ITEM_NAMES_199,
  findItemDef,
  findItemDefByLegacyName,
  getItemDef,
  parseItemNamesFrom556
} from '../../src/data/itemCatalog';
import type { CampaignBundle, ItemInstanceId } from '../../src/engine/types';

const GFX = resolve(process.cwd(), 'public/assets/extracted/dm1/graphics.dat');
const DUNGEON = resolve(process.cwd(), 'public/assets/extracted/dm1/Dungeon.dat');

function allReferencedItemIds(bundle: CampaignBundle): ItemInstanceId[] {
  const ids: ItemInstanceId[] = [];
  for (const level of bundle.dungeon.levels) {
    for (const row of level.tiles) {
      for (const tile of row) {
        for (const bucket of Object.values(tile.floorItems ?? {})) {
          ids.push(...bucket);
        }
        for (const bucket of Object.values(tile.wallItems ?? {})) {
          ids.push(...bucket);
        }
      }
    }
  }
  return ids;
}

function expectItemGraphIntact(bundle: CampaignBundle): void {
  const items = bundle.dungeon.initialItems ?? {};
  for (const id of allReferencedItemIds(bundle)) {
    expect(items[id], `tile references missing item ${id}`).toBeDefined();
  }
  for (const inst of Object.values(items)) {
    expect(inst.instanceId).toBeTruthy();
    expect(ITEM_CATALOG_180[inst.defId], `bad defId on ${inst.instanceId}`).toBeDefined();
    for (const child of inst.contents ?? []) {
      expect(items[child], `${inst.instanceId} contains missing ${child}`).toBeDefined();
    }
  }
}

describe('Task 1.1: item catalog baseline', () => {
  it('has 199 names and 180 sequential ItemDefs matching the DB7/DB9/DB8/DB5/DB6/DB10 layout', () => {
    expect(ITEM_NAMES_199).toHaveLength(199);
    expect(ITEM_CATALOG_180).toHaveLength(180);
    ITEM_CATALOG_180.forEach((d, i) => {
      expect(d.defId).toBe(i);
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.iconIndex).toBeGreaterThanOrEqual(0);
      expect(d.iconIndex).toBeLessThan(199);
    });
    const count = (cat: string): number => ITEM_CATALOG_180.filter((d) => d.category === cat).length;
    expect({
      scroll: count('SCROLL'),
      chest: count('CHEST'),
      potion: count('POTION'),
      weapon: count('WEAPON'),
      clothes: count('CLOTHES'),
      misc: count('MISC')
    }).toEqual({ scroll: 1, chest: 1, potion: 21, weapon: 46, clothes: 58, misc: 53 });
  });

  it('looks items up by id, category/subtype and legacy Sprint 1 names', () => {
    expect(getItemDef(0).category).toBe('SCROLL');
    expect(findItemDef('WEAPON', 8).name).toBe('DAGGER');
    expect(findItemDefByLegacyName('SAMURAI_SWORD').name).toBe('SAMURAI SWORD');
    expect(findItemDefByLegacyName('GI').name).toBe('GHI');
    expect(findItemDefByLegacyName('IRON KEY').name).toBe('IRON KEY');
    expect(findItemDef('WEAPON', 2).name).toBe('TORCH');
    expect(findItemDefByLegacyName('SCROLL').category).toBe('SCROLL');
    expect(findItemDefByLegacyName('SCROLL').name).toBe('SCROLL');
    expect(findItemDefByLegacyName('CHEST').category).toBe('CHEST');
  });

  it('decodes high-bit-terminated item[556] names', () => {
    const bytes = new Uint8Array([0x41, 0x42, 0xc3, 0x58, 0xd9]); // "ABC", "XY"
    expect(parseItemNamesFrom556(bytes)).toEqual(['ABC', 'XY']);
  });

  it('exposes the baseline catalog from the clean-room graphics bundle', () => {
    const g = createCleanRoomGraphicsBundle();
    expect(g.itemCatalog).toHaveLength(180);
    expect(g.itemNames).toHaveLength(199);
  });
});

describe('Task 1.1: clean-room campaign items', () => {
  it('keeps every referenced item resolvable and every champion kit equippable by name', () => {
    const bundle = createCleanRoomBundle();
    expectItemGraphIntact(bundle);
    expect(Object.keys(bundle.dungeon.initialItems ?? {}).length).toBeGreaterThan(0);
    for (const champ of Object.values(bundle.dungeon.champions)) {
      for (const name of champ.startingItems) {
        const def = findItemDefByLegacyName(name);
        expect(def.name, `champion ${champ.id} item "${name}" fell back to default`).toBe(
          name.replace(/_/g, ' ').toUpperCase() === 'GI' ? 'GHI' : name.replace(/_/g, ' ').toUpperCase()
        );
      }
    }
  });
});

describe('Task 1.1: real Amiga graphics.dat item[556]/[559]', () => {
  const has = existsSync(GFX);

  it.skipIf(!has)('decodes 199 names and 180 descriptors consistent with the baseline table', () => {
    const g = parseGraphicsDat(new Uint8Array(readFileSync(GFX)));
    expect(g.itemNames).toHaveLength(199);
    expect(g.itemNames.slice(0, 40)).toEqual(ITEM_NAMES_199.slice(0, 40));
    expect([...g.itemNames]).toEqual([...ITEM_NAMES_199]);
    expect(g.itemCatalog).toHaveLength(180);
    g.itemCatalog.forEach((real, i) => {
      const base = ITEM_CATALOG_180[i]!;
      expect(real.iconIndex, `def ${i} icon`).toBe(base.iconIndex);
      expect(real.floorSpriteIndex, `def ${i} floor sprite`).toBe(base.floorSpriteIndex);
      expect(real.equipMask, `def ${i} equip mask`).toBe(base.equipMask);
      expect(real.name, `def ${i} name`).toBe(base.name);
    });
  });
});

describe('Task 1.1: real Amiga Dungeon.dat world items', () => {
  const has = existsSync(DUNGEON);

  it.skipIf(!has)('parses 14 levels with a referentially intact DB5..DB10 item graph', () => {
    const bundle = parseDungeonDat(new Uint8Array(readFileSync(DUNGEON)));
    expect(bundle.dungeon.levels).toHaveLength(14);
    expectItemGraphIntact(bundle);
    const items = Object.values(bundle.dungeon.initialItems ?? {});
    expect(items.length).toBeGreaterThan(100);
    expect(allReferencedItemIds(bundle).length).toBeGreaterThan(50);
  });

  it.skipIf(!has)('attaches starting gear chains to Hall of Champions heroes', () => {
    const bundle = parseDungeonDat(new Uint8Array(readFileSync(DUNGEON)));
    const champs = Object.values(bundle.dungeon.champions);
    expect(champs).toHaveLength(24);
    const withGear = champs.filter((c) => (c.startingGearDefs ?? []).length > 0);
    expect(withGear.length).toBeGreaterThan(0);
  });

  it.skipIf(!has)('keeps chest children and scroll texts', () => {
    const bundle = parseDungeonDat(new Uint8Array(readFileSync(DUNGEON)));
    const items = Object.values(bundle.dungeon.initialItems ?? {});
    expect(items.some((i) => (i.contents ?? []).length > 0)).toBe(true);
    expect(items.some((i) => (i.scrollText ?? []).length > 0)).toBe(true);
  });
});
