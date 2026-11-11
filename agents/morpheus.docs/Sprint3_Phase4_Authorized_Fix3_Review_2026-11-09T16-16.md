# Sprint 3 Phase 4 Authorized Fix 3 Architecture Review

## Verdict

**APPROVED within the user-authorized, Oracle-bounded presentation exception.** The rune-formula preview closes Smith's visibility blocker without reopening engine, input, inventory, RNG, rule, focus, or ownership behavior. The corrected build must now return to Smith for a fresh actual-browser UX gate. Phase 5 remains blocked until Smith explicitly approves.

## Boundary Verification

- `paintFormulaPreview` is a render-only projection of the active interaction champion's ordered `GameState.runeFormulas` value. It draws framebuffer pixels and does not dispatch commands or mutate state.
- `RUNE_PANEL_RECTS.FORMULA` is the single canonical preview surface at `{ x: 225, y: 84, w: 94, h: 12 }`. The 24 rune cells were repacked within the existing right-deck footprint and do not overlap it.
- Clean-room mode renders readable catalog labels in formula order. Only `AMIGA_GRAPHICS_DAT` may use rune glyph slots; unusable original font data falls back visibly to the readable labels.
- Pointer resolution has no formula-preview command. A click inside the surface resolves to `null`; the existing ADD/DEL/CLR/INVOKE controls remain the only state-changing paths.
- The painter depends on catalog, engine types/queries, and render primitives. No engine or input module depends on the painter, and no formula rule, RNG, cost, inventory, or focus authority moved into presentation.
- Prior canonical combat validation, A10 pointer priority, carried-cursor/inventory behavior, committed/rejected formula focus, Purist/QoL `G/B`, bars/messages, source provenance, item 13/14, and projectile geometry remain inside the bounded green regression surface.

## Evidence and Chronology

- Neo focused preview lifecycle/source test: 1/1 passed; bounded five-file input/render compatibility: 30/30.
- Trin independent preview case: 1/1; full Phase 4 independent file: 8/8; bounded matrix: 30/30.
- Independent assertions verify the exact canonical rectangle, non-overlap, active-champion selection, ordered clean-room masks, distinct source-guarded Amiga glyph positions, readable fallback, render purity, and a null pointer command inside the preview.
- DEL changes state/pixels to `LO FUL`; CLR restores the empty preview; invalid `LO` invocation preserves formula, preview, owner, RNG, mana, and inventory.
- Corrected Chromium evidence passes 10 named checks across `CLEAN_ROOM` and `AMIGA_GRAPHICS_DAT`, with empty failures and browser errors and state-correlated preview hashes for add, DEL, CLR, restore, and invalid preservation.
- The first browser run's mismatch was a QA-only 6 Hz snapshot race; moving the state snapshot immediately before the click corrected the harness without production changes. The first lint run's `prefer-const` issue was likewise QA-only. This chronology is retained.
- ESLint/strict TypeScript, 49-module production build, and diff-check passed. `judge-trace` remains unavailable because the workspace has no Claude project directory and is not claimed as a pass.
- Morpheus reran no unchanged suites and made no production or root-board edits.

## Mandatory Next Gate

@Smith must repeat fresh actual-browser inspection in both source modes and explicitly approve the formula preview's readability, ordering, ADD/DEL/CLR/invalid recovery correspondence, and surrounding Phase 4 journey. No fix 4 is authorized; any remaining defect stops and escalates to User/Oracle.
