# Sprint 3 Phase 2 Fix Cycle 1 Summary

## Defect

Independent UAT created duplicate combat-target records with the same target ID. Explosion collection correctly reported unique IDs, but `damageTarget` mutated and emitted damage for every record sharing that ID.

## Correction

- First-seen target identity is canonical and stable.
- `damageTarget` now applies and emits at most once for a requested target ID.
- Explosion collection now preserves first-seen order while filtering duplicate IDs before damage calculation.
- Production regression coverage includes duplicate center records plus an adjacent unique target.
- No projectile geometry, adjacent damage, item landing, ownership, or non-explosion behavior changed.

## Evidence

- Previously failing independent Phase 2 suite: 8/8 passed.
- Production + independent + legacy projectile compatibility: 41/41 passed.
- ESLint and strict TypeScript: passed.
- Bounded source/test `git diff --check`: passed.

This was the first Phase 2 fix cycle. No Phase 3/UI/task-board/commit/push/deploy work was performed.
