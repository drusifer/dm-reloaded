Sprint 3 task board; sole active task list for `sprint-3`.

TLDR:
    Goal: Deliver deterministic usage progression, player combat, 24-rune magic, potions, and a mouse-complete 320x200 experience on the existing pure engine.
    Status: P5.2 final actual-browser user journey approved (11/12 tasks, 92%); no UX blocker remains after the fresh clean-room and Amiga evidence.
    Next: P5.3 is ready for Oracle grooming, seven domain retrospectives, Cypher local launch, and Mouse board close, in that order.

# Sprint 3 — Combat, Runic Magic, and Progression

- Product contract: [docs/SPRINT3.md](docs/SPRINT3.md), S3-1 through S3-6.
- Architecture: [docs/SPRINT3_ARCHITECTURE.md](docs/SPRINT3_ARCHITECTURE.md), A1 through A12.
- Plan gate: Morpheus approved the five-phase dependency order and evidence gates on 2026-11-06. P5.1 passed Trin and Morpheus with 38/38 criteria and A1-A12 accepted; Smith approved the fresh two-source P5.2 final user journey, releasing only the ordered P5.3 close chain.
- Root `task.md` is the only active task board. Do not create secondary task lists.
- All implementation phases use tests first and the chain Neo -> Trin independent QA -> Morpheus review. Smith is mandatory where actual user-visible behavior exists.
- Run project automation serially through `bobp make`; never overlap shared `build/build.out` writers. Do not rerun unchanged suites.
- Sprint 4 monster AI and Sprint 5 campaign/save work are out of scope. No new runtime dependency, service, environment variable, CI, deployment, automatic commit, or push is authorized; therefore no Tank planning gate applies.
- Anti-loop: after two failed fix cycles, stop, consult Oracle, preserve logs, and request user guidance before any third attempt.

## Phase 1 — Deterministic progression foundation

Chain: Neo -> Trin independent QA -> Morpheus review. Internal engine work; Smith defers until the progression surface exists in Phase 4.

- [x] **S3-P1.1** (@Neo): TDD the single integer RNG transition and 16-track per-champion progression authority: ordered ranks, monotonic thresholds, depth multiplier, exact-one rank event, no XP for blocked/failed/inspection actions, and fixed draw budgets. Preserve base attributes separately. (S3-1.1..5; A1-A4)
- [x] **S3-P1.2** (@Neo): Materialize source ranks for Resurrect and reset progression for Reincarnate; integrate progression commands/events through the sole reducer/tick without a second mutable rank truth. Prove deterministic migration and existing Sprint 2 recruitment compatibility. (S3-1.1..6; A1-A5)

## Phase 2 — Combat actions and shared projectiles

Chain: Neo -> Trin independent QA -> Morpheus review. Headless rules and bounded review targets only; user-facing panels remain Phase 4.

- [x] **S3-P2.1** (@Neo): TDD immutable combat definitions and atomic action transactions for valid held equipment: formation/reach/lane, stamina/ammunition/charge, cooldowns, deterministic hit/damage, explicit rejection codes, successful-effect XP, and passive bounded targets with no Sprint 4 AI. (S3-2.1..7; A2-A5,A7-A8)
- [x] **S3-P2.2** (@Neo): Generalize the existing physical projectile engine to typed item/ammunition/spell payloads while preserving free throws, ownership, landing, pits, teleporters, doors, stable order, exactly-once impacts, unique explosion targets, and later kill-credit attribution. Verify all four facings and both lanes headlessly. (S3-2.4..7,S3-3.1..6; A4,A6-A8)

## Phase 3 — Rune magic, potions, and timed effects

Chain: Neo -> Trin independent QA -> Morpheus review. Pure rules/catalogs first; visual and input presentation remain Phase 4.

- [x] **S3-P3.1** (@Neo): TDD the 24-rune ordered catalog, formula editing commands, mana/skill gates, None-to-Neophyte `Lo Ful Ir` threshold, deterministic success/fizzle/backfire, spell projectiles/doors/light/shield, fixed costs, and correct Priest/Wizard XP. (S3-4.1..7,S3-5.1..2,S3-5.6..7; A2-A5,A8,A10)
- [x] **S3-P3.2** (@Neo): TDD five required powered potions (Vi, Ya, Ee, Ku, Bro), selected-flask reachability, exact invalid/insufficient/fizzle/backfire/success outcomes, same-ID atomic transformation, single consumption, poison/attribute/effect expiry, and no duplication or stale ownership. (S3-5.1,S3-5.3..7; A4-A5,A8-A9)

## Phase 4 — Playable 320x200 combat and magic UX

