Architectural and product decision log for the Amiga Dungeon Master trilogy project.

TLDR:
    Impact: Records binding stakeholder product scope and Morpheus ADR-001 through ADR-009 (ADR-009: campaign packs, SpriteSource, one-filter lighting).
    Next Steps: Keep updated at every sprint architecture or product scope milestone.

# Project Decisions (`docs/DECISIONS.md`)

## PDR-001: Full Amiga Trilogy Scope & Phased Delivery (2026-11-01)
- **Context**: User requested a full and complete implementation of the FTL Games Amiga *Dungeon Master* video game series.
- **Decision**: Deliver all three Amiga releases in phased milestones: *Dungeon Master* (1988, 14 levels) $\rightarrow$ *Chaos Strikes Back* (1989, Champion import & nonlinear campaign) $\rightarrow$ *Dungeon Master II: The Legend of Skullkeep* (1993).
- **Consequences**: Core engine types (`CampaignBundle`, `Tile`, `Actuator`, `PartyState`) are designed from Sprint 1 to support multi-campaign loading and character export/import.

## ADR-001: Browser Runtime with Pure Headless TypeScript Simulation Core (2026-11-01)
- **Context**: Need zero-install playability, crisp pixel/audio control, and fast deterministic automated testing via `bobp make test`.
- **Decision**: Use TypeScript 5 + Vite + Vitest, strictly isolating `src/engine/` (pure ~6 Hz simulation reducer emitting `EngineEvent[]` with zero DOM/Canvas/WebAudio imports) from `src/render/`, `src/audio/`, and `src/input/`.
- **Consequences**: 100% of dungeon mechanics, movement, triggers, combat, and AI run deterministically in Node/Vitest without browser overhead.

## ADR-002: Canonical 320×200 Amiga OCS Framebuffer & Integer Scaling (2026-11-01)
- **Context**: Authentic Amiga visual identity and cursor interaction depend on exact classic screen proportions (`224×136` 3D viewport, top 4-champion bar, right movement/spell deck, bottom scroll line).
- **Decision**: Render to an offscreen `320×200` logical `<canvas>` (`imageSmoothingEnabled = false`) and integer-blit to the responsive display canvas; map all pointer coordinates back into `[0..319, 0..199]`.
- **Consequences**: Pixel-perfect retro visuals and deterministic UI hitboxes across any monitor resolution.

## ADR-003: Dual-Mode Campaign & Asset Provider Boundary (2026-11-01)
- **Context**: Must be playable immediately out of the box without copyrighted FTL binaries while supporting enthusiasts who own original `.DAT` files.
- **Decision**: Define `CampaignProvider` producing a normalized `CampaignBundle`, backed by `CleanRoomProvider` (built-in pixel art, procedural audio, recreated maps/champions) by default plus an optional `DatArchiveLoader` adapter.
- **Consequences**: Zero copyright blockers for immediate play/testing; clean seam for binary `.DAT` parsing in Sprint 5.

## ADR-004: Purist 1988 Default + Explicit QoL & WebAudio Gesture Unlock (2026-11-01)
- **Context**: Classic Amiga players expect authentic mouse-driven rules, while modern web players benefit from optional `QWEASD` keys, automap, and clear browser audio unlock feedback.
- **Decision**: Default `SettingsState` to 1988 Purist Mode with an unobtrusive Options toggle enabling QoL (`QWEASD`, `M` automap, control legend), and auto-unlock `AudioContext` on first input with a visible `AudioStatus` indicator.
- **Consequences**: Preserves 1988 authenticity while satisfying Nielsen's HCI heuristics (#1, #3, #5, #6, #7).

