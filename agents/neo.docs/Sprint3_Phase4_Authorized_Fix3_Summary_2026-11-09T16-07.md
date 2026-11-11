# Sprint 3 Phase 4 Authorized Fix 3 Summary

## Scope

Implemented the user-authorized, Oracle-bounded presentation correction only: the active rune panel now exposes a canonical read-only preview of the active champion's ordered `state.runeFormulas` value.

## Implementation

- Added one shared `RUNE_PANEL_RECTS.FORMULA` layout surface while retaining the existing control and invocation rectangles.
- `interactionPainter` reads the active champion formula without dispatching or mutating state.
- Clean-room rendering uses bounded readable rune labels such as `LO FUL IR`.
- `AMIGA_GRAPHICS_DAT` rendering uses source-guarded authentic rune glyph slots; if source glyphs are unavailable, the preview falls back to the same bounded readable labels.
- Repacked the existing 24 rune-choice cells vertically to make room inside the established panel footprint. Existing pointer review coordinates and interaction semantics remain valid.
- Extended the browser review to compare formula state with stable preview-region pixel signatures for add, delete, clear, restore, and invalid-invocation preservation in both source modes.

No engine state/actions, RNG, costs, inventory, input/focus priority, combat validation, other panels, champion bars/messages, item distinctions, or projectile behavior changed.

## TDD and Validation

- Red: focused renderer test failed because the canonical formula rectangle did not exist.
- Green: focused formula-preview lifecycle/source-mode test passed 1/1.
- Bounded input/render compatibility: 30/30 across five files.
- Real Chromium review: 10/10 checks across `CLEAN_ROOM` and `AMIGA_GRAPHICS_DAT`, zero failures and zero browser errors; formula assertions require state-correlated pixel changes rather than merely nonblack output.
- `bobp make lint`: passed ESLint and TypeScript.
- `bobp make build`: passed production Vite build.
- `git diff --check`: passed.

## Handoff

Trin should independently verify readable ordered formula presentation in both source modes for LO, LO FUL IR, DEL, CLR, and pre-validation invalid-invocation preservation. If accepted, Smith must repeat the actual-browser Phase 4 UX gate. No fourth fix cycle is authorized.
