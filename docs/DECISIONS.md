Architectural and product decision log for the Amiga Dungeon Master trilogy project.

TLDR:
    Impact: Records binding stakeholder product scope and Morpheus ADR-001 through ADR-014, including Sprint 3's deterministic combat, magic, progression, interaction, and source-provenance boundaries.
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

## ADR-011: Offline Indexed Sprite Export and Original Palette Requirement (2026-11-03)
- **Context**: ADR-009 calls for one PNG per decoded local sprite and a manifest. The runtime parser can fall back to default light ramps when palette record562 is missing or short; that fallback is useful in gameplay but would misrepresent an original-color export.
- **Decision**: The offline CLI requires complete original palette record562 and validates the full normalized archive before publication. It never substitutes clean-room art or default ramps. Pure encoder/manifest tests may use arbitrary sprite counts with explicit fixture palettes; actual CLI fixtures carry complete palette metadata. Keep the runtime parser unchanged.
- **Mechanism**: Use existing Vite SSR with HMR/watch disabled, native indexed PNG/zlib and deterministic schema1 metadata. Only dedicated, owned output under ignored build is writable; no whole-tree I/O rollback is promised. Independent Chromium decoding compares every actual exported pixel, and PNG metadata checks verify unused palette/transparency entries too. Review failures invalidate owned success evidence.
- **Scope**: Raw index0 transparency is an export policy; current runtime masks, lighting filters and campaign-pack loading remain separate work. No new dependency, runtime pin, CI or deployment is introduced.


## ADR-012: One Parametric Dungeon Color Transform (2026-11-03)
- **Context**: ADR-009 replaces runtime dark-ramp selection with one color filter. Oracle confirmed that gameplay light/ticks/burn rates, UI brightness, source masks and raw export fidelity remain unchanged. Smith approved LT-1…LT-5 stories and architecture before implementation.
- **Decision**: Import and validate a local render `lighting.json` once. A shared pure RGB formula desaturates toward Rec.709 luminance, multiplies by normalized tint blend and `(clamp(light,0,5)/5)^exponent * depthMultiplier`, then rounds once to bytes. Indexed palettes derive only from the brightest source palette; a pure RGBA adapter uses the identical transform and preserves alpha. Original dark ramps remain decoded as reference data.
- **Integration**: Derive a depth palette before world painting. Source indices decide transparency before RGB lookup; existing index0/index10 and smash masks stay intact. Procedural world colors and side projection consume the same derived palette exactly once. Dense palette entries make the existing numeric fallback colors unreachable; do not transform an already lit color again. HUD/inventory/modal/automap/cursor retain the UI palette. No world sprite becomes newly emissive.
- **Boundary**: No gameplay changes, runtime PNG loader, campaign pack, full semantic classification, new dependency or deployment. Native browser scenes must show original and fallback art at zero/low/full light and multiple depths. Implementation and final acceptance evidence are recorded in [lighting sprint](SPRINT_LIGHTING.md); planning approval alone is not delivery evidence.


## ADR-013: Source-Aware Sprite Catalog and Usage-Specific Masks (2026-11-03)
- **Context**: ADR009 calls for sprite classification before runtime pack loading. Existing tools duplicate panel/category/icon-address policy, and raw index0 PNG transparency differs from opaque UI, index0 icon crops, index10 world art and the separate sprite 301 bashed-door mask. Oracle and Smith require honest identity/provenance and unchanged raw exports.
- **Decision**: Join measured decoded entries with a sparse pure DM1 fact catalog only for AMIGA_GRAPHICS_DAT provenance. Generated records do not inherit identities from numeric IDs. Keep raw source indices distinct from cropped icon/portrait IDs, verified aliases distinct from active usages, and broad legacy export categories distinct from verified identity status. Cover every supplied decoded index; remaining identities stay explicitly unclassified.
- **Policy**: Each verified usage records its raw source, optional crop, source-space mask and evidence. Door usages 108–119 additionally reference sprite 301 as a conditional bashed auxiliary mask; sprite 301 is not a normal color sprite. Raw opaque/index0 inspection choices are explicit interpretations, never inferred runtime policy. Existing painter masks and lighting stay unchanged.
- **Compatibility**: Share existing four panel aliases, category and icon addressing without changing schema 1 manifest fields/categories/aliases or raw PNG/manifest bytes. Catalog-only evidence/status/usages remain separate. Keep current SpriteSource caching/fallback and extraction clamps; no broad painter migration or runtime PNG loader.
- **Delivery evidence**: [Catalog sprint](SPRINT_SPRITE_CATALOG.md) defines SC1–5 and the actual inspector/preview gates. Delivered locally on 2026-11-06 with 535 measured records (39 verified roles, 496 unclassified), a 570-check/9-capture actual browser review with zero exceptions, 3 independent inspection tests, a 268-test aggregate, strict lint/types and production build. Raw manifest/source hashes and all 535 PNG bytes remained compatible. Full semantic identification of all 535 sprites, campaign packs, combat and deployment remain future work.