## ADR-005: Direct Amiga ADF (`DM1` OFS & `DM2` Split-LZX AGA) Asset & Map Extraction (2026-11-01)
- **Context**: Stakeholder provided both `Dungeon-Master_Amiga_EN.zip` (Amiga v2.0 `[HD].adf`, `901,120`B `DOS\x00` OFS) and `Dungeon-Master-II-Skullkeep_Amiga_EN.zip` (6-disk AGA `[HD].adf` installer set `DM2_SK_Install1..6`).
  - **DM1 Verified**: `/DM/graphics.dat` (`411,960`B, **575 uncompressed items** of 4-bitplane art, UI, portraits, fonts & 8-bit PCM audio) + `/DM/Dungeon.dat` (`25,006`B `0x8104` prefix-compressed $\rightarrow$ `33,444`B uncompressed, `seed=99`, **all 14 original levels**).
  - **DM2 Verified**: Concatenating `/dm2_arcsplit1..6` across Disks 1–6 yields `DM2_archive.LZX` (`4,310,121`B Amiga `LZX\x00` archive) containing `DUNGEON.DAT`, `GRAPHICS.DAT` (AGA), `TITL.DAT`, `ENDA.DAT`, `IPLY.DAT`, `SWSH.DAT`, and `MMUS.BIN` (~6 MB unpacked).
- **Decision**: Promote `AdfOfsExtractor` + `GraphicsDatDecoder` + `DungeonDatParser` into **Sprint 1** (`bobp make extract-assets` + runtime TypeScript decoders) for DM1 (`Dungeon-Master_Amiga_EN.zip`) and include an Amiga `LZX\x00` unpacker in our asset extraction pipeline so DM2's `GRAPHICS.DAT`, `DUNGEON.DAT`, `TITL.DAT`, `ENDA.DAT`, and `MMUS.BIN` unpack cleanly from `Dungeon-Master-II-Skullkeep_Amiga_EN.zip` (and likewise any future *Chaos Strikes Back* `.adf`/`.zip`). Keep all `.zip`/`.adf`/`.lzx`/extracted `.dat` binaries gitignored while retaining synthetic test fixtures for fast CI tests.
- **Consequences**: Authentic original FTL Amiga artwork, audio, music, and level maps across both DM1 and DM2 Skullkeep directly from the user's disk images.


## ADR-006: Empirically Verified FTL Item Catalog (`item[556]`, `items 42..48`, `item[559]`) (2026-11-02)
- **Context**: Sprint 2 requires authentic names, `16×16` icons, equip-slot rules, floor sprites, and weights for all `DB5..DB10` items across all 14 Amiga levels, plus a legal `CleanRoomProvider` fallback.
- **Decision**: Decode `graphics.dat` `item[556]` (`199` high-bit-terminated item names `0..198`), `items 42..48` (`7 × 256×32` `16×16` icon sheets = `224` cells), and `item[559]` (`offsets 1959..3038`, `180 × 6`-byte `ObjectDescriptor` table ordered `DB7/DB9/DB8 [23] + DB5 [46] + DB6 [58] + DB10 [53]`), paired with Level 0 Champion Mirror gear chains and `DB9` Chest `w1` child chains, normalized behind `src/data/itemCatalog.ts` with a deterministic clean-room catalog fallback.
- **Consequences**: Zero guesswork on item icons, names, or equip compatibility; 100% genuine 1988 item appearance when `.dat` files are present and 100% legal CI testability when absent.

## ADR-007: Normalized `ItemInstance` Entity Map & Persistent `handItem` (2026-11-02)
- **Context**: Items move continuously between floor sub-tile stacks, wall alcoves, champion paperdoll slots, nested chests, the mouse cursor hand, and flying corridor projectiles.
- **Decision**: Store all live item instances by deterministic `ItemInstanceId` inside `GameState.items: Readonly<Record<ItemInstanceId, ItemInstance>>`, referenced by ID from `Tile.floorItems[quadrant]`, `Tile.wallItems[face]`, `ChampionInventory`, `GameState.handItem`, and `ProjectileState`. Keep `GameState.handItem` persistent across opening/closing/switching champion inventory views and moving through the dungeon.
- **Consequences**: Eliminates item cloning/duplication bugs, keeps `GameState` purely serializable for Sprint 5 save games, and preserves classic Amiga floor-to-backpack and backpack-to-corridor cursor ergonomics.

## ADR-008: Modular 6 Hz Inventory, Projectile & Survival Sub-Engines (2026-11-02)
- **Context**: Adding paperdoll encumbrance, corridor throwing physics, Food/Water/Stamina ticks, Sleep, Torch burn, and Vi Altar resurrection directly into `simulation.ts` would create a monolithic reducer.
- **Decision**: Decompose Sprint 2 simulation rules into pure, zero-DOM sub-modules under `src/engine/` (`inventory.ts`, `projectiles.ts`, `survival.ts`) orchestrated by `SimulationReducer`.
- **Consequences**: Maintains Single Responsibility Principle (SOLID), fast targeted Vitest unit tests per subsystem, and clean extensibility for Sprint 3 Runic Magic & Combat projectiles.

