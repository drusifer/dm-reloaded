# Sprint 3 Phase 1 Implementation Summary

## Scope

Implemented `S3-P1.1` and `S3-P1.2` only:

- moved the single Mulberry32 transition into `src/engine/rng.ts` while retaining the prior clock export;
- added immutable 16-rank names and monotonic XP floors;
- added 16-track `ChampionProgression` as the sole mutable progression authority;
- derived ranks from XP and added deterministic dungeon-depth multipliers;
- added immutable XP awards with one XP event, at most one rank event, and visible rank feedback;
- materialized source ranks at their XP floors for Resurrect;
- reset all progression to None for Reincarnate while preserving its existing two-draw attribute boost;
- preserved the legacy `skills` field and all existing recruitment behavior for compatibility.

## Evidence

- TDD red: new progression suite initially produced 6 expected failures and 1 passing RNG compatibility check.
- Focused green: `tests/engine/progression.test.ts` — 7/7 passed.
- Bounded compatibility: progression, simulation, clean-room Phase 1 UAT, and real-data Phase 1 UAT — 17/17 passed across 4 files.
- Final lint and strict TypeScript: passed through `bobp make lint`.
- `git diff --check`: passed.

No Phase 2+ code, task-board completion, commit, push, release, or deployment was performed.
