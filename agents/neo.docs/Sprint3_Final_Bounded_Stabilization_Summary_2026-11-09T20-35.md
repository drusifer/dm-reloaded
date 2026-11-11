# Sprint 3 Final Bounded Stabilization Summary

## Authorization and Scope

The user authorized one final stabilization after Oracle consultation for exactly two P5.1 roots: inventory no-op referential identity and approaching-projectile lane projection. No task-board, engine projectile, inventory-rule, input-priority, or unrelated presentation work was performed.

## Reproduction

The exact six independently reported failures were reproduced before source changes:

- Five inventory no-ops returned deep-equal clones rather than the original `GameState`: missing champion equip, invalid backpack index, empty-hand consume, empty floor quadrant, and wall-tile pickup/drop.
- One approaching LEFT projectile rendered viewer-left rather than viewer-right.

New focused matrices also failed red before the correction: audited no-op identity, rejected-versus-accepted interaction cleanup, and four facings × two depths × two travel directions × two lanes.

## Corrections

- `dispatchCommand` now checks `inv.state === state`. A no-op returns the exact input object and preserves its interaction; an actual inventory transition retains the established interaction-close behavior.
- `projectileMarkerRect` now reverses the travel-relative lane sign only when projectile direction is opposite the party facing. Same-direction/receding placement and the established size, depth, lateral, clipping, payload, and impact paths remain unchanged.

## Evidence

- Exact six-failure reproduction: 6 failed as expected.
- Focused new matrices before fix: 3 failed as expected.
- Complete affected inventory and independent projection suites after fix: 32/32 passed.
- Adjacent bounded simulation, cursor/load, throws, Sprint 2/3 input, and render compatibility: 62/62 passed.
- `bobp make lint`: ESLint and strict TypeScript passed.
- `bobp make build`: production Vite build passed.
- `git diff --check`: passed.

## Handoff

Trin should rerun the original six cases first, then the user-authorized fresh aggregate and only after it is green continue the remaining final acceptance gates. Any new defect stops; no further automatic stabilization cycle is authorized.
