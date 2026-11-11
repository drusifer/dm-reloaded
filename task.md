Sprint 4 task board; sole active task list for `sprint-4`.

# Sprint 4 — Monster Ecology, AI & Traps

Contract and architecture: `docs/SPRINT4.md` (S4-1..6; M1-M9). Chain per phase: Neo -> Trin independent QA -> Morpheus review. Phase 5 adds Smith end-to-end, Oracle groom, retros, Cypher launch. No commit/push/release implied.

## Phase 1 — Catalog, parser, state
- [x] **S4-P1.1** (@Neo): TDD 27-entry monster catalog and monster fields on `CombatTargetState` (S4-1; M1,M2).
- [x] **S4-P1.2** (@Neo): TDD Amiga creature-record parser with real-file gate and clean-room review pack (S4-2; M6).

## Phase 2 — AI core
- [x] **S4-P2.1** (@Neo): TDD passability, perception, bounded BFS/scent pathing, subcell formation and movement (S4-3; M3-M5).
- [x] **S4-P2.2** (@Neo): TDD attack timing, monster ranged shots, determinism, tick integration (S4-3).

## Phase 3 — Fighting, doors, generators
- [x] **S4-P3.1** (@Neo): Monster damage to champions through armor, death/wipe, champion hits on monsters incl. non-material rules, kill credit, drops (S4-4).
- [x] **S4-P3.2** (@Neo): Door crushing and generators with caps (S4-5; M7).

## Phase 4 — Presentation
- [x] **S4-P4.1** (@Neo): Viewport silhouettes, HP indicators, messages, sound cues, automap rule (S4-6; M8).
- [x] **S4-P4.2** (@Trin/@Smith): Real-browser scenario for both sources with state-correlated pixels (S4-6; M9).

## Phase 5 — Acceptance and close
- [ ] **S4-P5.1** (@Trin/@Morpheus): Evidence map, serial aggregate/lint/type/build; trace reported honestly.
- [ ] **S4-P5.2** (@Smith): End-to-end user approval.
- [ ] **S4-P5.3** (@Oracle/@all/@Cypher/@Mouse): Groom docs, archive chat, retros, backlog, local launch, close.

## Completed Milestones

- **Sprint 4 (2026-11-11):** 27-type catalog, Amiga creature parsing, deterministic hunting AI/groups, two-way combat with kill credit and drops, door crushing, generator engine, viewport/HUD/automap presentation; serial 370/370, lint/types/build, two-source actual-browser gate; Smith approved. Disclosed: placeholder art, approximate stats, direct ranged strikes, no shipped generators. No commit/push/release.

- **Sprint 3 (2026-11-10):** progression, combat, projectiles, rune magic, potions and 320x200 UX delivered locally; serial 72/72 + aggregate 339/339, two-source browser10, Smith and Morpheus A1-A12 approval; trace audit unavailable (not passed). No commit/push/release.
- **Sprint 2 catalog follow-up (`sprint-2-catalog`, 2026-11-06):** 535 measured records, 39 verified roles, 496 honest unknowns, searchable G inspector, usage-specific masks/crops, 268 aggregate tests/build and independent actual-browser/artifact gates passed.
- **Sprint 2 lighting/export follow-ups (2026-11-03):** deterministic raw sprite export plus parametric indexed/RGBA lighting, strict source/provenance checks, native PNG review, and actual-browser lighting evidence delivered locally.
- **Sprint 2 (2026-11-03):** champions, physical inventory/chests/scrolls, survival, throws, equipment effects, Vi Altars, pointer/sound feedback, and final corrective acceptance delivered locally.
- **Sprint 1 (2026-11-02):** pure 6 Hz engine, Amiga data decoders, 320x200 rendering/HUD/automap, Purist/QoL input, and Paula audio launched.

## Backlog After Sprint 4

- **Sprint 4 retro follow-ups:** original monster art/sprites and facing/cell decoding; Amiga generator actuator parsing; dodgeable monster projectiles via the shared projectile engine; simulate off-level monsters (or time-skip on arrival); monster/champion balance pass against evidence; trace-audit flags (stop piping `bobp make`, avoid bare `npx vitest`).
- **Carried from Sprint 3:** P1 tooling honesty (explicit trace status, serial final-gate target now present), P2 seam contracts, P3 process items.

## Backlog After Sprint 3

- **Sprint 3 retro follow-ups (accepted 2026-11-10; details `agents/cypher.docs/Sprint3_Retro_Backlog_Summary_2026-11-10T23-30.md`):**
  - P1 tooling honesty: repair trace audit, explicit passed/failed/unavailable trace status, serial final-gate target, deterministic browser clock and artifact manifest.
  - P2 seam contracts before Sprint 4 AI: central interaction policy and typed validation results, typed travel/view coordinates, identity/projection sentinels, state-to-pixel contracts, modular source adapters.
  - P3 process: seam-sized phases and readiness gates, flow metrics, handoff envelope, close-evidence index.
- Sprint 2 tooling follow-up: repair trace-audit `jinja2`, stop masking trace failures, serialize shared log writers, and improve long-scroll pagination.
- Sprite/campaign follow-up: evidence-backed classification/editor, then separately a runtime campaign-pack loader.
- **Sprint 4 (delivered locally; see milestones):** residual items listed above.
- **Sprint 5:** complete 14-level DM1 polish, Firestaff/Lord Chaos endings, saves, and file-picker DAT import.
- **Sprint 6:** Chaos Strikes Back champion import, Prison, Corbums, and Ful Ya.
- **Sprints 7-8:** Dungeon Master II outdoor/weather, shops/coins, commandable minions, and campaign.