## ADR-009: Campaign Packs, Semantic `SpriteSource` & One-Filter Lighting — "Reproduce the Game, Not the Engine" (2026-11-02)
- **Context**: After the DM trilogy the stakeholder wants an open-ended DM-style engine where community authors supply art, maps, items and puzzles. Painters currently hard-code `graphics.dat` item indices (walls `75..89`, doorjambs `78..80`, `item[558]` blitter rects), and lighting is a palette swap over 6 hand-authored 1988 ramps. Stakeholder ruling: **fidelity applies to gameplay (6 Hz tick, movement, doors/actuators, champions, inventory, items, spells), not to renderer internals.**
- **Decision**:
  1. **Campaign pack** (`campaign.json`, `sprites/*.png`, `lighting.json`, `maps/`, `items.json`, `champions.json`, `puzzles/`, `sounds/`). DM1 is one pack generated locally from the user's own `.dat` files (never committed); the engine ships a clean-room pack.
  2. **`SpriteSource` indirection**: painters request sprites by semantic key (e.g. `wall.stone.front.d1`), never by `graphics.dat` index. Resolvers: DM1 adapter (key→index), pack loader (key→PNG), clean-room fallback (existing three-tier behaviour).
  3. **One PNG per sprite** (indexed or truecolor, index 0 / alpha = transparent). No per-light-ramp variants.
  4. **One parametric lighting filter** (brightness curve, tint, distance falloff, optional desaturation) driven by `lighting.json`, applied identically to indexed and truecolor sprites. The 6 original ramps are tuning reference only, not a requirement.
  5. Exporter (`bobp make export-sprites`) writes `build/sprites/<category>/<index>_<WxH>.png` + `manifest.json` (index, size, category, semantic key once classified); output stays gitignored. Contact sheet (`G`) is the classification aid.
- **Consequences**: Enables community art/maps without engine changes; relaxes pixel-exact art tests (visual checks become plausibility checks) while gameplay rules stay strict; `SpriteSource` must land before Sprint 2 Phase 2 painters and well before Sprint 4 monsters to avoid more hard-coded indices. Runtime still decodes `graphics.dat` until the pack loader exists. Exporter/loader implementation is scheduled after Sprint 2 (exporter backlog; Task 2.0 is SpriteSource; loader as a later epic).


### ADR-009 Implementation Clarifications — 2026-11-03

The semantic adapter landed for new Sprint 2 painters. Old wall painters and the six original palette ramps remain until the later migration; campaign-pack loading, export and one-filter lighting are not claimed delivered. Unclassified special wall/skull artwork uses recognizable procedural fallbacks and world items use scaled icons. Morpheus clarified sleep recovery as 3× with half food/water drain, and cursor-held load as belonging to the stable living leader independently of the viewed inventory, including nested held-chest weight once; final implementation and independent QA verified this load invariant on 2026-11-03.

## ADR-010: Derived Equipment Effects and Final Sprint 2 Acceptance Audit (2026-11-03)
- **Context**: Final story audit found omitted side alcoves, equipment bonuses, vital warnings and party-wipe feedback despite earlier bounded phase passes. Those approvals were incomplete for the whole story set.
- **Decision**: Derive effective equipment attributes, mana capacity and aggregate worn armor from immutable base champion data. Verified numeric slot bonuses come from [ScummVM's Dungeon Master champion statistics implementation](https://github.com/scummvm/scummvm/blob/master/engines/dm/champion.cpp#L280); no implementation source was copied. Strength bonuses feed capacity and throws; effective vitality/wisdom feed recovery. Armor is exposed for status; detailed combat resolution remains Sprint 3 scope.
- **Completion checks**: Side alcoves/contents use depth projection and inward-facing surfaces; depleted food/water warning states are visible; a party-wipe panel sits above other UI and click/Enter restores the original loaded campaign. New regressions and live captures supplement earlier gates. Final aggregate counts are recorded in the sprint close report.
