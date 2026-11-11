# Sprint 3 Phase 1 Architecture Review

## Verdict

**APPROVED.** `S3-P1.1` and `S3-P1.2` satisfy the Phase 1 boundary and architecture decisions A1-A5. Phase 2 may begin after Mouse updates the sole task board.

## Architecture Findings

- `src/engine/rng.ts` is the single Mulberry32 implementation. `clock.ts` only re-exports it for compatibility, and recruitment consumes the same authority.
- Progression stores exactly 16 XP tracks. Ranks are derived from one immutable threshold table rather than stored as a second mutable truth.
- `awardSkillExperience` is a pure immutable transaction with identity no-ops for invalid awards, a single XP event, at most one final rank event, bounded visible message history, depth scaling, and no RNG draw.
- Resurrect materializes source ranks at XP floors without consuming RNG. Reincarnate clears both legacy source ranks and runtime progression while preserving the existing deterministic two-draw attribute/health boost.
- The reducer remains the only gameplay command authority. The progression helper is ready for Phase 2/3 rule engines to call from validated reducer transactions; Phase 1 does not add a debug or out-of-band XP command.
- Dependency direction remains inward to pure engine types. No renderer, input, data parser, UI, monster AI, combat, magic, deployment, or other later-phase behavior leaked into Phase 1.

## Evidence Reviewed

- Neo focused progression: 7/7.
- Neo bounded compatibility: 17/17.
- Trin independent UAT: 7/7 with pinned RNG and QA-owned rank floors.
- Trin bounded aggregate: 24/24.
- ESLint and strict TypeScript passed; `git diff --check` passed.
- `judge-trace` was invoked but is unavailable in this Codex workspace because no Claude project directory exists. The Make target masks the tool error, so this review makes no trace-pass claim.

## Phase 2 Constraints

- Combat validation must occur before RNG, cost, cooldown, projectile, or XP mutation.
- Successful combat effects may award XP only by calling the shared progression authority inside the reducer transaction.
- Existing physical item ownership and free-throw behavior must remain compatible while projectile payloads are generalized.
- Passive review targets must not acquire Sprint 4 AI, pathfinding, turns, or autonomous behavior.

