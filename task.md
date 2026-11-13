Sprint 9 task board; sole active task list for `sprint-9`.

# Sprint 10 — Tech Debt

Contract and architecture: `docs/SPRINT10.md` (S10-1..3; A1-A4). Behaviour-preserving only. Chain per phase: Neo -> Trin -> Morpheus. No commit/push unless the user asks.

## Phase 1 — Lint gate
- [x] **S10-P1.1** (@Neo): Fix 32 duplicate imports, 13 array-type, 2 prefer-for-of, 1 interface->type, 1 dynamic delete; enable those rules and `noUnusedLocals/Parameters` (S10-1).

## Phase 2 — Dead code
- [x] **S10-P2.1** (@Neo): Delete `CleanRoomCampaignProvider`, `monsterHasTrait`, `extractItemIcon`, `lightRgba` and their tests (S10-2; A4).

## Phase 3 — Simplify
- [x] **S10-P3.1** (@Neo): Data-driven flanking-wall helper in `viewportPainter.ts` (S10-3).

## Phase 4 — Gate and close
- [x] **S10-P4.1** (@Trin/@Morpheus): lint, serial tests, build, Sprint 3-8 browser gates, screenshots.
- [x] **S10-P4.2** (@Oracle/@all/@Cypher/@Mouse): groom, retros, backlog, close.

## Completed Milestones

- **Sprint 10 (2026-11-12):** tech debt: stricter enforced lint (5 rules + unused locals/params), four dead symbols and their tests removed, flanking-wall duplication collapsed, flaky Sprint 5 gate fixed; serial 434/434, lint/types/build, Sprint 3-8 browser checks. Backlog: 762 `!`, complexity hotspots, file splits, IndependentUat merge. No commit/push/release.

- **Sprint 9 (2026-11-12):** original DM1 monster art for 25 of 27 types on the original-data source (confidence-gated map, depth scale/lighting/transparency), placeholders kept for clean-room and unclear groups, `make dm1-sheet`; serial 435/435, lint/types/build, Sprint 3-8 browser checks; Smith approved. Not built: side/back/attack views, animation, exact original sizes. No commit/push/release.

- **Sprint 8 (2026-11-11):** independent DM2 GDAT reader: exact container arithmetic, 10,045-record directory, text/creature names (every DUNGEON.DAT creature id named), 3,011 images decoded with 0 failures, honest import recognition, `make dm2-sheet`; serial 424/424, lint/types/build, Sprint 3-8 browser checks; Smith approved. Not built: DM2 gameplay, colour/palette, creature stats, party. No commit/push/release.

- **Sprint 7 (2026-11-11):** CRC-verified Amiga LZX extractor (35/35 DM2 entries), DM2 findings report, content-derived campaign ids and unrecognized-campaign import; serial 412/412, lint/types/build, Sprint 3-7 browser checks; Smith approved. Not built: DM2 outdoor/weather, shops/coins, minions (formats/rules undecoded). No commit/push/release.

- **Sprint 6 (2026-11-11):** versioned checksummed champion roster export/import placed on Hall mirrors (clean-room and real Amiga Hall), Resurrect keeps skills/gear; serial 399/399, lint/types/build, Sprint 3-6 browser gates; Smith approved. Deferred: Prison, Corbums, Ful Ya (no CSB data in repo). No commit/push/release.

- **Sprint 5 (2026-11-11):** versioned checksummed saves (slot/export/open), local-only Dungeon.dat/graphics.dat import, Lord Chaos victory, real 14-level audit; serial 388/388, lint/types/build, two-source browser gate; Smith approved. Disclosed: Firestaff script missing, one save version/slot, imports not persisted, polish bounded to audit. No commit/push/release.

- **Sprint 4 (2026-11-11):** 27-type catalog, Amiga creature parsing, deterministic hunting AI/groups, two-way combat with kill credit and drops, door crushing, generator engine, viewport/HUD/automap presentation; serial 370/370, lint/types/build, two-source actual-browser gate; Smith approved. Disclosed: placeholder art, approximate stats, direct ranged strikes, no shipped generators. No commit/push/release.

- **Sprint 3 (2026-11-10):** progression, combat, projectiles, rune magic, potions and 320x200 UX delivered locally; serial 72/72 + aggregate 339/339, two-source browser10, Smith and Morpheus A1-A12 approval; trace audit unavailable (not passed). No commit/push/release.
- **Sprint 2 catalog follow-up (`sprint-2-catalog`, 2026-11-06):** 535 measured records, 39 verified roles, 496 honest unknowns, searchable G inspector, usage-specific masks/crops, 268 aggregate tests/build and independent actual-browser/artifact gates passed.
- **Sprint 2 lighting/export follow-ups (2026-11-03):** deterministic raw sprite export plus parametric indexed/RGBA lighting, strict source/provenance checks, native PNG review, and actual-browser lighting evidence delivered locally.
- **Sprint 2 (2026-11-03):** champions, physical inventory/chests/scrolls, survival, throws, equipment effects, Vi Altars, pointer/sound feedback, and final corrective acceptance delivered locally.
- **Sprint 1 (2026-11-02):** pure 6 Hz engine, Amiga data decoders, 320x200 rendering/HUD/automap, Purist/QoL input, and Paula audio launched.

## Backlog After Sprint 9

- **Sprint 9 retro follow-ups:** use side/back/attack views and facing; identify Materializer (509-512) and Water Elemental (513-514) with independent evidence; exact per-distance creature sizes; z-ordering for four monsters per tile; monster attack animation; fix flaky wall-clock assumptions in browser gates by pausing the loop for snapshots.

## Backlog After Sprint 8

- **Sprint 8 retro follow-ups:** identify the DM2 palette (entry 244 and scene palettes were not it) and how overlay planes composite; decode DM2 sounds/music (class 2/3 entries); find creature stats/AI and tile-type semantics (not in decoded data; likely in the executable); find party/champion data; clear the license of the reference repo before borrowing any code; stop piping `bobp make`.

## Backlog After Sprint 7

- **Sprint 7 retro follow-ups:** decode DM2 `GRAPHICS.DAT` (AGA) container; determine DM2 tile semantics (teleporter/pit-heavy maps, outdoor tiles) and creature table (ids up to 85); locate DM2 party/champion definitions (not in `DUNGEON.DAT`); only then plan outdoor/weather, shops/coins, minions; port the extractor to TypeScript if browser-side import of the zip is wanted; stop piping `bobp make`.

## Backlog After Sprint 6

- **Sprint 6 retro follow-ups:** supply CSB data/spec before any Prison/Corbums/Ful Ya work; optionally carry vitals/potion power/container contents; roster import for non-Hall levels; mirror portraits in clean-room; shared `message-length` lint for log lines; stop piping `bobp make`.

## Backlog After Sprint 5

- **Sprint 5 retro follow-ups:** Firestaff ending script; save migrations and multiple slots; persist imported files (IndexedDB, opt-in); import from zipped disk images; game-menu keyboard focus order and narrow-window layout; stop piping `bobp make` (trace flags).

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
- **Sprint 5 (delivered locally; see milestones):** residual items listed above.
- **Sprint 6 (delivered locally as generic champion carry-over; CSB items deferred, see milestones).**
- **Sprints 7-8:** Sprint 7 delivered DM2 extraction/findings only; DM2 outdoor/weather, shops/coins, commandable minions and campaign remain, gated on decoding (see backlog).
