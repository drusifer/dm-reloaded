# Sprint 3 Final Stabilization Exception Consultation

## Authorization and Scope

The user explicitly authorized one final bounded stabilization cycle on 2026-11-09 for exactly the two P5.1 root causes reported by Trin. This is not authorization to repair unrelated findings or weaken acceptance criteria.

Trin's final audit mapped all 38 accepted criteria, then the one-shot aggregate failed 6/333 tests. Oracle confirms both failures are compatibility regressions with narrow, independently testable roots.

## Root Cause 1 — Inventory No-Op Identity

`applyInventoryCommand` correctly returns the original `GameState` object for rejected/no-op inventory commands. The `dispatchCommand` inventory wrapper then unconditionally clones that result solely to write `interaction: NONE`, even when interaction was already `NONE` and no domain change occurred.

Safe correction:

- Preserve and return the exact original object when the inventory reducer returns the input object.
- Clear interaction only on an actual accepted inventory transition that requires the existing lifecycle behavior.
- Do not change inventory validation, events, cursor/hand ownership, item movement, slots, floor rules, or interaction priority.

Acceptance invariants:

1. The five audited no-ops retain referential identity: missing champion equip, invalid backpack slot, empty-hand consume, empty floor quadrant, and wall-tile pickup/drop.
2. Accepted inventory commands still perform exactly one ownership transition and preserve current interaction-close semantics.
3. Rejected commands emit no new events and do not alter RNG, items, cursor, party, messages, or interaction.
4. Existing Phase 4 cursor/inventory/mirror/interaction priority remains unchanged.

## Root Cause 2 — Approaching Projectile Lane Projection

`projectileMarkerRect` uses `projectile.lane` as a viewer-relative sign without considering projectile travel direction. Lane is projectile-relative world semantics: when a projectile travels toward the viewer, its LEFT is seen on the viewer's right. The current renderer therefore mirrors approaching projectiles incorrectly.

Safe correction:

- Derive the screen-horizontal lane sign from projectile direction relative to party facing (or equivalently project the projectile's lane basis onto the viewer's right basis).
- Reverse LEFT/RIGHT screen placement for opposite/approaching travel while retaining ordinary outbound placement.
- Do not change projectile engine state, lane ownership, movement, collisions, impacts, payloads, range, size/depth scaling, or off-screen visibility rules.

Acceptance invariants:

1. Approaching LEFT renders viewer-right and approaching RIGHT renders viewer-left.
2. Outbound LEFT/RIGHT retain their established viewer-relative placement.
3. All four party facings, both lanes, and representative near/far depths are independently pinned.
4. Lateral tile displacement, depth/size, clipping, impact markers, source provenance, and item/ammunition/spell payload behavior remain unchanged.

## Required Gate Chronology

Neo may change only the inventory dispatch wrapper and projectile presentation transform plus focused regression tests. Trin must first rerun the six failing cases, then one fresh aggregate; only a green aggregate unlocks the previously skipped lint, typecheck, build, two-source Chromium, and trace-availability steps. Morpheus must confirm the corrections preserve A6, A10, and A11 boundaries. Any unrelated production defect stops and returns to the user; this exception does not authorize another open-ended cycle.

No ADR amendment is needed: the corrections restore Sprint 1/2 compatibility and conform implementation to existing ADR-014/A6/A10/A11 rather than changing architecture.
