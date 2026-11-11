# Sprint 3 Neo Retrospective

## Outcome and Evidence

Sprint 3 delivered deterministic progression, combat and generalized projectiles, rune magic and potions, and the complete Purist/QoL interaction surface. Final acceptance covered all 38 criteria, ADR-014 A1-A12, serialized 339/339 tests, lint and strict types, a 49-module production build, and fresh clean-room plus Amiga browser evidence with no failures or browser errors. The trace tool was unavailable and was correctly reported as unavailable rather than passed.

## Code Quality

What is strong:

- Pure deterministic engines retain one command reducer, one clock, one RNG transition, fixed draw budgets, and one progression authority.
- Immutable action/rune/spell/potion catalogs keep rule data separate from mutation.
- Validate-then-commit behavior makes rejected combat and magic actions atomic: no cost, RNG, XP, ownership, or event leakage.
- Typed item/ammunition/spell projectile payloads reuse one movement/collision/landing path while preserving ownership and provenance.
- Effects use absolute ticks and pure derived queries instead of mutating base champion attributes.
- Canonical layout rectangles are shared by input and rendering, and source-specific artwork remains behind guarded adapters.
- Independent QA matrices covered rank boundaries, RNG budgets, duplicate identities, all facings/lanes/depths, formula lifecycle, and both graphics sources.

Where quality slipped:

- Combat eligibility was initially duplicated partially in the painter instead of derived from the reducer's pure validation authority.
- Cross-cutting interaction cleanup was applied as an unconditional reducer clone, violating the inherited no-op identity contract.
- Projectile lane semantics were treated as viewer-relative even though lanes are travel-relative; the missing direction transform survived until final regression acceptance.
- Rune formula state was correct but not visibly presented. State correctness and nonblack pixels were insufficient substitutes for an explicit state-to-presentation contract.
- Phase 4 combined focus ownership, pointer priority, validation presentation, provenance, and visibility, producing more correction cycles than earlier headless phases.

## Implementation Friction

- Preserving compatibility while adding one interaction owner required careful priority ordering among game-over, sleep, mirror, Sprint panels, inventory/cursor, and utility overlays.
- Authentic Amiga rune/action rendering and clean-room fallback required source-guarded adapters plus real-browser evidence; unit-only checks could not prove readable presentation.
- Snapshotting a live 6 Hz browser loop introduced harness timing sensitivity. State-correlated region signatures were more reliable than broad nonblack assertions, but a deterministic review clock would reduce friction further.
- Late final acceptance caught two inherited contracts that bounded phase suites had missed: referential identity for rejected commands and approaching-lane mirroring.
- Parallel aggregate worker contention created unrelated 5-second timeouts. The separately authorized single-worker target distinguished infrastructure instability from product defects without weakening timeouts.

## What Worked

- TDD consistently exposed absent behavior before implementation, including Phase 1 progression, Phase 2 combat/projectiles, Phase 3 magic, Phase 4 interaction, and each focused correction.
- VIA-first navigation kept changes localized to actual reducer, validator, projection, and painter authorities.
- Short phase handoffs and independent Trin/Morpheus/Smith gates found semantic defects that self-validation missed.
- The anti-loop protocol was valuable. Phase 4 stopped after two automatic production fixes; the third presentation correction and final stabilization proceeded only after explicit User and Oracle scope decisions.
- Bounded fixes preserved chronology: reproduce unchanged failure, add a focused regression, change the smallest authority, run affected compatibility once, then hand off.
- Honest evidence handling prevented false confidence: trace unavailability and parallel timeout failures were recorded rather than relabeled as passes.

## What to Change

1. Define boundary contracts before integration. Every command family should specify no-op identity/events/RNG guarantees, every spatial quantity should declare its coordinate basis, and every interaction state should declare its visible representation and lifecycle.
2. Build pure validators before painters. UI disabled reasons should consume typed validation results, never reimplement eligibility subsets.
3. Add inherited-contract matrices during the phase that touches the boundary, not only at final acceptance. Inventory identity and reverse-direction projection belonged in the initial Phase 2/4 bounded gates.
4. Treat observability as acceptance behavior. A player-owned state such as a rune formula needs a canonical readable surface, recovery-state correspondence, and source-mode evidence.
5. Keep Phase 4-style integration slices smaller: interaction ownership/input priority first, canonical presentation second, authentic-source/browser verification third.
6. Retain bounded fix discipline and explicit authorization after the anti-loop threshold. Do not trade red evidence for repeated unchanged aggregate runs.

## Concrete Backlog

### P0 — correctness contracts

- Establish a shared typed validation-result convention for command families. Reducers commit from it; painters map its rejection codes to text/pixels; validators remain pure and side-effect free.
- Add a reducer identity contract suite across all command domains: rejected/no-op commands return the exact input object and emit no events/draws; lifecycle cleanup occurs only after accepted transitions.
- Extract and document a pure world/travel/view projection transform. Pin four viewer facings, same/opposite/perpendicular travel directions, both lanes, lateral displacement, near/far depth, clipping, and unchanged impact sizing.
- Add an interaction observability checklist and tests: owner, canonical layout surface, current-state rendering, accepted close, rejected recovery, lifecycle cleanup, and clean-room/authentic-source correspondence.

### P1 — earlier integration confidence

- Add inherited Sprint 1/2 compatibility slices to each phase gate where shared reducer, inventory, projectile, or render authorities change.
- Provide a deterministic browser review clock or explicit stable-frame hook so pixel/state assertions do not race the 6 Hz loop.
- Make state-correlated pixel-region assertions the default for interactive presentation; prohibit broad nonblack-only evidence for required UI state.
- Keep the serialized aggregate target as the final acceptance path in constrained environments while retaining parallel tests as a faster diagnostic path and preserving existing timeouts.

### P2 — maintainability and tooling

- Review `dispatchCommand` lifecycle cleanup sites for a small identity-preserving transition helper only where repeated semantics justify it; avoid a broad reducer refactor during feature work.
- Document coordinate-space names in projector APIs (`world`, `travel-relative`, `viewer-relative`, `screen`) to prevent implicit sign assumptions.
- Repair or replace the trace adapter for Codex workspaces so audit availability does not depend on a Claude transcript directory; continue reporting unavailable honestly until then.

## Closing Assessment

The delivered architecture is sound and well evidenced. Most defects were not algorithmic complexity failures; they were unstated boundary semantics between otherwise pure components. The highest-value follow-up is therefore contract-first engineering at reducer, validator, projection, and presentation seams, paired with the bounded independent gate discipline that ultimately made Sprint 3 reliable.
