Consolidated index of project-wide decisions, historical context, and key milestones maintained by Oracle.

TLDR:
    Goal: Provide rapid project context and decision history for all BobProtocol personas on entry.
    Status: Sprint 2 gameplay and sprite export delivered; parametric lighting implemented and QA/architecture/Tank approved. Final artifact/close status is in task.md; historical milestones retained below.
    Action: Consult task.md and current persona state for gate status; review the lessons before changes.

# Project Memory

This file serves as a consolidated index of project-wide decisions, historical context, and key milestones. It is maintained by the Oracle and reviewed by all agents to ensure consistency.

## Project Context
- **Project Name:** `dungeon-master` (`dm-reloaded` — Amiga *Dungeon Master* Trilogy)
- **Repository:** `git@github.com:drusifer/dm-reloaded.git` (`main`, clean-room only; `.gitignore` excludes all `.zip/.adf/.ipf/.lzx/.dat` and `public/assets/extracted/`)
- **Start Date:** 2026-11-01
- **Key Objectives:** Full and complete web-based TypeScript/Canvas/WebAudio implementation of FTL Games' Amiga *Dungeon Master* series (*Dungeon Master* $\rightarrow$ *Chaos Strikes Back* $\rightarrow$ *Dungeon Master II: Skullkeep*), featuring extracted 1988 Amiga `.DAT` assets + built-in `CleanRoomProvider` fallback, faithful 1988 Purist rules by default, and toggleable QoL options.

## Milestones
- **2026-11-02 — Sprint 1 Complete (`sprint-1`)**: Delivered OFS/8104 `Dungeon.dat` (14 levels, 24 Champions) & `graphics.dat` (535 sprites, 33 Paula PCM sounds, `item[557]` font, `item[562]` light ramps) decoders, pure 6 Hz `SimulationReducer`, `320×200` `Framebuffer` + `ViewportPainter`/`HudPainter`/`AutomapPainter`, `InputController`, `PaulaStereoAudio`, and `dist/` Vite bundle.
- **2026-11-02 — Post-Sprint-1 Perspective, Door & Paula Soundboard Polish**:
  - Wired exact FTL `item[558]` 8-byte viewport blitter coordinates (`76` ceiling, `75` floor, `85/84` `D0L/D0R`, `86..89` 3-face wall cubes, `78..80` 3D stone doorjambs, `82..83` lintels, `108..119` 4-material vertical & horizontal double-doors, `301` bashed door mask, `315` door push-button).
  - Fixed `Dungeon.dat` `0x08` corridor passage bit on `DOOR` & `STAIRS` tiles (`158/158` interior doors verified across all 14 levels).
  - Built interactive Paula 8-Bit SFX Soundboard (`src/ui/soundboard.ts`, `SFX BOARD [B]`) with `5500 Hz` `SND2` waveforms, custom labels, live cue remapping (`WALL_BUMP: 565` `"OOF!"`, `FOOTSTEP: null` silent default), and JSON export (`32/32` Vitest tests green).

## Major Decisions
| Date | ID | Decision | Rationale | Consequences |
|------|----|----------|-----------|--------------|
| 2026-11-01 | PDR-001 | Phased Amiga Trilogy (DM1 $\rightarrow$ CSB $\rightarrow$ DM2) | Complete series fidelity with manageable vertical milestones | Shared engine supports character export/import & multi-campaign data |
| 2026-11-01 | ADR-001 | Pure Headless 6 Hz TS Engine (`src/engine/`) + Vite/Vitest | Fast deterministic TDD without DOM coupling | All simulation actions return `{ state, events }` |
| 2026-11-01 | ADR-002 | Canonical `320×200` Logical Canvas (`224×136` 3D viewport) | Authentic 1988 Amiga OCS proportions & crisp integer pixels | All pointer hitboxes operate in `320×200` space (`LAYOUT_RECTS`) |
| 2026-11-01 | ADR-003 | Dual-Mode `CampaignProvider` (`CleanRoomProvider` + `DungeonDatParser`) | Out-of-the-box legal playability + genuine 1988 `.DAT` fidelity | Engine consumes normalized `CampaignBundle` |
| 2026-11-01 | ADR-004 | Purist Default + Toggleable QoL + Auto WebAudio Unlock | Balances 1988 authenticity with browser HCI best practices | `SettingsState` gates `QWEASD` & automap; `x=272..319` utility pills |
| 2026-11-01 | ADR-005 | Local Amiga `.zip`/`.adf` Asset Extraction (`scripts/extract_assets.py`) | Unpacks user-provided original DM1 & DM2 disks without committing copyrighted binaries | Gitignored `public/assets/extracted/` holds unpacked `.dat` & `.LZX` |
| 2026-11-02 | ADR-006 | Empirically Verified FTL Item Catalog (`item[556]`, `42..48`, `559`) | Exact 199 item names, 224 `16×16` icons, and 180 6-byte descriptors + clean-room fallback | Zero guesswork across all `DB5..DB10` world & starting items |
| 2026-11-02 | ADR-007 | Normalized `ItemInstance` Entity Map & Persistent `handItem` | Items move seamlessly across floor, alcoves, paperdoll, chests, cursor, and projectiles | Serializable `GameState.items` prevents duplication/loss |
| 2026-11-02 | ADR-008 | Modular 6 Hz `inventory.ts`, `projectiles.ts` & `survival.ts` Engines | Keeps headless simulation SOLID and independently unit-testable | Clean seam for Sprint 3 spells & combat |

