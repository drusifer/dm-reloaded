Architectural and product decision log for the Amiga Dungeon Master trilogy project.

TLDR:
    Impact: Records binding stakeholder product scope and Morpheus ADR-001 through ADR-004.
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
