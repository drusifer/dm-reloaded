# Sprint 3 Phase 4 Architecture Review

## Verdict

**REJECTED; production fix cycle 2 is required.** Trin's retry correctly closes the fix-cycle-1 rune outcome and keyboard-ownership defects, and the render/source/geometry work is otherwise bounded, but two A10/S3-2.6 authority gaps remain. Smith's mandatory actual-browser gate must wait for the corrected build.

## Blocking Issues

### 1. Disabled-action presentation is a second, incomplete rule authority

`src/render/interactionPainter.ts::actionReason` independently reimplements only actor/item, cooldown, stamina, and rear-rank checks. `src/engine/combat.ts::executeCombatAction` additionally owns target resolution and ammunition validation. Consequently, an unavailable ranged or targetless action can be presented as enabled/`READY` and then be rejected by the reducer as `MISSING_AMMUNITION` or `INVALID_TARGET`.

This violates S3-2.6's explicit missing-ammunition and invalid-target feedback, S3-P4.1's complete disabled reasons, and the maintainability boundary that UI must present engine rules rather than drift into a second rule implementation.

Required correction:

- Extract one pure combat-availability/validation query in the engine that returns the reducer's canonical failure reason without mutation, RNG, cost, cooldown, XP, or event effects.
- Use that same query in both `executeCombatAction` and the painter's read-only status mapping.
- Add exact tests for missing ammunition and invalid target proving the button is disabled with the correct reason and dispatch cannot spend or mutate state.

### 2. Pointer utility controls bypass the modal/interaction owner

`src/input/inputController.ts::resolvePointerHitCommand` resolves QoL, automap, and audio pills immediately after game-over/sleep, before `activeMirror` and before every active Sprint 3 interaction. Its own comment says they are "always reachable." A10 instead requires mirror, then active Sprint 3 interaction, then inventory, then ordinary HUD/viewport input.

This allows pointer input to escape a mirror or active action/rune/progression owner, so the code does not yet have one interaction focus authority even though the fix-cycle-1 keyboard cases pass.

Required correction:

- Resolve mirror and active interaction ownership before ordinary utility pills; clicks outside the active owner's controls must remain captured.
- Preserve the documented game-over and sleep priority and existing inventory semantics.
- Add pointer tests showing QoL/automap/audio clicks cannot bypass mirror or each active Sprint 3 interaction, and remain usable when no higher-priority owner is active.

## Accepted Boundaries and Chronology

- Fix cycle 1 correctly closes committed rune outcomes, preserves formula/panel on pre-validation rejection, and prevents QoL `G`/`B` keyboard leakage.
- Shared rectangles, cursor/inventory compatibility, lifecycle cleanup, panel/bar/message composition, source-guarded original/fallback presentation, item 13/14 distinction, and facing/lane/depth projectile geometry have independent passing evidence.
- Trin retry evidence is preserved as independent5/5, bounded11-file66/66, Chromium clean-room plus Amiga checks, lint/types/build/diff pass. `judge-trace` remains unavailable and is not claimed.
- No unchanged suite was rerun for this review. No Phase 5, Sprint 4, deployment, dependency, commit, or push work is authorized.

## Handoff

@Neo implement only the two corrections above as Phase 4 production fix cycle 2. @Trin independently recheck those boundaries and the bounded regression surface. A third unresolved production cycle would trigger the anti-loop pause. Smith actual-browser review remains blocked until Morpheus approves the retry.
