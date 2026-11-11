# Sprint 3 Phase 4 Independent UAT — Failure 1

## Verdict

**FAIL — production fix cycle 1 required.** Independent headless and real-browser
evidence found two focus/input-ownership defects. Trin did not edit production code
or `task.md`.

## Defect 1 — Committed invocation retains the rune-panel owner

Accepted behavior: S3-4.7 and A10 require a completed success/fizzle/backfire
invocation to restore focus, while a pre-validation rejection retains the formula
and panel for recovery.

Reproduction:

1. Open `RUNE_PANEL` for a living Neophyte-or-better Wizard with sufficient mana.
2. Enter `Lo Ful Ir` and use a deterministic success draw.
3. Invoke by the shared mouse rectangle or dispatch `INVOKE_RUNES`.

Observed: the invocation succeeds, consumes mana/RNG, and clears the formula, but
`state.interaction.kind` remains `RUNE_PANEL`.

Expected: committed invocation returns interaction ownership to `NONE`. Invalid or
incomplete formulas must continue to preserve `RUNE_PANEL` and their formula.

Evidence:

- `tests/input/sprint3Phase4IndependentUat.test.ts`: 4/5 passed; the sole failure is
  `expected 'RUNE_PANEL' to be 'NONE'` after a verified `SPELL_SUCCEEDED` event.
- Real Chromium repeats the failure under both `CLEAN_ROOM` and
  `AMIGA_GRAPHICS_DAT`; RNG and mana markers prove the invocation committed.

## Defect 2 — QoL rune key `G` leaks to the catalog overlay

Accepted behavior: S3-4.3 and A10 require the active rune panel to own QoL rune
keys, with no leakage to movement, inventory, soundboard, or catalog handlers.

Reproduction:

1. Open `RUNE_PANEL` in QoL mode.
2. Press `G`, the documented 17th shortcut in the 24-key rune mapping.

Observed: the app shell opens the catalog/contact-sheet overlay before the rune
controller handles the key; the formula does not receive `BRO`.

Expected: `G` adds `BRO` and does not reach the catalog overlay while the rune panel
owns focus. The same precedence must protect `B` from the soundboard handler because
it is also in the rune shortcut set.

Evidence: the repeatable Chromium target records the same failure for clean-room and
Amiga sources. The pure input resolver correctly maps `G` to `BRO`, isolating the
defect to app-shell handler precedence.

## Passing Independent Boundaries

Four QA-owned cases pass and remain useful for the retry:

- carried-cursor/open-inventory hand precedence and inventory/sleep/death/mirror
  ownership cleanup;
- all 24 shared rune hitboxes, mouse controls, Purist gating, QoL capture, Escape,
  progression close, and movement capture;
- champion bars/message strip preservation, 24 rendered rune cells, and distinct
  invalid/cooldown/stamina/reach disabled-reason output;
- all four facings, both lanes, near/far projectile geometry, and negative item-13
  versus positive item-14 impact provenance.

Chromium also confirms the original mouse rune sequence and Escape recovery for both
sources with `browserErrors: []`; screenshots alone were not used as evidence.

## Gate Chronology

- Focused independent Phase 4 file: **4/5 passed, 1 failed**.
- Strengthened `bobp make sprint3-visual-review`: **failed** with the two defects in
  both sources; structured report is `build/sprint3-visual-review/report.json`.
- First lint run found one QA-only unused import; Trin removed it without touching
  production. The corrected ESLint and strict TypeScript run **passed**.
- Scoped `git diff --check`: **passed**.
- Required judge trace: **unavailable, not passed** because this environment has no
  Claude project directory; the target masks the error with `|| true`.
- Bounded compatibility/build expansion was intentionally not run after confirmed
  production failures.

## Required Fix and Retry

Neo should make only these two corrections:

1. close interaction ownership after committed rune outcomes while preserving the
   panel/formula on pre-validation rejection;
2. route active interaction keys before app-level `B/G` overlays so rune shortcuts
   cannot leak.

Trin will rerun the unchanged failing unit assertion and both-source Chromium
scenario first, then the bounded Phase 4/compatibility gate if they pass. Mandatory
Smith UX approval remains pending after Trin and Morpheus.
