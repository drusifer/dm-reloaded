# Sprint 3 Phase 4 Retry UAT

## Verdict

**PASS after production fix cycle 1.** Neo's bounded focus/input correction closes
both failures from the first Phase 4 UAT. Trin changed only QA-owned tests and the
repeatable review harness; no production file or `task.md` was edited by Trin.

This is a correctness pass for Morpheus review. Mandatory Smith actual-browser UX
approval remains pending and Phase 5 must not begin before that explicit approval.

## Focused Independent Evidence

`tests/input/sprint3Phase4IndependentUat.test.ts` passes **5/5** and proves:

- committed spell success, fizzle, and backfire each clear the formula and restore
  interaction ownership to `NONE`;
- a successful flask brew also restores focus;
- invalid formula, insufficient mana, and insufficient skill preserve the rune
  panel, exact formula, mana, and RNG state for recovery;
- Purist `G/B` are ignored while the rune panel retains ownership; QoL `G/B` map to
  `BRO/RA`; movement keys cannot leak through an active panel;
- carried-cursor and open-inventory hand clicks retain Sprint 2 item ownership rather
  than opening an action menu;
- inventory, sleep, champion death, and mirror lifecycle clear interaction ownership;
- all 24 shared rune hitboxes and panel controls map correctly;
- panels preserve champion bars and the message strip, render all 24 rune cells, and
  distinguish invalid/cooldown/stamina/reach reasons;
- all four facings, both lanes, and near/far depths project correctly;
- item 13 is not accepted as an impact substitute, while item 14 is used only through
  the original-source impact path.

## Real Chromium Evidence

The strengthened repeatable `bobp make sprint3-visual-review` target passes **8
named checks** across both `CLEAN_ROOM` and `AMIGA_GRAPHICS_DAT`:

- mouse rune entry and one-Escape focus restoration;
- Purist `G/B` no-leak and QoL `G/B -> BRO/RA` ownership;
- committed invocation RNG/mana/formula/focus markers;
- invalid-formula zero-cost preservation and Escape recovery;
- 16 independently calculated impact cases per source: four facings, two lanes, and
  near/far depth, with changed pixels constrained to the expected marker region.

The structured report records `failures: []` and `browserErrors: []`. Screenshots
were captured as artifacts but were not used as nonblack-only proof.

## Gates

- Focused independent Phase 4 file: **5/5 passed**.
- Bounded 11-file Phase 4 input/render and adjacent Sprint 2/magic/combat/projectile
  compatibility matrix: **66/66 passed**.
- ESLint and strict TypeScript: **passed**.
- Production Vite build: **passed**, 49 modules transformed.
- `git diff --check`: **passed**.
- Required `bobp make judge-trace DATE=2026-11-06`: **unavailable, not passed**.
  It reports `Could not find Claude project dir for
  /var/home/drusifer/Projects/dungeon-master`; the target masks the error with
  `|| true`.

## Chronology and Handoff

Initial UAT failed independently at 4/5 and in both browser sources because committed
invocation retained `RUNE_PANEL` and app-shell `G` reached the catalog overlay before
the rune owner. Neo fix cycle 1 corrected only those focus/priority seams. The
unchanged failing success assertion plus expanded outcome and browser matrices now
pass.

Morpheus should review Phase 4 against A10-A12. If approved, Smith must still conduct
and explicitly approve the actual 320x200 UX gate before Mouse can checkpoint Phase 4
or release Phase 5.
