# Sprint 3 P5.1 Final Architecture and Compatibility Review

## Verdict

**APPROVED.** All 38 accepted Sprint 3 criteria have independent evidence, A1-A12 remain conformant with ADR-014, the final bounded stabilization restores Sprint 1/2 compatibility without scope growth, and the user-authorized serialized verification establishes a green final source state. P5.1 may checkpoint after Mouse updates the sole board; Smith must still complete P5.2's final actual-user journey before Sprint 3 closes.

## A1-A12 Conformance

- **A1-A2:** `dispatchCommand` and `stepSingleTick` remain the sole command/clock authorities. VIA finds one `nextRandom` definition in `engine/rng.ts`; only combat, magic, and recruitment import it. Invalid paths retain zero-draw evidence and eligible actions retain fixed budgets.
- **A3-A5:** immutable XP remains the sole rank truth; combat/magic/projectile success hands XP to `awardSkillExperience`; catalog definitions remain separate from pure progression, combat, magic, effects, and RNG engines. Validation precedes cost/RNG/effect/XP commit.
- **A6-A7:** one typed projectile path still owns item, ammunition, and spell movement/impact. The stabilization changes only viewer projection of travel-relative lanes; it does not alter projectile state, order, collision, payload, ownership, landing, or passive non-AI targets.
- **A8-A9:** cooldown/effect expiry remains absolute-tick derived state, and brewing remains a selected same-ID atomic flask transaction with exact preserve/destroy/replace semantics.
- **A10:** one interaction owner and documented priority remain intact. Inventory no-ops now return the exact input object and preserve focus; only accepted inventory transitions perform their established ownership change and close interaction.
- **A11-A12:** canonical layout, bars/messages, lane/depth/facing geometry, item 13/14 distinction, clean-room labels/art, and source-guarded Amiga labels/glyphs/damage presentation remain separated. Render consumes engine state; no engine module imports render.

## Final Stabilization Review

The initial P5.1 aggregate correctly exposed two real compatibility regressions: five inventory no-op identity failures and one approaching-projectile lane-mirroring failure. After the User authorized one Oracle-bounded stabilization:

- the inventory wrapper now returns `state` when `applyInventoryCommand` returns the same object, while accepted transitions retain interaction cleanup;
- `projectileMarkerRect` reverses travel-relative lane sign only for opposite/approaching travel, preserving receding placement, depth/size, lateral projection, clipping, impacts, and payload behavior;
- independent matrices cover every inventory-domain no-op branch plus accepted cleanup, and all four facings × two depths × two travel directions × two lanes;
- no unrelated product, campaign/save, monster-AI, dependency, CI, deployment, environment, commit, or push scope entered the diff.

## Acceptance and Infrastructure Evidence

- Criterion matrix: **38/38 pass**, covering S3-1.1 through S3-6.5 with independent evidence rather than test totals alone.
- Stabilization focused gate: **35/35**.
- User-authorized serialized six-file diagnostic: **6/6 files, 72/72 tests**.
- Full serialized aggregate: **50/50 files, 339/339 tests**.
- ESLint and strict TypeScript passed; standalone typecheck passed; production build passed with 49 modules.
- Fresh browser report passes 10 named checks across `CLEAN_ROOM` and `AMIGA_GRAPHICS_DAT`, including 16 geometry cases per source, with `failures: []` and `browserErrors: []`.
- `test-serial` changes only Vitest file/worker concurrency using `--no-file-parallelism --minWorkers=1 --maxWorkers=1`. It does not set a timeout; `vite.config.ts` remains unchanged, so the existing 5-second per-test deadline is retained. Tests, fixtures, expectations, dependencies, CI, and deployment were not weakened.
- No unchanged suite was rerun by Morpheus.

## Honest Chronology

- Phase 2 duplicate-ID explosion, Phase 3 party-Shield, and Phase 4 focus/validator/pointer defects retain their recorded failures and fixes.
- Phase 4's automatic loop stopped after fix 2; the User and Oracle explicitly bounded fix 3 to the formula preview, followed by fresh Trin/Morpheus/Smith approval.
- P5.1 first failed 6/333 on real compatibility defects. The bounded stabilization fixed those roots and passed focused evidence.
- The next parallel aggregate passed 324/339 and failed 15 unrelated tests at the common 5-second deadline. Oracle diagnosed worker contention; the User separately authorized a serialized target, not a timeout increase. The six affected files then passed 72/72 and the full source passed 339/339.
- `judge-trace` was invoked once. Its Make target exits zero because it is masked with `|| true`, but the underlying command reports no Claude project transcript directory in this Codex workspace. It is **unavailable, not passed**; historic `jinja2`/masking repair remains tooling backlog rather than Sprint 3 evidence.

## Handoff

@Smith perform P5.2's final actual 320×200 user journey across progression, combat, projectiles, runes/formula, spells, brewing/drinking, Purist mouse, QoL keyboard, both source modes, resource/status feedback, geometry, and recovery. Any blocker stops and escalates; no further automatic stabilization is authorized. @Mouse may checkpoint P5.1 on the sole root board before releasing only P5.2.
