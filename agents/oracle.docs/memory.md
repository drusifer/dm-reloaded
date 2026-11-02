Consolidated index of project-wide decisions, historical context, and key milestones maintained by Oracle.

TLDR:
    Goal: Provide rapid project context and decision history for all BobProtocol personas on entry.
    Status: Sprint 1 + Post-Launch Perspective/Door/Soundboard Polish completed on 2026-11-02 (32/32 Vitest tests green; published to git@github.com:drusifer/dm-reloaded.git).
    Action: Consult memory.md and lessons.md (Lessons 001..004) before Sprint 2 planning or architectural changes.

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

## Repository Structure Memory
- `agents/`: Persona-specific documentation, `CHAT.md`, `lessons.md` (`Lessons 001..004`), `memory.md`, and `state.md` working memory.
- `docs/`: Global documentation (`PRD.md`, `USER_STORIES.md`, `ARCH.md`, `DECISIONS.md`).
- `task.md`: Single source of truth for the current sprint task board and Sprints 2–8 backlog (maintained by Mouse).
- `scripts/extract_assets.py`: Amiga OFS `.adf` + `0x8104` + DM2 split `.LZX` asset extractor.
- `src/`: TypeScript application split into `engine/`, `data/`, `render/`, `audio/`, `input/`, `ui/` (`soundboard.ts`), and `main.ts`.
- `tests/`: Headless Vitest unit, UAT, and vertical-slice integration suites (`32/32` passing across 8 suites).