## ADR-014: Deterministic Sprint 3 Combat, Magic, Progression, and Interaction Boundaries (2026-11-06)
- **Context**: Sprint 3 adds usage-based progression, item-driven combat actions, physical and magical projectiles, 24-rune casting, five bounded potion families, and a mouse-complete 320×200 user experience. These features must extend the existing pure 6 Hz reducer, normalized item ownership, lane-aware projectile engine, and dual original/clean-room presentation without importing Sprint 4 monster AI or Sprint 5 campaign/save scope. Smith approved the user contract and architecture after the rank, potion, and brewing-failure outcomes became explicit.
- **Decision**: Keep `dispatchCommand` and `stepSingleTick` as the sole command and clock authorities, with one specified pure `rngState` transition and fixed per-command draw budgets. Validate before committing RNG or costs, then resolve one effect and award XP only for successful gameplay. Derive all 16 skill ranks from one XP authority; generalize the existing projectile path with typed item, ammunition, and spell payloads; use passive review targets rather than autonomous monsters; represent cooldowns/effects with absolute ticks; and preserve `GameState.items` as the only physical-item authority. Brewing is an atomic selected-flask transaction: pre-validation changes nothing, fizzle spends mana but preserves the flask, backfire spends mana and destroys that flask, and success replaces that same item instance with one potion.
- **Interaction and provenance boundary**: One discriminated canvas interaction state owns action-menu, rune-panel, and progression focus. Mouse-only Purist flows remain complete; optional QoL keys are translated only while the rune panel owns input. Shared logical layout rectangles keep champion vitals and messages visible and prevent stale overlays. Rule catalogs use semantic keys. Only `AMIGA_GRAPHICS_DAT` provenance may select verified `item[560]` labels, `item[557]` rune glyphs, or sprite 14 damage art; clean-room content uses explicit equivalents and never inherits identity from matching numbers or dimensions.
- **Consequences**: Combat, progression, magic, effects, catalogs, input, and rendering remain independently testable with inward dependency flow. Invalid actions cannot consume costs, advance RNG, grant XP, detach items, or duplicate projectiles. Physical throws retain Sprint 2 landing/geometry behavior; spell payloads never enter inventory. Headless determinism and actual-browser interaction/visual evidence are separate mandatory gates. Existing raw exports, catalog identities, lighting transforms, parsers, and campaign schemas remain compatible; no runtime dependency, service, environment variable, deployment, commit, or push is introduced by the plan.
- **Authority and evidence**: The accepted player contract is [Sprint 3 product contract](SPRINT3.md); the complete A1–A12 design, tick order, commands/events, trace map, and verification matrix are authoritative in [Sprint 3 architecture](SPRINT3_ARCHITECTURE.md).
- **Delivered outcome addendum (2026-11-09)**: The boundary was implemented and approved locally across all `38/38` criteria. Stabilization retained the decision: unchanged inventory commands again preserve state identity; approaching projectile lanes are projected relative to travel direction; the visible current-formula preview is presentation-only. Final evidence passed `72/72` serialized diagnostic tests, `339/339` full aggregate tests, lint, strict types, build, and fresh `10/10` original plus `10/10` clean-room browser scenarios. The serial path kept the `5000 ms` timeout while removing aggregate worker contention. Judge trace remained unavailable because no Claude project directory existed. No commit, push, release or deployment is implied.

## ADR-015: Monsters as Extended Combat Targets with Pure Deterministic AI (2026-11-11)
- **Context**: Sprint 4 needs autonomous 27-type monsters, groups, pathing, damage both ways and doors/generators without forking the Sprint 3 combat, projectile, XP and kill-credit paths.
- **Decision**: A monster is a `CombatTargetState` with optional `monster` runtime data, so melee, thrown/ranged and spell damage, explosions and ownership stay unchanged. `stepMonsters` runs once per tick after projectiles and before survival. Perception and pathing use one bounded breadth-first distance field from the party tile (radius = sight + 4 scent bonus, separate ground/air fields), with the single `monsterCanEnterTerrain` passability authority. Formation is subcell-based (max 4 per tile, no shared subcell). Attacks draw exactly two RNG values. Non-material monsters ignore non-magical damage in `damageTarget`. Kill credit uses `lastHitBy`; door crush is once per closing at `progress === 2`.
- **Consequences**: Existing tests and passive review targets are untouched; monsters on other levels are frozen; ranged monsters strike directly instead of firing dodgeable projectiles; stats are clean-room approximations and silhouettes are labelled placeholder art.
- **Evidence**: [Sprint 4 contract and architecture](SPRINT4.md); real `Dungeon.dat` gate parses 150+ plausible groups; serial `370/370`, lint, types, build and two-source actual-browser gate passed.

