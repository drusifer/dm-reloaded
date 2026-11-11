# Sprint 3 Phase 4 Implementation Summary

## Outcome

Implemented `S3-P4.1/P4.2`; independent `S3-P4.3` remains owned by Trin and Smith.

### Interaction and input

- Added one discriminated `interaction` owner for action, rune, and progression panels.
- Added shared canonical render/input rectangles for action controls, all 24 rune cells, formula controls, and progression close behavior.
- Occupied action-hand clicks open the action panel while carried-cursor/inventory behavior remains unchanged.
- Purist mouse paths cover action selection, rune editing/invocation, flask selection, progression, close/recovery, and the existing cursor-mouth potion path.
- QoL shortcuts are accepted only while QoL mode and the relevant panel are active; Purist keyboard input remains blocked. Escape restores focus.
- Active panels capture ordinary movement/viewport input. Inventory, sleep, mirror, champion death/game-over, and restart clear interaction ownership.
- Action panels show disabled reasons; rejected engine transactions retain their existing visible messages.

### Rendering and provenance

- Added right-deck action/rune/progression painters without covering champion bars, movement controls, or messages.
- Original graphics use item[557] rune glyph slots and verified item[560] action-label decoding with explicit fallback; clean-room mode uses semantic text glyphs.
- Champion effect/poison status is visible and progression ranks are inspectable.
- Added facing/lane-aware near/far projectile projection and transient impact markers.
- Original impact/damage feedback uses sprite item 14 only; movement remains sprite item 13. Clean-room feedback is procedural, preserving source provenance.
- Magical light now participates consistently in viewport and HUD light derivation.
- Existing catalog, raw sprite, lighting, inventory, and physical projectile paths remain unchanged.

### Review automation

- Added `bobp make sprint3-visual-review`, a bounded Chromium smoke scaffold for Trin/Smith.
- It uses real pointer events and Escape recovery in clean-room and extracted Amiga modes, saves portable screenshots/report data, and fails on browser exceptions or state mismatches.
- This smoke is preparation evidence only and does not self-approve `S3-P4.3`.

## Evidence

- TDD red: new Phase 4 suite failed 5/5 before implementation.
- Focused Phase 4 suite: 5/5 passed.
- Targeted input/render aggregate: 15/15 passed.
- Proportionate ten-file compatibility aggregate: 78/78 passed.
- ESLint and strict TypeScript passed.
- Production build passed (49 modules).
- Bounded Chromium smoke passed two source-mode checks with zero browser errors.
- `git diff --check` passed.

One far-projectile test fixture mistakenly spread a screen rectangle rather than a projectile and was corrected once. One static error placed impact drawing in a helper without the viewport palette and was corrected once. Neither issue repeated; no blocker remains.

## Scope Boundary

No Sprint 4 AI, Phase 5 close work, deployment, commit, push, or direct `task.md` edit occurred. Trin and Smith still own independent actual-browser acceptance.