## Repository Structure Memory
- `agents/`: Persona-specific documentation, `CHAT.md`, `lessons.md` (`Lessons 001..004`), `memory.md`, and `state.md` working memory.
- `docs/`: Global documentation (`PRD.md`, `USER_STORIES.md`, `ARCH.md`, `DECISIONS.md`).
- `task.md`: Single source of truth for the current sprint task board and Sprints 2–8 backlog (maintained by Mouse).
- `scripts/extract_assets.py`: Amiga OFS `.adf` + `0x8104` + DM2 split `.LZX` asset extractor.
- `src/`: TypeScript application split into `engine/`, `data/`, `render/`, `audio/`, `input/`, `ui/` (`soundboard.ts`), and `main.ts`.
- `tests/`: Headless Vitest unit, UAT, and vertical-slice integration suites (Sprint 1 baseline: `32/32` across 8 suites; current checks are recorded per sprint).


## Sprint 2 Delivery Preparation — 2026-11-03

Implemented physical inventory and nested chest weight, world items/throws, survival/torches/bones/Vi Altars, semantic new-painter sprites, measured paperdoll/chest coordinates, input/cursor lifecycle, five synthesized cue defaults, contact sheet and browser visual/interaction automation. Phase 2 passed independent QA, architecture and live PNG review after one combined fix cycle. Final Phase 3/load QA, architecture and Smith end-to-end gates passed: 177 aggregate tests + 2 additional independent QA tests, lint/strict TypeScript, production build and 27 live Chromium checks with zero browser exceptions. Final accepted-story corrections and retrospective complete; delivered locally, with no deployment claim.

README now documents actual input controls and limits. See `docs/ARCH.md` section 7 and `docs/DECISIONS.md` ADR-009 clarification for partial adapter migration and art limitations; ARCH section8 now records the offline exporter, while the runtime truecolor loader remains future scope. The separate trace audit could not run because its Python environment lacks jinja2; product test passes do not replace audit evidence.

Final accepted-story completion and local launch: see [Sprint2 close summary](../cypher.docs/Sprint2_Close_Summary_2026-11-03T14-08.md) and [corrective acceptance archive](../chat_archive/CHAT_sprint-2-acceptance.md). No deployment.


## Asset Export Follow-Up — `sprint-2-assets` (2026-11-03)

Implemented ADR-009's local one-PNG-per-raw-sprite tool through `bobp make export-sprites` and independent `export-sprites-review`. Raw sprites preserve4-bit indices, brightest original16-color palette, index0alpha0 and deterministic manifest metadata. Sparse labels remain explicit; no runtime asset/mask/lighting migration. Generated original art stays ignored under build; writer owns validated paths only, preserves sentinels/source and avoids recursive arbitrary cleanup.

ADR-011 records the source-fidelity lesson: existing runtime parser partial/default behavior cannot be exporter success. Every real CLI source must contain complete palette562; arbitrary-count pure fixtures carry explicit palettes. Independent review checks unusedPLTE/tRNS entries as well as every native-decoded pixel, and invalidates failed-run success evidence with bounded evidence-path writes.

Final post-guard evidence:31affected tests18:17:20, lint/types18:17:39, native535sprites/1,690,768pixels/sourceunchanged/errors[]18:18:07. Earlier226aggregate/build predate the last guard and are not claimed fresh. Trin/Morpheus/Tank approved implementation; Oracle grooming hands off Smith final artifact approval, then retro/local close. No commit/push/deployment inferred. See docs/SPRINT_ASSET_EXPORT.md, docs/ARCH.md section8 and ADR-011; root task.md remains the sole task board.


## Parametric Lighting Follow-Up — `sprint-2-lighting` (2026-11-03)

ADR-012 implements ADR-009's bounded lighting step: one immutable validated RGB transform, shared indexed and pure RGBA adapters, brightest-source derived depth palettes and explicit procedural palette use. Exactly16dense source colors are required at the adapter boundary. Source masks/alpha, geometry, fullbright UI/cursor and gameplay effective-light/torch rules remain unchanged. Raw exports and their original palette policy remain independent; no runtime truecolor loader, new emissive classification or dependency ships.

Final stable evidence:250tests/37files plus lint/types19:18:17, build19:18:59; actual original/fallback Chromium26cases/98checks/errors[]19:17:04 under ignored build/lighting-review. Added independent side-projector markers distinguish absent/unlit/double-lit output. Old29interaction evidence was not rerun. QA/Morpheus/Tank approvals complete; Smith actual PNG final gate and local close remain root-owned. See docs/SPRINT_LIGHTING.md LT1–5 evidence, ARCH lighting section and ADR-012. Combat remains Sprint3; no remote publication/deployment implied. Trace audit unavailable remains explicit.


## Sprint 3 Delivery Preparation — 2026-11-09

Delivered locally: 16-subskill progression, item-driven combat, typed projectiles and bounded explosions, 24-rune magic, five potion families and mouse-complete 320×200 original/clean-room UX. Honest correction chronology: Phase2 explosion deduplication; Phase3 party Shield; Phase4 fix1/fix2 plus user-authorized presentation-only fix3; final inventory no-op identity and reverse-travel projectile projection stabilization. Final evidence passed38/38 criteria,35/35 focused,72/72 serialized diagnostic,339/339 aggregate, lint/types/build and fresh10/10 browser scenarios per source with16 geometry cases/source. Parallel aggregate resource contention led to a separately authorized one-worker serial target retaining the5s timeout. Judge trace unavailable because no Claude project directory existed. No commit/push/release/deploy claimed; retros and Cypher local launch still precede sprint chat reporting.
