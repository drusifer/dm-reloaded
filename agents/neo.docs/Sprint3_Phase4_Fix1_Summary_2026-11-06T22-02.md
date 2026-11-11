# Sprint 3 Phase 4 Fix Cycle 1

## Outcome

Closed both defects from Trin Phase 4 UAT FAIL1 without broadening scope.

1. `INVOKE_RUNES` now closes interaction ownership only when an eligible attempt commits a success, fizzle, backfire, or potion brew. Invalid/incomplete/insufficient pre-validation rejection retains the rune panel and formula for recovery.
2. The app shell now gives an active rune panel first ownership of every key before global soundboard/catalog handlers. QoL G and B add BRO and RA respectively; Purist mode captures but ignores disabled shortcuts, so neither key leaks.

The browser harness now explicitly clears the formula preserved by Escape before testing G/B ownership, then verifies both shortcuts and the committed invocation state markers in clean-room and Amiga modes.

## Evidence

- Unchanged independent failure reproduced at 4/5 before the fix.
- Independent plus focused reducer/input regressions: 11/11 passed.
- Strengthened Chromium clean-room and Amiga harness: four checks passed, no failures, zero browser errors.
- Bounded six-file input/magic/render aggregate: 34/34 passed.
- ESLint and strict TypeScript passed.
- Production build passed (49 modules).
- `git diff --check` passed.

The first post-fix browser run identified retained `Lo Ful Ir` from the earlier Escape recovery; G had correctly appended BRO. The harness was corrected to clear explicitly and strengthened with B→RA. This was not a second production failure. No blocker or repeated fix failure remains.

## Handoff

Trin should rerun unchanged independent focus assertions and the two-source Chromium retry before continuing the Phase 4 architecture and mandatory Smith gates.
