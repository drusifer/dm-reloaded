# Sprint 3 Phase 4 Actual-Browser UX Gate

## Verdict

**BLOCKED — do not advance to Phase 5.**

The repeatable browser review passes its state and geometry assertions, but visual
inspection exposes a user-facing acceptance failure: the active rune formula is not
rendered anywhere in the rune panel.

Phase 4 has already used two production fix cycles. Per the active anti-loop rule,
Smith is escalating this finding to the user and Oracle rather than requesting an
automatic third Neo cycle.

## Reproduction

Command:

```text
bobp make sprint3-visual-review
```

Artifacts:

- `build/sprint3-visual-review/clean_room-runes.png`
- `build/sprint3-visual-review/amiga_graphics_dat-runes.png`
- `build/sprint3-visual-review/report.json`

The browser scenario adds `Lo`, `Ful`, and `Ir` through real canonical pointer
events. Its state assertion confirms `runeFormulas.iaido` equals `LO FUL IR` in both
source modes. Both screenshots show the 24 rune choices and DEL/CLR/FLK/INVOKE/X
controls, but no visible `LO FUL IR` formula.

VIA located `paintInteractionPanel` in
`src/render/interactionPainter.ts`. The `RUNE_PANEL` branch draws all rune cells and
the five controls, then returns; it never renders `state.runeFormulas`.

## HCI Finding

- **Heuristic #1 — Visibility of system status:** the user's selected formula exists
  in state but is invisible.
- **Heuristic #6 — Recognition rather than recall:** users must remember their
  sequence instead of inspecting it as required by S3-4.2.
- **Heuristic #5 — Error prevention:** DEL, CLR, and INVOKE operate on an invisible
  buffer, making accidental edits or invocation difficult to diagnose.

Expected: while the rune panel owns interaction, the current ordered formula is
visibly readable in the constrained right deck for both clean-room text labels and
original rune glyphs.

Actual: no formula preview is rendered in either source mode, although browser state
contains the correct ordered formula.

## Evidence That Did Pass

- Fresh report: `passed: true`, both `CLEAN_ROOM` and `AMIGA_GRAPHICS_DAT`, 10 named
  checks, `failures: []`, `browserErrors: []`.
- State assertions passed for Purist mouse entry, QoL invocation and focus restore,
  pointer-owner priority, rejection recovery, and 16 facing/lane/depth marker cases
  per source.
- Visual inspection confirms champion bars/messages remain visible, original and
  clean-room rune presentations differ honestly, and committed invocation closes the
  panel with visible fireball feedback.

Those passes do not override the missing current-formula acceptance criterion.

## Required User Decision

Authorize one exceptional third bounded production cycle to add and independently
verify a visible formula preview, or revise/defer S3-4.2 explicitly. Until then,
Phase 4 P4.3 and Phase 5 remain blocked.
