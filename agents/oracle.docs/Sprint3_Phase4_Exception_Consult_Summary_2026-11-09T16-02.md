# Sprint 3 Phase 4 Exceptional Fix Consultation

## Finding

Oracle confirms Smith's blocker is a presentation omission, not a defect in rune state, command handling, deterministic rules, focus ownership, or source provenance.

- Fresh browser state contains the ordered `LO FUL IR` formula in both source modes.
- `paintInteractionPanel` draws the 24 rune choices and five controls, then returns without reading the active champion's formula.
- `RUNE_PANEL_RECTS` defines no formula-preview surface even though A11 reserves the full right deck for the active panel.

The implementation therefore satisfies formula construction but not S3-4.2's requirement that the player can inspect the current formula.

## User-Authorized Exception

The user explicitly authorized one exceptional third production cycle on 2026-11-09. This exception is limited to making the already-correct current formula visible.

Permitted scope:

1. Add one canonical, non-interactive formula-preview rectangle in `src/render/layout.ts` within the active right deck.
2. In the `RUNE_PANEL` renderer, read the active champion's existing formula without mutation and render it in order.
3. Preserve source truth: clean-room mode uses explicit fallback names/symbols; original mode may use verified `item[557]` rune glyphs with a visible fallback.
4. Add focused render/browser evidence that add, remove, clear, and pre-validation failure update or preserve the visible preview exactly as state specifies.

Forbidden scope:

- No engine state, formula grammar, RNG, mana, XP, inventory, spell, potion, input-priority, focus, combat-validation, projectile, lifecycle, or provenance-rule changes.
- No new interactive control or hit target.
- No weakening or deferral of S3-4.2.

## Required Regression Boundaries

- Champion bars and the message strip remain visible.
- Existing rune cells and DEL/CLR/FLK/INVOKE/X hit rectangles remain unchanged.
- Committed success/fizzle/backfire/brew still closes interaction; invalid/insufficient attempts still preserve panel and formula.
- Purist/QoL ownership, G/B capture, mirror/interaction pointer priority, cursor/inventory behavior, and original item 13/14 separation remain green.
- Smith must visually inspect fresh clean-room and Amiga captures; state assertions or nonblack pixels alone are insufficient.

No ADR amendment is required because A10-A12 already require visible, source-guarded right-deck presentation. This correction brings implementation into conformance with the existing decision rather than changing it.
