# Sprint 3 Phase 4 Production Fix Cycle 2

## Outcome

Closed Morpheus's final two Phase 4 architecture blockers without scope growth.

1. Added pure `validateCombatAction` and `combatActionFailureReason` as the canonical eligibility authority. The reducer consumes the validation result directly; the interaction painter reads the same failure reason. Missing ammunition and invalid target can no longer display READY while dispatch rejects them. Validation has no mutation, RNG, cost, cooldown, XP, or event effects.
2. Restored A10 pointer priority: game-over and sleep remain first, then mirror, then the active Sprint 3 interaction owner. QoL, automap, and audio pills resolve only after those owners. Existing carried-cursor and inventory behavior remains unchanged.

The painter's display adapter maps canonical reasons only; it contains no combat eligibility logic.

## Evidence

- New architecture tests first failed for missing validator and utility-pill bypass.
- Focused architecture regressions: 2/2 passed.
- Focused Phase 4 plus production/independent combat suites: 23/23 passed.
- Bounded eight-file Phase 4/input/combat/render aggregate: 45/45 passed.
- Strengthened Chromium clean-room and Amiga harness: 10 checks passed, including pointer-owner priority and 16 impact geometry/source cases per mode; no failures or browser errors.
- ESLint and strict TypeScript passed.
- Production build passed (49 modules).
- `git diff --check` passed.

No blocker or repeated defect remains. This is production fix cycle 2, the final automatic cycle; any recurrence must pause for user guidance.

## Handoff

Trin should independently recheck canonical missing-ammunition/invalid-target presentation and reducer immutability plus mirror/action/rune/progression pointer capture before returning to Morpheus. Smith remains blocked until architecture approval.
