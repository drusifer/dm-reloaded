Asset export sprint task board; sole active task list for sprint-2-assets.

TLDR:
    Goal: Export each decoded local sprite as an indexed PNG with a deterministic manifest and independent verification.
    Status: Complete — delivered locally with all gates, seven domain retrospectives and Cypher launch.
    Next: Lighting filter and semantic sprite classification follow ADR-009; combat/progression remains Sprint 3.

# Asset Export Sprint — sprint-2-assets

- Scope and acceptance: [docs/SPRINT_ASSET_EXPORT.md](docs/SPRINT_ASSET_EXPORT.md), AE-1 through AE-8.
- Workflow: [docs/SDLC.md](docs/SDLC.md); bounded tests and serial bobp make calls.
- Source: user-local graphics.dat; output build/sprites is ignored. No runtime migration, lighting, packs, combat, commit or push in this scope.

## Phase 1 — Pure indexed PNG and manifest
Chain: Neo → Trin independent QA → Morpheus review. Internal-only phase; final CLI/artifact Smith gate is in Phase 2.

- [x] **AE-P1.1** (@Neo): Implement deterministic indexed PNG encoding with source dimensions and pixel indices, brightest16-color palette, alpha0 at index0 and opaque1–15. Reject invalid dimensions/pixels/palette; add meaningful known-data PNG structure/inflate checks (AE-2).
- [x] **AE-P1.2** (@Neo): Implement schema version 1 deterministic manifest construction, numeric index ordering, portablecategory/index_WxH paths, source basename and hash, sparse verified semantic keys and unclassified unknowns. Verify one entry per decoded sprite, deterministic bytes and existing key mappings (AE-1, AE-3, AE-4).

## Phase 2 — Local automation, independent artifacts and docs
Chain: Neo → Trin QA → Morpheus review → Tank mechanism verification → mandatory Smith actual CLI/PNG gate.

- [x] **AE-P2.1** (@Neo, Tank mechanism approved): Add Node.mjs runner reusing the existing Vite SSR loader and parser, export-sprites Make target with quoted SPRITE_INPUT/SPRITE_OUTPUT and ARGS for help. Validate source container completeness before parsing/publication; fail helpfully for missing/corrupt input. Stage and write only exporter-owned output in resolved ignoredbuild tree; preserve input and unrelated files and reject unsafe or unowned collisions. Actual CLI, error, and rerun tests (AE-1, AE-5, AE-6).
- [x] **AE-P2.2** (@Neo/Trin): Add export-sprites-review target using pinned Playwright and native Chromium PNG decoder. Compare source-derived expected RGBA with independently decoded RGBA for all 535 provided exports; verifycounts/paths/hashes/dimensions/palette/alpha. Capture representative UI, torch, and wall artwork and actual CLI, help, and error evidence. Unavailable local assets must be explicit (AE-2, AE-7).
- [x] **AE-P2.3** (@Tank/Oracle): Update actual Make targets/prerequisites and raw-index and transparency caveats in SDLC/README, record decisions, perform final audit of AE-1 through AE-8 evidence, mandatory Smith approval, retrospective and local Cypher close (AE-8).

## Completed Milestones

- **Asset export (`sprint-2-assets` — Delivered locally 2026-11-03)**: Offline indexed PNG exporter and deterministic manifest; strict original palette/source validation, safe owned output and independent native review of535sprites/1,690,768pixels. All AE1–8 and final Smith approval passed. See [acceptance](docs/SPRINT_ASSET_EXPORT.md) and [sprint archive](agents/chat_archive/CHAT_sprint-2-assets.md). No deployment.

- **Sprint 2 (`sprint-2` — Delivered locally 2026-11-03)**: Physical inventory/chests/scrolls and derived equipment effects; center/side world items and throws; survival/bones/Vi Altars; pointer and sound cues; warning/restart feedback. Final accepted-story approvals in `agents/chat_archive/CHAT_sprint-2-acceptance.md`; original phase history in `CHAT_sprint-2.md`. No deployment.
- **Sprint 1 (`sprint-1` — Delivered & Launched 2026-11-02)**: Toolchain, OFS/8104 `Dungeon.dat` (14 levels, 24 Champions) & `graphics.dat` (535 RLE sprites, 33 `5500 Hz` Paula PCM sounds) decoders, `item[558]` perspective walls & `0x08` 3D doors, `320×200` Framebuffer/HUD/Automap, Purist/QoL input, Paula spatial audio + `SFX BOARD [B]` (`32/32` Vitest tests green).

## Backlog (Future Sprints — Reference: `docs/PRD.md`)
- **Sprint 2 retrospective follow-up**: repair trace-audit `jinja2` dependency and stop masking trace failures; serialize shared `bobp make` log writers; improve long-scroll pagination while retaining full logged text; keep final story-to-evidence review and live browser regressions.
- **Post-Sprint 2 (ADR-009)**: Exporter delivered in `sprint-2-assets`. Next: one parametric lighting filter replacing ramp swaps and semantic-key classification of all 535 sprites via the contact sheet (`G`); define per-sprite runtime mask policy before consuming raw exports. Later epic: campaign-pack loader (`campaign.json`, PNG sprites, `maps/`, `items.json`) for community content. Retain independent metadata checks and safe output/report ownership.
- **Sprint 3**: 4-Class / 16-Subskill Usage Progression, Melee/Ranged Combat Actions (`item[14]` damage starburst + `item[560]` action names), 24-Rune Combinatorial Spell & Potion System (reusing `item[557]` rune glyph slots `97..122`).
- **Sprint 4**: All 27 DM1 Monster Types, Group AI/Formations, Scent Tracking, Doors Crushing Monsters, Monster Generators.
- **Sprint 5**: Complete 14-Level DM1 Campaign Polish, Firestaff/Lord Chaos Endings, Multi-Slot IndexedDB Saves, File-Picker `.DAT` Import.
- **Sprint 6**: *Chaos Strikes Back* (Champion Import Utility, Prison, Corbums & Ful Ya).
- **Sprint 7–8**: *Dungeon Master II: The Legend of Skullkeep* (LZX unpacking from `DM2_archive.LZX`, Outdoor/Weather, Shops/Coins, Commandable Minions).
