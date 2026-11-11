# Sprint 3 Phase 4 Authorized Fix 3 UAT

## Verdict

**PASS for the user-authorized, Oracle-bounded presentation exception.** The current
formula is now visibly inspectable, ordered, source-guarded, and read-only. No engine,
input, rule, inventory, RNG, cost, focus, or task-board change was made by Trin.

There is no fix cycle 4. Morpheus should confirm the correction stayed within the
authorized boundary, then Smith must repeat and explicitly approve the fresh
two-source actual-browser UX gate before Phase 4 can close.

## Independent Formula Preview Evidence

The new QA-owned pixel/state case passes independently and does not call the
production preview routine as its expected-value authority. It proves:

- `RUNE_PANEL_RECTS.FORMULA` is the canonical `{ x: 225, y: 84, w: 94, h: 12 }`
  non-interactive surface and does not overlap any of the 24 rune cells;
- clean-room `LO`, `LO FUL`, and `LO FUL IR` gold-pixel masks exactly match
  independently drawn ordered labels;
- the preview reads the active champion's formula rather than another party member's;
- synthetic Amiga rune slots render the independent LO/FUL/IR bit patterns at the
  correct ordered positions, distinct from clean-room labels;
- an Amiga bundle without usable source font data falls back visibly to the exact
  clean-room label mask;
- DEL updates state and pixels to `LO FUL`, CLR restores the empty preview, and an
  invalid `LO` invocation preserves formula, preview, owner, RNG, mana, and inventory;
- rendering and clicking inside the preview do not mutate or dispatch state.

The full independent Phase 4 file passes **8/8**, preserving all prior focus,
keyboard, pointer, validator, cursor/inventory, bars/messages, item 13/14, and
facing/lane/depth assertions.

## Actual Chromium Evidence

The repeatable browser review passes **10 named checks** across `CLEAN_ROOM` and
`AMIGA_GRAPHICS_DAT`, with `failures: []` and `browserErrors: []`. Its formula flow
correlates state with preview-region pixels for:

- empty -> `LO FUL IR`;
- DEL -> `LO FUL`;
- CLR -> empty;
- restored formula;
- invalid `LO` invocation preservation.

It also retains committed state/draw markers, Purist/QoL B/G ownership, A10 pointer
priority, rejection recovery, and 16 impact geometry cases per source. Screenshots
remain review artifacts, not nonblack-only proof.

## Honest Harness Chronology

The first two-source run reported one generic Amiga rejection-preservation mismatch.
A clause-level diagnostic run then exposed the actual timing hazard in clean-room:
the live 6 Hz loop regenerated mana from 6 to 8 while the harness waited 40 ms for a
preview capture between its state snapshot and click. Trin moved the snapshot to
immediately before the click while retaining the exact preview hash comparison. The
corrected run passed both sources. This was a QA evidence-timing correction, not a
production defect or fix cycle.

The first lint run also found one QA-only `prefer-const` violation. Trin corrected the
test declaration; the subsequent lint/typecheck passed. Both red events are preserved
here rather than erased.

## Gates

- Focused formula-preview case: **1/1 passed** (`7 skipped`).
- Full independent Phase 4 file: **8/8 passed**.
- Bounded five-file render/input compatibility matrix: **30/30 passed**.
- Corrected clean-room/Amiga Chromium review: **10 checks**, zero failures/errors.
- ESLint and strict TypeScript: **passed after the QA-only correction**.
- Production Vite build: **passed**, 49 modules transformed.
- `git diff --check`: **passed**.
- Required `bobp make judge-trace DATE=2026-11-09`: **unavailable, not passed**.
  It reports `Could not find Claude project dir for
  /var/home/drusifer/Projects/dungeon-master`; the target masks the error with
  `|| true`.

## Handoff

Morpheus should re-review only the authorized formula-preview boundary against
S3-4.2 and A10-A12. If approved, Smith must repeat fresh clean-room and Amiga visual
inspection and explicitly approve the formula's usability. Phase 5 remains blocked
until Smith approves.
