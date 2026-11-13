# Sprint 6 — Champion Carry-Over (Roster Hall) (Contract + Architecture)

Tier-1 sprint; Cypher stories, Morpheus architecture and Mouse plan share this document.

## Scoping decision (honest)
The roadmap line reads "Chaos Strikes Back champion import, Prison, Corbums, and Ful Ya". The repository holds only the Dungeon Master I and II disk images; there is **no Chaos Strikes Back data, rules text, or evidence** here for the Prison layout, Corbum creatures, or the Ful Ya rune effect, and inventing them would present guesses as original content. Sprint 6 therefore delivers the evidence-independent core of that line: **champion carry-over between games** (the mechanic CSB's import is about), through the existing Hall-of-Champions mirror flow. Prison, Corbums and Ful Ya stay on the backlog, gated on supplying CSB data or specifications. Nothing in this sprint claims to reproduce CSB.

## Goal
A player can export their surviving party (stats, trained skills, carried gear) to a file and, in a new game, have those champions appear in the Hall of Champions mirrors, recruited with the existing Resurrect (keeps skills) or Reincarnate (resets skills) choice.

## Stories and acceptance criteria

### S6-1 — Roster export
1. `exportRoster(state)` produces a versioned, checksummed `dm-reloaded-roster` envelope of every **living** champion: identity, vitals maxima, attributes, 16 skill ranks derived from experience, and carried gear as catalog (category, subtype, charges) specs. Dead champions, bones, and container contents are excluded and the export says how many were left behind.
2. With no living champion the export is refused with a visible message.

### S6-2 — Roster import validation
1. `parseRoster(text)` returns `{ok:true,champions}` or `{ok:false,reason,text}` and never throws. It rejects empty/non-JSON/wrong format/wrong version/checksum mismatch/zero or more than 8 champions, and any champion with out-of-range numbers, wrong skill-array length/range, over-long strings, or unknown gear specs.
2. Imported ids are re-namespaced (`roster_<n>_<slug>`) so they can never collide with or overwrite a campaign champion.

### S6-3 — Roster Hall placement and recruiting
1. `IMPORT_ROSTER` (pure command) adds the champions to the catalog and re-points the first N champion mirrors on the party's current level (reading order) to them; mirrors beyond N keep their original champions. If the level has no mirror the import is refused with a message.
2. Imported champions are recruited through the normal mirror: Resurrect keeps exported skill ranks, attributes and gear; Reincarnate resets skills with the existing bonus rules. Recruiting removes the mirror as usual; nothing duplicates items or champions.
3. Importing twice does not re-place a champion already recruited from that roster (idempotent by roster id) and never exceeds the 4-champion party limit.
4. Works for both the clean-room Hall and the real Amiga Hall (24 mirrors).

### S6-4 — Controls and evidence
1. EXPORT ROSTER and IMPORT ROSTER sit in the existing game menu; every outcome appears in the status line and the message log; the Victory screen mentions roster export.
2. Headless tests for S6-1..3 incl. real Amiga Hall; actual-browser gate (both sources): play a champion to gain XP, export, reload fresh, import, see the new name on the mirror, recruit with Resurrect, verify skills/gear, plus invalid-file refusal. Zero uncaught errors.

## Architecture (Morpheus)
- **R1** Pure `src/engine/roster.ts` (export/parse/apply); no DOM. Roster entries are plain `ChampionDefinition` data so the recruit path (`buildRecruitedChampion`, `grantStartingGear`) is reused unchanged.
- **R2** One new reducer command `IMPORT_ROSTER {champions}`; validation happens before dispatch (`parseRoster`), the reducer re-checks bounds defensively.
- **R3** Skill ranks come from `rankForExperience`; carried gear specs from `ITEM_CATALOG_180[defId]` (category/subtype) with charges. Gear count is capped at 30 per champion.
- **R4** Mirror re-pointing edits only `wallFeatures[].championId/portraitIndex` on the current level; the original catalog entries remain.
- **R5** UI reuses `gameMenu` and `saveStore`-style adapters; no new persistence.

## Plan (Mouse) — see root `task.md`
1. Roster codec. 2. Command + Hall placement. 3. Menu/UI. 4. Browser gate. 5. Close.

## Delivered outcome and honest deviations (2026-11-11)
Delivered locally: pure `exportRoster`/`parseRoster`/`applyRosterImport` (versioned `dm-reloaded-roster`, FNV checksum, strict bounds, content-derived `roster_<slug>_<hash>` ids so re-import is idempotent and cannot overwrite campaign champions); `IMPORT_ROSTER` reducer command; Hall mirror re-pointing that names every replaced champion; EXPORT ROSTER / IMPORT ROSTER controls with visible status and log lines; victory-screen hint; headless tests including the real 24-mirror Amiga Hall; two-source browser gate (8 checks).

Defects found by screenshot review and fixed before approval: the mirror modal listed `GEAR: NONE` for imported veterans (display names now come from the gear specs), and long roster messages were truncated by the message log (all roster lines are now ≤ 46 characters, split across lines).

Deviations and limits:
1. **No Chaos Strikes Back content**: Prison layout, Corbums and Ful Ya are NOT implemented; they need CSB data or a specification that is not in the repo. The "CSB champion import" item is delivered only as generic champion carry-over; it does not read CSB or DM1 save files.
2. **Carried state** is stats, 16 skill ranks and gear specs. Not carried: current health/stamina/mana (recruits start full), bones, container contents, brewed-potion power, item identity and cursed/poisoned flags, party formation, and anything about the dungeon.
3. Import re-points mirrors on the party's *current level* only, replaces original champions (named in the log), and does nothing on levels without mirrors.
4. Clean-room mirror portraits render as black boxes (pre-existing; not changed).
5. Sprint 4/5 limits unchanged.
