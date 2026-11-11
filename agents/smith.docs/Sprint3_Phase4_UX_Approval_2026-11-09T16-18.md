# Sprint 3 Phase 4 Actual-Browser UX Approval

## Verdict

**APPROVED after the user-authorized, Oracle-bounded fix cycle 3.** Phase 4 P4.3
may close and Phase 5 may begin.

Smith reran the browser review from current source and visually inspected both source
modes. Approval is based on correlated state, pixel-region, interaction, and visual
evidence—not the report boolean alone.

## Fresh Command and Evidence

```text
bobp make sprint3-visual-review
```

Fresh artifacts:

- `build/sprint3-visual-review/report.json`
- `build/sprint3-visual-review/clean_room-runes.png`
- `build/sprint3-visual-review/amiga_graphics_dat-runes.png`
- `build/sprint3-visual-review/clean_room-invoke.png`
- `build/sprint3-visual-review/amiga_graphics_dat-invoke.png`

The report covers both `CLEAN_ROOM` and `AMIGA_GRAPHICS_DAT`, 10 named checks,
`failures: []`, and `browserErrors: []`.

## Formula Visibility and Recovery

- Real pointer input constructs canonical state `LO FUL IR`.
- Clean-room capture renders the ordered text `LO FUL IR` clearly in a dedicated
  noninteractive formula row.
- Amiga capture renders the three source-guarded original rune glyphs in order with
  readable separators; it does not falsely substitute clean-room labels.
- The browser runner hashes the exact canonical formula rectangle and correlates it
  to state: `LO FUL IR` differs visibly from empty; DEL changes state and pixels to
  `LO FUL`; CLR restores empty state and the original empty-region hash.
- Incomplete `LO` invocation preserves RNG, mana, formula, `RUNE_PANEL` ownership,
  and the exact preview hash; Escape restores ordinary focus.
- Committed invocation consumes mana/RNG, clears the formula, closes the interaction,
  and shows visible fireball feedback.

## Preserved UX Boundaries

- Champion health/stamina/mana bars and the message strip remain visible while the
  rune panel is active.
- Mouse-only Purist construction works; Purist G/B does not alter the formula or
  leak to global overlays.
- QoL G/B remains owned by the rune panel and maps to BRO/RA without opening catalog
  or soundboard overlays.
- Utility pointer controls cannot escape an active higher-priority interaction owner.
- Clean-room labels and Amiga glyphs retain truthful source provenance.
- Existing original item 13/14 distinction, disabled-reason authority, carried
  cursor/inventory behavior, and interaction lifecycle remain covered by the final
  independent regression gate.
- All four facings, both lanes, and near/far impact markers pass 16 bounded geometry
  cases per source without pixels outside the expected region.

## HCI Assessment

- **#1 Visibility of system status:** current formula and committed/invalid outcomes
  are visible.
- **#3 User control and freedom:** DEL, CLR, close, and Escape update or exit
  predictably.
- **#5 Error prevention:** invocation operates on a visible ordered formula; invalid
  attempts preserve recoverable state.
- **#6 Recognition rather than recall:** users no longer need to remember the hidden
  rune buffer.
- **#7 Flexibility and efficiency:** Purist mouse and optional QoL shortcuts reach the
  same mechanics without input leakage.

No remaining Phase 4 UX blocker was found. This approval does not authorize commit,
push, release, deployment, or any scope beyond the planned Phase 5 acceptance and
local close.
