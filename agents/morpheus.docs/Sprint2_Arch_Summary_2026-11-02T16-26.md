# Sprint 2 Architecture Summary (`*lead arch sprint`)

- **Persona**: Morpheus (`*lead`)
- **Date**: 2026-11-02T16:26-05:00
- **Deliverable**: `docs/ARCH.md` (Sprint 2 Extensions)

## Key Architectural Decisions & Binary Discoveries
1. **ADR-006 — Empirically Verified FTL Item Catalog (`item[556]` + `item[559]` + `items 42..48`)**:
   - Cracked `graphics.dat` `item[556]` (`199` high-bit-terminated item names `0..198`), `items 42..48` (`7 × 256×32` `16×16` icon sheets = `224` slots), and `item[559]` (`offsets 1959..3038`, `180 × 6`-byte `ObjectDescriptor` table covering `DB7/DB9/DB8/DB5/DB6/DB10`), plus Level 0 Champion Mirror starting equipment chains and `DB9` Chest `w1` child-chain pointers.
2. **ADR-007 — Persistent `handItem` & Normalized Entity-Map World Items (`GameState.items`)**:
   - All world, equipped, backpack, chest, and flying items live in serializable `GameState.items: Record<ItemInstanceId, ItemInstance>`, referenced by ID from `Tile.floorItems[quadrant]`, `Tile.wallItems[face]`, `ChampionInventory`, `GameState.handItem`, and `ProjectileState`. Guarantees zero item duplication/loss across floor <-> hand <-> inventory <-> projectile transitions.
3. **ADR-008 — Sub-Tile Corridor Projectile & Survival Engines (`src/engine/projectiles.ts`, `src/engine/survival.ts`)**:
   - Pure 6 Hz modules keeping `SimulationReducer` modular and SOLID (no God-file bloat), handling left/right lane throws, `IRON_GRATE` small-item pass-through, object teleporters/plates, Food/Water/Stamina ticks, Torch charge decay, Sleep, Champion Bones drop, and Vi Altar resurrection.
