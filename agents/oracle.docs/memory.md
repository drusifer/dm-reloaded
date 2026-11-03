Consolidated index of project-wide decisions, historical context, and key milestones maintained by Oracle.

TLDR:
    Goal: Provide rapid project context and decision history for all BobProtocol personas on entry.
    Status: Sprint 2 implementation, grooming and final QA/architecture/live browser gates complete; retrospective recorded; delivered locally. Sprint 1 history retained below.
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
- `tests/`: Headless Vitest unit, UAT, and vertical-slice integration suites (`32/32` passing across 8 suites).


## Sprint 2 Delivery Preparation — 2026-11-03

Implemented physical inventory and nested chest weight, world items/throws, survival/torches/bones/Vi Altars, semantic new-painter sprites, measured paperdoll/chest coordinates, input/cursor lifecycle, five synthesized cue defaults, contact sheet and browser visual/interaction automation. Phase 2 passed independent QA, architecture and live PNG review after one combined fix cycle. Final Phase 3/load QA, architecture and Smith end-to-end gates passed: 177 aggregate tests + 2 additional independent QA tests, lint/strict TypeScript, production build and 27 live Chromium checks with zero browser exceptions. Final accepted-story corrections and retrospective complete; delivered locally, with no deployment claim.

README now documents actual input controls and limits. See `docs/ARCH.md` section 7 and `docs/DECISIONS.md` ADR-009 clarification for partial adapter migration, art limitations and future exporter/filter/loader work. The separate trace audit could not run because its Python environment lacks jinja2; product test passes do not replace audit evidence.

Final accepted-story completion and local launch: see [Sprint2 close summary](../cypher.docs/Sprint2_Close_Summary_2026-11-03T14-08.md) and [corrective acceptance archive](../chat_archive/CHAT_sprint-2-acceptance.md). No deployment.
