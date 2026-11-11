# Sprint 3 Phase 2 Independent UAT — Failure 1

## Verdict

FAIL. Phase 2 returns to Neo for one bounded production correction.

## Passing Independent Coverage

Seven of eight QA-owned cases passed:

- invalid-target and insufficient-stamina rejections preserve RNG, party, targets, costs, cooldowns, and progression apart from explicit feedback;
- successful melee consumes exactly two draws and assigns stamina, cooldown, damage, and XP to the acting champion;
- ranged ammunition transfers from the correct quiver/lane and awards impact XP to its owner;
- passive review targets do not move, attack, or mutate over six ticks;
- all four facings and both lanes hit only the selected lane with one impact;
- item, ammunition, and spell payloads retain distinct landing/ownership behavior;
- walls, closed doors, pits, teleporters, and exhaustion follow the specified spatial paths.

## Blocking Defect

`tests/engine/combatProjectilesIndependentUat.test.ts` fails the unique explosion target-ID contract.

- Expected damage event IDs: `['duplicate', 'adjacent']`.
- Actual damage event IDs: `['duplicate', 'duplicate', 'adjacent']`.
- Root cause from review: explosion collection deduplicates records with a `Map`, but one `damageTarget(state, 'duplicate', ...)` call maps over and damages every state record carrying that ID, emitting multiple `DAMAGE_APPLIED` events.
- Required correction: enforce one damage application/event per unique target ID for one explosion impact, while retaining the unique `EXPLOSION_RESOLVED.targetIds` list.

Evidence: targeted independent suite 7 passed / 1 failed. No aggregate, lint, judge-trace, task-board completion, or production fix was attempted after the hard failure.
