# Sprint 10 — Tech Debt (Tier 2: story + architecture combined)

## Goal
Reduce design debt without changing behaviour: let lint tools find the issues, remove dead code, simplify duplicated/over-nested code, prune tests that only protect removed code.

## Evidence (measured 2026-11-12, baseline lint/tsc green, 435 tests)
| Finding | Tool | Count |
|---|---|---|
| Unused locals / params | `tsc --noUnusedLocals --noUnusedParameters` | 0 |
| Duplicate imports from one module | eslint `no-duplicate-imports` | 32 |
| `T[]` vs `Array<T>` style drift, `prefer-for-of`, `interface` vs `type`, dynamic delete | typescript-eslint stylistic/strict | 13 / 2 / 1 / 1 |
| Non-null assertions `!` | typescript-eslint strict | 762 (deferred, see below) |
| Over-long functions (>120 lines), complexity >15, depth >4 | eslint core | 20 / 45 / 27 |
| Exports with no production consumer | script (`node` regex scan) | 1 class, 4 functions |
| Duplicated 8-line block | token scan | `viewportPainter.ts` left/right wall cube (7 lines x2) |

## Stories
- **S10-1 Lint gate that finds these issues.** `bobp make lint` enforces the zero-finding rules (`no-duplicate-imports`, `array-type`, `prefer-for-of`, `consistent-type-definitions`, `no-dynamic-delete`) and `tsc` runs with `noUnusedLocals/Parameters`. AC: findings fixed, gate stays green.
- **S10-2 Remove dead code.** Delete production code with no production consumer (`CleanRoomCampaignProvider`, `monsterHasTrait`, `extractItemIcon`, `lightRgba`) and the tests that exist only for it. AC: no behaviour change; every deleted test is named with its reason.
- **S10-3 Simplify duplicated design.** Collapse the mirrored left/right flanking-wall code in `viewportPainter.ts` into one data-driven helper. AC: pixel output identical (existing render tests + Sprint 2-9 browser gates).

## Architecture decisions
- A1: Behaviour-preserving only. No engine/format changes; saves and exports stay compatible.
- A2: Rules are enabled only at zero violations after fixes, so the gate is real rather than advisory. `no-non-null-assertion` (762), `complexity`, `max-lines-per-function` are NOT enabled: fixing them wholesale is a rewrite, not tech debt cleanup. They go to the backlog with counts.
- A3: Tests are removed only with direct evidence (they test deleted code or duplicate an assertion made elsewhere). No coverage provider is installed (`@vitest/coverage-v8` absent) and installing packages was not authorised, so "useless" is judged by inspection, not coverage.
- A4: A helper that exists only to be tested is dead code: delete it and its tests together.

## Out of scope
Splitting `simulation.ts` / `dungeonDatParser.ts` / `viewportPainter.ts` by module; removing the 762 `!`; new dependencies (knip/jscpd).

## Outcome (2026-11-12)
- S10-1 done: 6 remaining findings fixed after `--fix` (type-only `import type` kept separate by design); `noUnusedLocals/Parameters` on, which immediately caught two imports orphaned by the dead-code removal.
- S10-2 done: four dead symbols and the legacy-extractor test removed; the `lightRgba` assertions were trimmed from two lighting tests (the RGB/palette paths they also cover remain).
- S10-3 done: `paintFlankingWall` + `FLANK_CUBES` table replace the two mirrored blocks; screenshots of the Amiga (original cubes) and clean-room (fallback trapezoids) corridors match expectations.
- Deviation: the Sprint 5 browser gate failed ~1 in 3 before any fix landed in it; cause was comparing the whole `party` (live mana/food) after a refused load. Fixed to compare placement; 0 failures in 8 runs. Not a regression from this sprint.
- Not done (backlog): 762 non-null assertions; 45 functions over complexity 15; splitting `simulation.ts` (911), `dungeonDatParser.ts` (966), `viewportPainter.ts` (~1074); `*IndependentUat` test files overlap their unit twins and could be merged; no coverage provider or dead-code tool (`knip`) because installing packages was not authorised.
- No pixel-for-pixel before/after diff of the viewport refactor was taken (the pre-edit file was uncommitted); verification is the render tests plus screenshots.

## Addendum: test runtime dependencies captured in the Makefile
Requested after close. Previously Playwright was pinned in six recipes and fetched on demand, Chromium/python3/extracted Amiga data were implicit, and real-data tests skipped silently.
- `PLAYWRIGHT_VERSION` pinned once; `deps` (npm, stamp-based), `browser-deps` (pinned Chromium, stamp per version), `data-deps` (extract DM1/DM2 when zips are present, prints what is missing), `check-deps` (read-only report), `gates` (lint, serial tests, build, Sprint 3-8 browser gates).
- Test/lint/build targets depend on `deps` (+ `data-deps` for tests); every browser gate depends on `browser-deps` + `data-deps`.
- Correction: all packages are now declared in `package.json`: `@playwright/test` (exact `1.64.1`) and `vite-node` (`^3.2.4`, used by `dm1-sheet`/`dm2-sheet`) were added as devDependencies, so the Makefile no longer pins or downloads anything with `npm exec --yes`. Only the Chromium binary (`make browser-deps`) and local Amiga data sit outside npm.
