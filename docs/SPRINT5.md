# Sprint 5 — Saves, File Import, Ending, Campaign Integrity (Contract + Architecture)

Tier-1 sprint; Cypher stories, Morpheus architecture and Mouse plan share this document. Roadmap text "complete 14-level polish" is bounded below to what can be evidenced.

## Goal
A player can bring their own Dungeon Master files, play, save, quit, resume, and reach a victory ending, with the whole 14-level campaign audited for integrity. Out of scope: original monster art, Amiga generator parsing, dodgeable monster projectiles, Chaos Strikes Back import (Sprint 6), Firestaff fuse puzzle scripting.

## Stories and acceptance criteria

### S5-1 — Save and resume
1. `serializeSave(state)` produces a versioned JSON envelope (`format`, `version`, `campaignId`, `savedAtTick`, FNV checksum, `state`). `deserializeSave(text, campaignId)` returns `{ok:true,state}` or `{ok:false,reason}`; corrupt JSON, wrong format/version, checksum mismatch, wrong campaign, or missing core fields are rejected without throwing.
2. Round trip is exact: deserialize(serialize(s)) deep-equals s for fresh, mid-fight (monsters, projectiles, RNG) and recruited states, and continuing 200 ticks from the loaded state equals continuing from the original.
3. UI: SAVE and LOAD controls reachable by mouse (and F5/F9 as QoL keys only in QoL mode), one browser slot in `localStorage`, plus Export (download JSON) and Import (pick a save file). Every outcome (saved, no save, corrupt, wrong campaign) is shown in the message log. Storage failure never crashes.

### S5-2 — Bring your own files
1. Pure `importCampaignFiles({dungeon, graphics})` validates and parses user-picked `Dungeon.dat` (required) and `graphics.dat` (optional), returning assets with `source` provenance or a specific error (`NOT_DUNGEON_DAT`, `PARSE_FAILED`, `GRAPHICS_PARSE_FAILED`, `EMPTY`). A bad file never replaces working assets.
2. UI: an IMPORT FILES panel with two file pickers and a status line; success restarts the game on the imported campaign, and the sprite catalog/soundboard rebind to the new graphics.
3. Imported bytes stay in memory only; nothing is uploaded or persisted by the app.

### S5-3 — Victory ending
1. Killing a Lord Chaos monster (type 23) sets `victory` once, logs the ending text, and halts monsters and AI.
2. Victory screen is a distinct full-viewport state (not the game-over screen) with the party summary; click or Enter restarts. Game-over behaviour is unchanged.
3. Saves preserve `victory`.

### S5-4 — Campaign integrity (14 levels)
1. The real `Dungeon.dat` parses to 14 levels. Audit asserts: start tile walkable; every level has at least one stairs tile; DOWN stairs on level n have an UP stairs tile on level n+1 within the bounds; every monster group and item sits on an in-bounds non-wall tile; deterministic parse.
2. Findings are reported honestly; violations proven to be parser faults are fixed, data oddities are documented, not hidden.

### S5-5 — Evidence
1. Headless tests for S5-1..4; actual-browser gate (clean-room and Amiga sources): save/load round trip through the real buttons, corrupt-save message, file-import with the real Amiga files, and victory screen reached by killing a Lord Chaos review monster. Zero uncaught errors.

## Architecture (Morpheus)
- **N1 Save codec is pure** in `src/engine/save.ts`; no DOM. State is already plain data, so the codec is validation + checksum, not custom mapping. Version constant `SAVE_VERSION=1`; future migrations hook at `deserializeSave`.
- **N2 Persistence adapter** `src/ui/saveStore.ts` wraps localStorage/download/upload behind try/catch and returns result objects; the UI never touches storage directly.
- **N3 Import is pure** in `src/data/importFiles.ts` (bytes in, assets or typed error out); the DOM panel only reads files into `Uint8Array`.
- **N4 App restart seam**: `startDungeonMasterApp` gains `loadSave(state)` and the bootstrap gains `restartWithAssets(assets)`; the canvas, input and audio rebind once.
- **N5 Victory** is a `GameState.victory` flag set in the tick pipeline when a Lord Chaos kill event is reaped; `stepMonsters` early-exits; renderer branches before the viewport.
- **N6 UI placement** reuses the existing DOM overlay-button pattern (SPRITES [G], SFX BOARD [B]); canvas Purist layout is not changed.

## Plan (Mouse) — see root `task.md`
1. Save codec + persistence/UI. 2. Import validation + panel/restart. 3. Victory. 4. Campaign audit + browser gate. 5. Close.

## Delivered outcome and honest deviations (2026-11-11)
Delivered locally: pure versioned/checksummed save codec with exact round-trip and resumed-determinism tests; localStorage slot adapter with typed failures; DOM game menu (SAVE, LOAD, EXPORT, OPEN SAVE, IMPORT FILES) with an aria-live status mirrored into the message log; F5/F9 only in QoL mode; pure `importCampaignFiles` with typed errors and a local-only statement in the panel; restart-on-import seam; `victory` state on Lord Chaos defeat with a distinct screen and halted AI; real 14-level audit (14 levels, walkable start, stairs on every level, every DOWN stair has an aligned UP partner, monsters/items in bounds).

Defect found and fixed during the browser gate: the first menu placement covered the message log. The canvas now keeps its integer scale when the letterbox below it has ≥ 40px, otherwise it scales down one step to leave a menu strip (a 960×600 window drops from 3× to 2×).

Deviations and limits:
1. **Ending**: victory triggers on killing Lord Chaos (type 23) only; the Firestaff fuse/ending script is not implemented.
2. **"14-level polish"** was bounded to the integrity audit; no art, balance, or per-level content polish was done. The audit found no violations, so no parser fix was needed.
3. **Saves** are one browser slot plus exported files; there is no version migration yet (only `version 1`), and the saved game does not embed the DAT files, so loading requires the same campaign id.
4. **Import** requires `Dungeon.dat`; `graphics.dat` is optional (generated art otherwise). Imported files are held in memory only, so a page reload returns to the default assets. Importing does not accept the zipped disk images.
5. Sprint 4 limits are unchanged (placeholder monster art, approximate stats, direct ranged strikes, no shipped generators, only the party level simulated).
