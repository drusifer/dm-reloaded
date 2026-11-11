# Sprint 3 Phase 4 Retry 2 UAT

## Verdict

**PASS after production fix cycle 2, the final automatic cycle.** The canonical
combat-validation and A10 pointer-priority blockers from Morpheus's review are closed,
and the earlier focus/keyboard fix remains green. The anti-loop pause is not needed.

Trin changed only the QA-owned independent test; no production file or `task.md` was
edited by Trin. This is a correctness pass for Morpheus re-review. Mandatory Smith
actual-browser UX approval remains blocked until Morpheus approves and remains
required before Phase 5.

## Canonical Combat Validation

VIA relationship evidence shows:

- `executeCombatAction` calls `validateCombatAction` directly;
- `combatActionFailureReason` calls the same validator;
- `paintInteractionPanel` consumes only `combatActionFailureReason` and maps the
  canonical result to display text.

Independent missing-ammunition and invalid-target fixtures prove:

- `validateCombatAction` and the painter-facing reason return exactly
  `MISSING_AMMUNITION` and `INVALID_TARGET`;
- validation is pure and leaves the complete input state unchanged;
- reducer rejection preserves RNG, stamina, cooldowns, inventory, targets, and XP;
- reducer events contain the matching canonical `ACTION_REJECTED` reason;
- rendered red reason glyphs exactly match independent `MISSING AMMO` and
  `INVALID TARGET` masks rather than `READY`.

## A10 Pointer and Existing Focus Boundaries

Independent pointer cases prove game-over and sleep retain first priority, then mirror
and each active action/rune/progression owner capture all QoL/automap/audio pill
clicks. Utilities remain functional with no higher owner. Prior carried-cursor and
open-inventory hand precedence and inventory/sleep/death/mirror cleanup remain green.

The full independent file also re-verifies:

- committed success/fizzle/backfire/brew focus restoration;
- invalid/mana/skill formula and zero-cost recovery;
- Purist `G/B` no-leak and QoL `G/B -> BRO/RA`;
- all 24 shared rune hitboxes, bars/messages, disabled reasons, original item 13/14
  provenance, and all facing/lane/depth marker geometry.

## Real Chromium and Gates

- Focused independent retry: **7/7 passed**.
- Bounded 11-file Phase 4/input/render and adjacent Sprint 2/magic/combat/projectile
  compatibility matrix: **70/70 passed**.
- Repeatable Chromium: **10 named checks** across `CLEAN_ROOM` and
  `AMIGA_GRAPHICS_DAT`, including pointer-owner priority, state/draw markers,
  rejection recovery, and 16 impact geometry cases per source; `failures: []` and
  `browserErrors: []`.
- ESLint and strict TypeScript: **passed**.
- Production Vite build: **passed**, 49 modules transformed.
- `git diff --check`: **passed**.
- Required `bobp make judge-trace DATE=2026-11-06`: **unavailable, not passed**.
  It reports `Could not find Claude project dir for
  /var/home/drusifer/Projects/dungeon-master`; the target masks the error with
  `|| true`.

## Chronology and Handoff

Phase 4 production fix cycle 1 corrected committed invocation focus and app-shell
`G/B` ownership after Trin's initial failure. Trin retry 1 passed, then Morpheus found
the duplicated/incomplete painter validator and utility-pointer priority defects.
Neo fix cycle 2 established the shared authority and restored A10 priority. This
retry independently passes both cycles' boundaries, so no third production cycle is
requested.

Morpheus should re-review Phase 4 against S3-2.6 and A10-A12. On approval, Smith must
perform and explicitly approve the actual-browser UX gate before Mouse checkpoints
Phase 4 or releases Phase 5.
