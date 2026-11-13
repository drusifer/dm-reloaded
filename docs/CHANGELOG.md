# Change Log

## 2026-11-12 — Tech debt (`sprint-10`)

- No gameplay change. Lint now also enforces no duplicate imports, `T[]` array style, `for-of`, `interface` declarations and no dynamic delete; TypeScript rejects unused locals and parameters.
- Removed dead code and its tests: `CleanRoomCampaignProvider`/`CampaignProvider`, `monsterHasTrait`, `extractItemIcon`, `lightRgba` (435 -> 434 tests).
- `viewportPainter` flanking walls: ~100 mirrored lines became one data-driven `paintFlankingWall`.
- The Sprint 5 browser check no longer fails intermittently (it compared live vitals; it now compares placement).

Validation: serial `434/434`, lint/types/build, Sprint 3-8 browser checks, screenshots reviewed on both sources. Local delivery; no deployment.

## 2026-11-12 — Original monster art (`sprint-9`)

- With your own DM1 `graphics.dat`, 25 of 27 monster types now appear with their original artwork (depth-scaled, depth-lit, transparent background); the labelled placeholder remains for the clean-room source and for two unclear groups.
- Added a confidence-gated sprite map with evidence tests and `bobp make dm1-sheet` review sheets.
- The Sprint 3 browser check no longer fails on live mana regeneration (it now asserts a rejected cast never spends mana).

Validation: serial `435/435`, lint/types/build, Sprint 3-8 browser checks. Local delivery; no deployment.

## 2026-11-11 — DM2 GDAT reader (`sprint-8`)

- Added a TypeScript reader for DM2's `GRAPHICS.DAT` ("GDAT"): verified container arithmetic, directory, text decoding, creature names, and all 3,011 distinct images as indexed pixels.
- Import now recognizes the DM2 graphics file honestly (generated art kept, "ART NOT USED YET"); added `bobp make dm2-sheet` grayscale contact sheets for review.
- No DM2 gameplay, colour, creature stats or party were built; the format source repository is unlicensed so only format facts were used.

Validation: serial `424/424`, lint/types/build, Sprint 3-8 browser checks. Local delivery; no deployment.

## 2026-11-11 — DM2 data enablement (`sprint-7`)

- Added a CRC-verified Amiga LZX extractor (`bobp make extract-dm2`) that extracts all 35 entries of the DM2 archive and refuses any entry whose CRC does not match.
- Added `docs/DM2_DATA.md` with inventory and header findings, and a test that pins them.
- Imported non-DM1 `Dungeon.dat` files now get their own campaign id, an "unrecognized, no party" message, and cannot load DM1 saves.
- No DM2 gameplay (outdoor/weather, shops, minions) was built: its rules and formats are not decoded.

Validation: serial `412/412`, lint/types/build, Sprint 3-7 browser checks. Local delivery; no deployment.

## 2026-11-11 — Champion carry-over (`sprint-6`)

- Added versioned, checksummed roster export of living champions (stats, skill ranks, gear) and a validated import that places them on the Hall mirrors, recruited with the normal Resurrect/Reincarnate choice.
- Every export/import outcome is shown in the menu status and message log, naming replaced champions and what was left behind.
- Chaos Strikes Back content (Prison, Corbums, Ful Ya) was deliberately not built: no CSB data exists in the repo.

Validation: serial `399/399`, lint/types/build and the Sprint 3-6 two-source browser gates passed. Local delivery; no deployment.

## 2026-11-11 — Saves, file import, victory (`sprint-5`)

- Added versioned, checksummed saves (browser slot, export, open-file) with typed failure messages, plus F5/F9 in QoL mode.
- Added an in-browser import panel for your own `Dungeon.dat` and optional `graphics.dat` (local only, never uploaded).
- Added a Lord Chaos victory ending with its own screen, and a real 14-level campaign integrity audit.
- Menu strip keeps controls off the message log; the canvas may step down one integer scale in tight windows.

Validation: serial `388/388`, lint/types/build, two-source actual-browser gate (10 checks). Local delivery; no deployment. Limits: one save version/slot, Firestaff script not implemented, imported files not persisted.

## 2026-11-11 — Monster ecology (`sprint-4`)

- Added the 27-type monster catalog, Amiga creature parsing, deterministic hunting AI with subcell groups, melee/ranged strikes, kill credit, drops, non-material rules, door crushing and a tested generator engine.
- Added viewport silhouettes (labelled placeholder art), HP pips, HUD injury flash, visible-only automap markers, new sound cues and `bobp make sprint4-visual-review`.
- Party movement is now blocked by live monsters; a hit wakes a sleeping party.

Validation: serial `370/370`, lint/types/build and two-source actual-browser gate passed. Local delivery; no commit, push or deployment. Disclosed limits: approximate stats, placeholder art, no shipped generators, only the party level simulates.

## 2026-11-03 — Parametric dungeon lighting (`sprint-2-lighting`)

- Replaced historical dark-ramp selection with one validated color filter configured in `src/render/lighting.json`; brightness curve, depth falloff, tint and desaturation share a pure RGB formula.
- Preserved source masks, alpha, gameplay and full-bright UI; added an equivalent pure RGBA helper for future artwork use.
- Added focused and independent rendering regressions plus `bobp make visual-review ARGS=--lighting` with separate evidence and original/fallback coverage.

Validation: all250tests, lint/types and production build passed. Actual Chromium review passed26scenes/98measured checks with both art sources and no browser errors. Local delivery; no deployment. Runtime PNG loading, semantic classification and campaign packs remain future work.

## 2026-11-03 — Asset export (`sprint-2-assets`)

- Added `bobp make export-sprites`: indexed PNG per decoded original sprite, deterministic manifest, original palette and raw index-0 transparency.
- Added safe owned-output reruns, actionable input errors and strict original palette validation.
- Added `bobp make export-sprites-review`: independent Chromium decoding and palette/alpha/hash checks; verified 535 sprites and 1,690,768 pixels with unchanged source.
- Documented actual automation and export limits in README and SDLC. Runtime artwork loading, lighting and campaign packs remain future work.

Validation: final 31 affected tests, lint/types and native PNG review passed. Earlier 226-test aggregate and production build passed before the final isolated offline palette guard; see sprint acceptance evidence for exact boundaries. Local delivery only; no deployment.
