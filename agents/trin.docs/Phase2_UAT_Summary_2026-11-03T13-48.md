# Sprint 2 Phase 2 QA

## Verdict
Functional QA PASS after one focused correction cycle. Morpheus review and mandatory Smith live PNG gate remain required.

## Scope and evidence
- Reviewed Tasks 2.0–2.2 against root task.md, Oracle Lesson 005 and ADR-009. New item/inventory/wall-feature art requests semantic SpriteSource keys; pre-existing raw-index painters remain intentionally unmigrated.
- Neo's initial full `bobp make test` passed 106 tests including ESLint/TypeScript, and production build passed (13:45).
- Added `tests/render/phase2IndependentUat.test.ts`: four facing/front-half quadrant cases passed immediately; three cases reproduced defects in sleep/inventory composition, approaching projectile lane orientation and floor items over a closed wooden door.
- Neo fixed those three defects and the parent's independently found scroll ink/bounds defect. After changes, targeted inventory, independent QA and world rendering suites passed 15/15 (13:47:16). Reviewed fixes and reused that unchanged targeted pass instead of repeating it.
- Ran `bobp make lint` after final source/test changes: PASS (13:47:33).
- Inventory tests verify every authored slot frame against locally decoded original sprite borders, all equipment/backpack/chest slots, sprite icon cropping, chest/scroll panel swapping and black scroll ink confined to measured parchment.
- World tests cover shrinking depths0..3, solid-wall occlusion, wall alcove contents, airborne height, held item and sleep state. Independent tests verify all four world-facing quadrant rotations and hidden rear half at depth0.

## Trace limitation
Required `bobp make judge-trace DATE=2026-11-03` was attempted. Underlying `bobp trace-annotate` failed with `ModuleNotFoundError: No module named 'jinja2'`. Makefile masks this with `|| true`; its exit0 is not an audit pass. No trace verdict is claimed. No unrelated dependency changes made.

## Remaining gates
Parent owns Morpheus code review, Smith actual live screenshots and root task-board updates. Browser-run screenshot evidence exists in build/visual-review; QA does not substitute unit-test results for Smith approval.
