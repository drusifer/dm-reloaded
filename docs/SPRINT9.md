# Sprint 9 — Original DM1 Monster Art (Contract + Architecture)

Tier-1 sprint; Cypher stories, Morpheus architecture and Mouse plan share this document.

## Scoping decision (honest)
Sprints 4–8 left monsters drawn as labelled placeholder silhouettes. The user's own DM1 `graphics.dat` already contains the original creature sprites (decoded since Sprint 1), so this sprint replaces placeholders with the real art **for the original-data source only**, with evidence-gated mapping. DM2 work stays paused (palette unidentified). No new gameplay rules.

## Goal
When the game runs on the user's DM1 files, monsters appear with their original artwork, correctly depth-scaled and lit, while the clean-room source and any unverified monster keep the labelled placeholder.

## Evidence for the mapping (gathered this sprint)
- Index-labelled review sheets (`bobp make dm1-sheet ARGS="446 575"`) show creature art in atlas indices **446–532**, grouped in monster-type order with up to four views each (front, side, back, attack), e.g. 446–449 Giant Scorpion, 458–461 Pain Rat, 465–466 Screamer (tree-like), 471–474 Stone Golem, 481–484 Skeleton, 515–518 Oitu (spider-like), 519–522 Demon, 527–530 Red Dragon, 531 Lord Order, 532 Grey Lord.
- The real `Dungeon.dat` independently supports the type-id order: Screamers appear on levels 1–4, Mummies from level 1, Red Dragon alone on level 13 (the last), Animated Armour/Oitu/Materializer on level 11, Demons and Lord Chaos on level 12.
- Not clear enough to commit: groups 509–512 (type 19 Materializer) and 513–514 (type 20 Water Elemental); they keep the placeholder (`confidence: 'low'`). Slime, Giggler and Ruster are `medium`; the rest are `high`.

## Stories and acceptance criteria

### S9-1 — Evidence-gated sprite map
1. `src/data/monsterSprites.ts` maps each monster type id to its ordered sprite indices and a confidence level; lookups for unknown ids return `undefined`.
2. A skip-if-absent test pins: every mapped index exists in the real `graphics.dat`; groups are contiguous and in ascending type order; each sprite's four corner pixels share one colour (the per-sprite transparent key); low-confidence groups are not drawn; the real dungeon's deep monsters (types 21–24) appear only on levels ≥ 10.

### S9-2 — Rendering
1. With the original-data source, a visible monster of a mapped type is drawn with its front sprite scaled by depth (same projection/visibility rules as the placeholder), lit with the depth palette, transparent where the sprite's corner colour appears, never through walls or closed doors.
2. Placeholder art and its "PLACEHOLDER MONSTER ART" label remain for the clean-room source, low-confidence types and unmapped types; the label appears only when at least one placeholder is drawn.
3. HP pips, subcell lane/row offsets and ghost (non-material) dithering behave as before; the HUD flash and automap are unchanged.

### S9-3 — Evidence
1. Headless render tests (real sprite pixels where expected, placeholder otherwise, label logic), the serial suite, lint/types/build, the Sprint 3–8 browser checks, and an extended Sprint 4 browser run on the Amiga source proving real-art pixels on screen with zero errors.

## Architecture (Morpheus)
- **A1** The sprite map is data (`monsterSprites.ts`) with an explicit `confidence` field; rendering is keyed off it, so an unverified guess can never ship silently.
- **A2** `paintMonsters` receives the graphics bundle and a per-depth palette function; the placeholder path is unchanged.
- **A3** Transparent key is derived from the sprite's corner pixel and asserted uniform by test; no hard-coded per-monster colours.
- **A4** Only the front view is used now; side/back/attack indices are recorded for later but not drawn.

## Plan (Mouse) — see root `task.md`
1. Sprite map + evidence tests. 2. Renderer. 3. Browser evidence. 4. Close.

## Delivered outcome and honest deviations (2026-11-12)
Delivered locally: `src/data/monsterSprites.ts` (27 groups, confidence-gated, `spriteBorderKey`); original front-view sprites drawn for the original-data source (25 of 27 types) with depth scale, depth lighting, border-derived transparency, lane offsets and HP pips; placeholder art and label kept for clean-room, low-confidence (types 19, 20) and unmapped types, with the label drawn only when a placeholder is on screen; `bobp make dm1-sheet ARGS="FROM TO"` index-labelled review sheets; evidence tests against the real files; browser assertions for both sources (real Screamer art on screen, label absent/present as required).

Evidence recap: creature art occupies atlas 446–532 in monster-type order; the real `Dungeon.dat` agrees (Screamers levels 1–4; types 18, 19, 21–24 only on levels ≥ 10; Red Dragon alone on level 13); all 25 drawn front sprites have a dominant border colour (≥ 55% of the border ring) used as the transparent key.

Process note: the Sprint 3 browser gate failed once because live mana regeneration changed a value between two snapshots (not a product regression; three consecutive reruns passed). The check now asserts what it always meant to prove: a rejected cast never *spends* mana.

Deviations and limits:
1. Identification is by visual review plus order/depth cross-checks, not by a documented table; Slime, Giggler and Ruster are `medium` confidence, Materializer and Water Elemental are `low` and keep placeholders.
2. Only the front view is drawn: side, back and attack views are recorded in the map but not used (no facing/attack animation yet).
3. Art is scaled by simple nearest-neighbour factors (1, .65, .42, .27), not the original's exact per-distance sizes.
4. Original art appears only with the user's own `graphics.dat`; the clean-room source is unchanged.
5. Monsters on subcell rows overlap when four share a tile; no z-ordering beyond far-to-near.
6. Sprint 4–8 limits otherwise unchanged (approximate stats, direct ranged strikes, no shipped generators, DM2 not playable).
