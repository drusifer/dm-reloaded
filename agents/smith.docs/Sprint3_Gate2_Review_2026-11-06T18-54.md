# Sprint 3 Gate 2 — Architecture UX Review

## Verdict

**Approved.** The architecture preserves the Smith-approved product contract and binds every user-facing requirement to a concrete interaction, presentation, state, and evidence seam without expanding into Sprint 4 AI or Sprint 5 campaign/save work.

## UX and HCI Findings

### Purist mouse completeness and efficiency

- One `InteractionState` owns action, rune, or progression focus at a time.
- Every rune operation and shipped combat/potion path is mouse-complete; keyboard runes exist only as optional QoL acceleration.
- Empty-cursor versus carried-item behavior preserves the established inventory mental model and prevents accidental item ownership changes.

### Visibility and constrained layout

- Action and rune panels occupy only the right deck (`x=224..319, y=33..168`). Champion health, stamina, and mana remain visible at `y=0..28`, and the message strip remains available.
- Shared layout rectangles drive both painting and input hit testing at canonical 320×200 coordinates and integer display scales.
- Disabled reasons, rank changes, costs, impacts, potion outcomes, and status expiry cross typed events into visible messages/status rather than relying on console output.

### Focus, recovery, and error prevention

- Explicit priority covers restart, wake, mirror, Sprint 3 interaction, inventory, then ordinary controls.
- Sleep, death, restart, mirrors, and inventory transitions clear Sprint 3 interaction ownership; `Escape` closes the rune panel.
- Pre-validation failures preserve the rune formula for recovery. Successful, fizzled, and backfired invocations clear it according to the approved contract.
- Validation precedes RNG and cost commitment; blocked commands cannot silently consume resources, grant XP, start cooldowns, detach items, or leak input.

### Provenance and scope boundaries

- Original labels, glyphs, and damage art require `AMIGA_GRAPHICS_DAT`; clean-room content uses explicit alternatives and never infers identity from matching indices or dimensions.
- Bounded `CombatTargetState` fixtures are passive review seams with no pathfinding, attacks, turns, scent, or production campaign requirement.

### Evidence quality

- Headless tests cover rule boundaries and lifecycle; render/input evidence covers native layout, source modes, facings, lanes, depths, mouse/QoL paths, and leakage.
- Actual-browser evidence uses the bounded review scenario, asserts known draw markers plus state transitions, covers all specified failures, and requires zero uncaught errors.
- Independent tests may not reuse production expected-value helpers; serial `bobp make` and honest trace-audit reporting are retained.

## Non-Blocking Implementation Watchpoints

- Keep disabled-reason text readable within the narrow right deck; Smith must inspect actual 320×200 screenshots, including long fallback labels.
- Verify the message/status queue does not hide simultaneous impact, rank-up, or backfire consequences.
- Exercise carried-cursor and open-inventory clicks around both action hands to prove Sprint 2 item semantics remain intact.

## Gate Result

Gate 2 is approved. Mouse may convert the architecture and acceptance trace into short phases of one to three tasks, after which Morpheus must perform the sprint-plan review.
