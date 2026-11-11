# Sprint 3 UX Retrospective

## Outcome

Sprint 3 ultimately delivered a usable combat, progression, runic-magic and potion
experience in the constrained 320×200 interface. Smith's actual-browser gates were
material: they found a missing formula preview after state tests and screenshots had
otherwise passed, and they prevented Phase 5 from beginning until users could inspect
the exact ordered rune buffer they were editing and invoking.

## What Worked

- **Actual pixels plus state, not screenshots alone.** The strongest evidence paired
  canonical game state with hashes of the exact formula rectangle and real pointer/
  keyboard input. This proved that LO FUL IR, DEL, CLR and invalid invocation changed
  or preserved both state and presentation together.
- **Honest source provenance.** Clean-room mode used readable semantic labels while
  Amiga mode used source-guarded original glyphs with separators. Equivalent mechanics
  did not require false visual identity.
- **One focus owner.** After corrections, committed outcomes closed the rune panel,
  validation failures remained recoverable, Escape restored focus, and G/B could not
  leak to global overlays.
- **Canonical shared geometry.** One layout authority served rendering and hit testing;
  champion bars and messages stayed visible while the right deck changed modes.
- **Failure chronology stayed visible.** Focus, validator, pointer-priority, formula
  visibility, inventory no-op and approaching-lane defects remained recorded instead
  of being overwritten by final green totals.
- **Layered evidence.** Headless deterministic rules, independent tests, spatial pixel
  bounds and actual-browser review answered different questions without pretending
  that one substituted for another.

## What Failed or Arrived Too Late

- The original browser smoke asserted that state contained `LO FUL IR` but did not
  assert that users could see it. A passing boolean and nonblack panel concealed a
  major visibility-of-status failure.
- Initial UX planning identified narrow-deck labels and focus risks, but the first
  implementation gate did not include a dedicated current-formula row in its visual
  checklist.
- Interaction-priority defects appeared in two forms: committed casts left the panel
  active, and G/B or utility controls escaped the active owner. Priority must be
  reviewed as a complete ordered system, not one key or pointer case at a time.
- The painter temporarily duplicated incomplete combat eligibility rules, producing
  misleading READY states. Presentation should consume canonical reason codes rather
  than independently recreate domain logic.
- The initial spatial matrix covered facing/lane/depth but missed travel direction;
  final acceptance caught the approaching-lane reversal. View-relative projection
  matrices must include approach and recede from their first design.
- Real-browser evidence remained concentrated on rune/focus/geometry paths. The final
  approval appropriately combined it with 38/38 independent rule evidence, but future
  runners should capture a broader user-journey storyboard for combat, progression and
  brewing instead of relying on one narrow visual sequence.

## HCI Lessons

1. **Visibility of system status requires semantic proof.** A model value is not
   visible merely because its panel renders. Every editable buffer needs a named,
   pixel-bounded presentation assertion.
2. **Recognition must survive authenticity.** Original glyphs are appropriate only
   when ordering and grouping remain legible; separators made the formula inspectable
   without replacing authentic art.
3. **Recovery is part of the main path.** Invalid formula, insufficient resource,
   fizzle/backfire, DEL, CLR, close and Escape need explicit outcomes alongside success.
4. **Constrained layouts need invariant regions.** Bars and messages should be
   captured as unchanged regions whenever modal content occupies the right deck.
5. **Input ownership is cross-modal.** Mouse, QoL keys, global overlays, inventory,
   mirror, sleep, death and restart require one priority table and pairwise escape tests.
6. **Provenance is user trust.** Clean-room text and original glyphs can differ while
   mechanics remain equivalent; source identity must remain visible and truthful.

## Concrete UX Backlog

1. **Broader browser storyboard:** add bounded, named actual-browser scenes for
   progression rank-up, melee, ranged ammunition, free throw, five potion brew/drink
   outcomes, fizzle/backfire, Light/Shield expiry and disabled-resource reasons.
2. **Semantic visual contracts:** define required visible regions and state-to-pixel
   assertions for every editable or selected buffer before implementation begins.
3. **Priority-matrix harness:** generate mouse/key cases from the documented owner
   order across game-over, sleep, mirror, Sprint interaction, inventory and utilities.
4. **Narrow-deck stress cases:** test maximum action labels, all rank names, combined
   statuses and long failure reasons for clipping or ambiguous abbreviations.
5. **Accessibility review:** add non-color-only markers for disabled, success, fizzle,
   backfire and status expiry while preserving the original palette aesthetic.
6. **Spatial review matrix:** make approach/recede an explicit dimension alongside
   four facings, two lanes and near/far depth for every projectile-like feature.
7. **Evidence report detail:** include semantic check names and relevant state/pixel
   values in the JSON report so a passing summary remains auditable without reading
   the runner source.

## Final Assessment

The final experience meets the accepted Sprint 3 UX contract. The most important
process improvement is to specify and automate semantic visibility—what the user must
actually be able to recognize—not merely state correctness or the presence of drawn
pixels.