Chain: Neo -> Trin independent QA -> Morpheus review -> mandatory Smith actual-browser UX gate. Phase 5 cannot start until Smith explicitly approves.

- [x] **S3-P4.1** (@Neo): TDD the single interaction-mode owner plus shared layout/input rectangles for action, rune, and progression panels. Provide complete Purist mouse flows, optional QoL shortcuts only when enabled, Escape/recovery behavior, disabled reasons, and lifecycle cleanup on inventory/sleep/mirror/death/restart without input leakage or stale overlays. (S3-1.4,S3-2.1..3,S3-2.6,S3-4.1..7,S3-6.1..4; A10-A11)
- [x] **S3-P4.2** (@Neo): Render source-guarded original/fallback action labels, 24 rune glyphs, damage/rank/status feedback, and near/far projectile/impact geometry in all facings/lanes. Preserve champion bars/messages, original item 13/14 distinction, raw export/catalog/lighting behavior, and clean-room provenance. (S3-2.5..6,S3-3.4..5,S3-4.1,S3-5.2,S3-6.1..5; A6,A11-A12)
- [x] **S3-P4.3** (@Trin/@Smith): Independently exercise the bounded review scenario in a real browser for original and clean-room sources: mouse-only and QoL paths, every shipped action/spell/potion, success and failure recovery, all four facings/two lanes/near-far cases, focus restoration, known draw markers, state assertions, captures, and zero uncaught errors. Unit screenshots or nonblack pixels alone are insufficient. (S3-2..6; A10-A12)

## Phase 5 — Full acceptance, documentation, and local close

Chain: Trin final audit -> Morpheus architecture review -> Smith end-to-end approval -> Oracle groom -> all-persona retrospective -> Cypher local launch -> Mouse board close. Any defect returns only to its failing phase.

- [x] **S3-P5.1** (@Trin/@Morpheus): Map every accepted criterion to independent evidence; verify determinism, ownership, exact costs, no duplication, no invalid-action XP, existing Sprint 1/2 compatibility, and honest chronology. Once source is stable, run one final serial affected/aggregate/lint/type/build set through available `bobp make` targets; report the known `jinja2` trace audit unavailable if still unresolved. (S3-1..6; A1-A12)
- [x] **S3-P5.2** (@Smith): Perform the final actual 320x200 user journey across progression, combat, projectiles, runes, spells, brewing/drinking, Purist mouse, QoL keyboard, original/fallback sources, visible resource/status feedback, and recovery paths. Explicit approve or route a reproducible defect through Trin. (S3-1..6; A10-A12)
- [ ] **S3-P5.3** (@Oracle/@all/@Cypher/@Mouse): Groom README/ARCH/DECISIONS/SDLC and evidence without duplicating the board; archive/report sprint chat, run seven domain retrospectives, add accepted follow-ups to backlog, announce local completion, and close this board. No commit, push, release, or deployment is implied. (Definition of Done)

## Completed Milestones

- **Sprint 2 catalog follow-up (`sprint-2-catalog`, 2026-11-06):** 535 measured records, 39 verified roles, 496 honest unknowns, searchable G inspector, usage-specific masks/crops, 268 aggregate tests/build and independent actual-browser/artifact gates passed.
- **Sprint 2 lighting/export follow-ups (2026-11-03):** deterministic raw sprite export plus parametric indexed/RGBA lighting, strict source/provenance checks, native PNG review, and actual-browser lighting evidence delivered locally.
- **Sprint 2 (2026-11-03):** champions, physical inventory/chests/scrolls, survival, throws, equipment effects, Vi Altars, pointer/sound feedback, and final corrective acceptance delivered locally.
- **Sprint 1 (2026-11-02):** pure 6 Hz engine, Amiga data decoders, 320x200 rendering/HUD/automap, Purist/QoL input, and Paula audio launched.

## Backlog After Sprint 3

- Sprint 2 tooling follow-up: repair trace-audit `jinja2`, stop masking trace failures, serialize shared log writers, and improve long-scroll pagination.
- Sprite/campaign follow-up: evidence-backed classification/editor, then separately a runtime campaign-pack loader.
- **Sprint 4:** 27 DM1 monster types, group AI/formations, scent/pathfinding, crushing doors, and generators.
- **Sprint 5:** complete 14-level DM1 polish, Firestaff/Lord Chaos endings, saves, and file-picker DAT import.
- **Sprint 6:** Chaos Strikes Back champion import, Prison, Corbums, and Ful Ya.
- **Sprints 7-8:** Dungeon Master II outdoor/weather, shops/coins, commandable minions, and campaign.
