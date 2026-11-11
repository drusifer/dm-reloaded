# Sprint 3 Phase 3 Architecture Review — Rejection 1

## Verdict

**REJECTED with one bounded correction.** Rune ordering/editing, deterministic magic transactions, spell projectiles, Light, potion brewing/consumption, flask identity, XP, and absolute expiry align with S3-P3.1/P3.2 and A2-A5/A8-A10. The Shield implementation does not yet satisfy the accepted party-effect and derived-state boundary.

## Blocking Finding

`applySpell(..., 'SHIELD', ...)` stores one `SHIELD` effect only on the caster. No pure engine function derives an effective shield/mitigation value from active effects; VIA finds no Shield derivation symbol. This conflicts with:

- `docs/SPRINT3.md` S3-5.1, which requires party shielding;
- `docs/SPRINT3_ARCHITECTURE.md` A8, which requires effects to derive effective Strength, Shield, and Light while preserving base state;
- the Phase 3 task boundary, which owns headless Shield mechanics before Phase 4 presentation.

## Required Fix

1. On successful Shield casting, apply or replace the timed `SHIELD` effect for every living party champion, retaining the caster as `sourceChampionId`.
2. Add one pure derived engine query for a champion's current shield/mitigation magnitude from active `SHIELD` effects; do not add a second mutable shield field or Phase 4 UI.
3. Add focused coverage proving multi-champion application, unchanged base champion attributes, absolute expiry for every affected champion, inactive events, and a zero derived value after expiry.
4. Re-run only the failing/new Shield cases, then the bounded Phase 3 compatibility set and lint/types because production code changes.

## Accepted Evidence and Chronology

- Neo focused9/9, bounded76/76, lint/types/diff-check passed before QA.
- Trin's first independent run was 7/8 solely because the Light fixture used an already saturated scene.
- QA moved that assertion to a dark, zero-torch scene; no production change or fix cycle occurred.
- Corrected independent8/8 and bounded99/99 passed. This fixture chronology remains valid and must not be relabeled as the Shield production fix.
- `judge-trace` remains unavailable in this Codex workspace and is not claimed as a pass.

