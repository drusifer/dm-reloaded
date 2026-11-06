Sprite catalog sprint task board; sole active task list for sprint-2-catalog.

TLDR:
    Goal: Complete measured sprite coverage, evidenced labels and usage-specific masks in a searchable G inspector.
    Status: Delivered locally 2026-11-06; SC1–SC5 and all implementation, QA, architecture, mechanism, documentation and actual UX gates passed.
    Next: Archive sprint chat and announce local completion; no commit, push or deployment was requested.

# Sprite Catalog Sprint — sprint-2-catalog

- Scope/criteria: [docs/SPRINT_SPRITE_CATALOG.md](docs/SPRINT_SPRITE_CATALOG.md), SC-1…SC-5.
- Preserve existing uncommitted lighting and prior raw PNG/manifest bytes.535records do not imply535identified sprites. No runtime PNG loader, full semantic identification, gameplay, deployment or automatic commit/push.
- Use [SDLC](docs/SDLC.md), serial bobp make and bounded checks. Root task.md is the only active board.

## Phase1 — Shared pure catalog and existing consumers
Chain: Neo → Trin independent QA → Morpheus review.

- [x] **SC-P1.1** (@Neo): Pure source-aware catalog over every measured decoded map entry; sparse verified facts, explicit unknowns, evidence and usage-specific masks/crops. Centralize existing four panels, categories and224icon addresses. Require original-source provenance for DM1 claims; CLEAN_ROOM17/42 remain unknown/generated (SC-1,SC-2).
- [x] **SC-P1.2** (@Neo): Consume shared policy in SpriteSource and exporter without changing cache/fallback/runtime masks, manifest schema/fields/categories/fouraliases or any raw PNG/manifest bytes. Independent mappings/crop boundaries, deterministic metadata, original535coverage and strict-source/owned-writer regressions (SC-1…SC-3).

## Phase2 — Observable inspection and final acceptance
Chain: Neo → Trin → Morpheus → Tank concrete automation approval → mandatory Smith actual browser/artifact gate.

- [x] **SC-P2.1** (@Neo): G inspector search/category/status filters, shown/total/status counts, keyboard-reachable persistent selection/details and explicit raw opaque/rawindex0/verifiedusage previews. Combine/reset/no-match, empty source, zoom/reference-ramp, copy/error feedback and one-Escape/focus restoration; do not leak typing into gameplay (SC-4,SC-5).
- [x] **SC-P2.2** (@Tank/Trin): Existing visual-review --catalog mode with separate truthful report/real input checks and preview PNGs; preserve legacy/lighting modes. Verify original535catalog, fallback empty/generated provenance, raw manifest compatibility and independent native535PNG fidelity. Once source/tests stable, one final aggregate/lint/build (SC-1…SC-5).
- [x] **SC-P2.3** (@Oracle/Smith/Cypher): Groom README/ARCH/SDLC/decision/evidence, final all-criteria audit and Smith actual usability approval, seven domain retrospectives, archive and local launch. Keep full semantic classification and pack loader explicitly future work.

## Completed Milestones

- **Verified sprite catalog (`sprint-2-catalog` — Delivered locally 2026-11-06)**: Source-aware535-record catalog with39verified roles/496unclassified, usage-specific masks/crops and searchable keyboard G inspector. Actual570-check/9-capture browser gate, independent3/3, aggregate268/268, lint/types/build and final Trin/Morpheus/Tank/Smith gates passed; raw source/manifest/535PNG bytes preserved. No deployment.

- **Parametric lighting (`sprint-2-lighting` — Delivered locally 2026-11-03)**: Shared validated RGB/palette/RGBA filter, brightest-only world palettes, existing masks/gameplay/full-bright UI retained.250tests/lint/types/build and26browser scenes/98checks passed; all LT1–5/Smith gates accepted. See [scope/evidence](docs/SPRINT_LIGHTING.md) and [archive](agents/chat_archive/CHAT_sprint-2-lighting.md). No deployment.

- **Asset export (`sprint-2-assets` — Delivered locally 2026-11-03)**: Offline indexed PNG exporter and deterministic manifest; strict original palette/source validation, safe owned output and independent native review of535sprites/1,690,768pixels. All AE1–8 and final Smith approval passed. See [acceptance](docs/SPRINT_ASSET_EXPORT.md) and [sprint archive](agents/chat_archive/CHAT_sprint-2-assets.md). No deployment.

- **Sprint 2 (`sprint-2` — Delivered locally 2026-11-03)**: Physical inventory/chests/scrolls and derived equipment effects; center/side world items and throws; survival/bones/Vi Altars; pointer and sound cues; warning/restart feedback. Final accepted-story approvals in `agents/chat_archive/CHAT_sprint-2-acceptance.md`; original phase history in `CHAT_sprint-2.md`. No deployment.
- **Sprint 1 (`sprint-1` — Delivered & Launched 2026-11-02)**: Toolchain, OFS/8104 `Dungeon.dat` (14 levels, 24 Champions) & `graphics.dat` (535 RLE sprites, 33 `5500 Hz` Paula PCM sounds) decoders, `item[558]` perspective walls & `0x08` 3D doors, `320×200` Framebuffer/HUD/Automap, Purist/QoL input, Paula spatial audio + `SFX BOARD [B]` (`32/32` Vitest tests green).

## Backlog (Future Sprints — Reference: `docs/PRD.md`)
- **Sprint 2 retrospective follow-up**: repair trace-audit `jinja2` dependency and stop masking trace failures; serialize shared `bobp make` log writers; improve long-scroll pagination while retaining full logged text; keep final story-to-evidence review and live browser regressions.
- **Post-Sprint 2 (ADR-009)**: Exporter delivered in `sprint-2-assets`. Parametric lighting delivered in `sprint-2-lighting`. Next: semantic-key classification of all 535 sprites via the contact sheet (`G`); define per-sprite runtime mask policy before consuming raw exports. Later epic: campaign-pack loader (`campaign.json`, PNG sprites, `maps/`, `items.json`) for community content. Retain independent metadata checks and safe output/report ownership.
- **Sprint 3**: 4-Class / 16-Subskill Usage Progression, Melee/Ranged Combat Actions (`item[14]` damage starburst + `item[560]` action names), 24-Rune Combinatorial Spell & Potion System (reusing `item[557]` rune glyph slots `97..122`).
- **Sprint 4**: All 27 DM1 Monster Types, Group AI/Formations, Scent Tracking, Doors Crushing Monsters, Monster Generators.
- **Sprint 5**: Complete 14-Level DM1 Campaign Polish, Firestaff/Lord Chaos Endings, Multi-Slot IndexedDB Saves, File-Picker `.DAT` Import.
- **Sprint 6**: *Chaos Strikes Back* (Champion Import Utility, Prison, Corbums & Ful Ya).
- **Sprint 7–8**: *Dungeon Master II: The Legend of Skullkeep* (LZX unpacking from `DM2_archive.LZX`, Outdoor/Weather, Shops/Coins, Commandable Minions).
