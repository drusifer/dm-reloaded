# Sprint 3 Trin Retrospective

Date: 2026-11-09 21:09 EST  
Persona: Trin  
Scope: QA process, independent evidence, browser gates, test infrastructure, and chronology discipline

## Outcome

Sprint 3 finished with a strong evidence base: 38/38 acceptance criteria mapped, 35 QA-owned independent cases, a final 50-file/339-test serialized aggregate, fresh clean-room and Amiga browser evidence, and Morpheus A1-A12 approval. The most valuable QA contribution was not test volume; it was independent models that found identity, uniqueness, focus, and viewpoint errors that implementation-shaped tests had missed.

## What QA caught

1. **Explosion uniqueness:** duplicate target records sharing one ID were damaged and emitted more than once. The independent test used stable first-seen IDs and caught a real A6 ownership/identity defect.
2. **Interaction completion and QoL leakage:** committed spell/brew outcomes retained rune-panel focus, and app-shell G/B handling leaked ahead of the active rune owner. Outcome matrices across success/fizzle/backfire/brew and rejection recovery made the focus contract explicit.
3. **Sprint 2 no-op identity regression:** five inventory rejections returned deep-equal clones instead of the exact input `GameState`. The final compatibility aggregate caught what bounded Sprint 3 suites did not.
4. **Approaching-projectile viewpoint regression:** a travel-relative LEFT lane was rendered on the wrong viewer side. A full facing/depth/travel/lane matrix replaced the earlier same-direction-only coverage.

Important cross-discipline catches also strengthened QA: Morpheus found caster-only Shield, duplicated painter validation, and utility pointer bypass; Smith found the invisible formula preview. These confirm that unit correctness, architecture authority, and actual usability require separate gates.

## What went well

- QA expected values were independently derived: Mulberry32 draws, rank floors, depth multipliers, rune order, potion power, unique IDs, and viewer-side projection did not import production expected-value helpers.
- Rejection tests checked atomicity, not just error messages: RNG, costs, XP, inventory, focus, and ownership were all pinned.
- The final criterion matrix prevented evidence-by-memory. Every S3-1..S3-6 row named an independent case or browser artifact.
- The anti-loop guard worked. Phase 4 stopped after two automatic cycles; the formula-preview exception and final stabilization both required explicit User/Oracle scope.
- Stop conditions were honored. Failed aggregates halted downstream gates; Trin did not silently rerun until green.
- Browser evidence was state-correlated, source-aware, and checked `failures: []` plus `browserErrors: []`, rather than treating nonblack screenshots as success.
- Chronology stayed honest: QA-only fixture/harness mistakes, production defects, architecture rejections, UX blockers, and trace unavailability were recorded separately.

## What needs improvement

### Coverage design

- Early projectile tests covered all facings and lanes but only receding/same-direction projectiles. Travel direction must be a first-class projection dimension.
- Bounded phase suites did not preserve the established referential-identity contract for inventory no-ops. Compatibility contracts need explicit sentinels when a dispatcher adds cross-cutting wrappers.
- The first Phase 3 light failure came from a saturated QA fixture, and the first authorized-fix3 browser run used a live 6 Hz snapshot race. Fixture preconditions and deterministic browser synchronization need stronger review before declaring product defects.

### Gate infrastructure

- Parallel `test-q` produced 15 false-negative timeout/interruption failures across render and child-process suites on a loaded workstation. The exact six files passed 72/72 and the full suite 339/339 with one worker and the same 5-second timeout. Final local acceptance must use the resource-bounded target; timeout inflation would have hidden the root cause.
- `judge-trace` masks failure with `|| true`, so Make reports PASS even when no transcript directory exists. The human-readable error prevented a false claim this sprint, but the target's machine status is misleading.
- `sprint3-visual-review` says evidence was “prepared.” Actual UX approval still correctly required Smith. Automation output should distinguish automated smoke completion from human visual approval.

## Concrete QA backlog

| Priority | Backlog item | Acceptance signal |
|---|---|---|
| P0 | Make `test-serial` the documented local final-acceptance aggregate on resource-shared hosts; keep `test-q` for bounded fast feedback | Final-gate docs/Make help name the intended use; one-worker flags and 5 s timeout remain pinned |
| P0 | Make trace availability explicit and machine-readable | `judge-trace` reports PASS, UNAVAILABLE, or FAIL distinctly; unavailable transcripts cannot appear as a green build |
| P1 | Add provider-neutral trace discovery or Codex session support | A Codex workspace produces an actual invocation audit, or an explicit supported-unavailable result with reason |
| P1 | Establish reducer no-op identity contract tests across command domains | Invalid/no-op commands assert `result.state === input`, empty events, unchanged RNG/focus where identity is required |
| P1 | Adopt a standard moving-object projection matrix | Four facings × supported depths × approaching/receding × lanes × offscreen/occlusion is reusable for projectiles and future movers |
| P1 | Add deterministic browser state handshakes | Review scripts wait on tick/state predicates rather than wall-clock snapshots; repeated evidence has stable draw/state markers |
| P1 | Add fixture precondition assertions | Light/effect tests assert unsaturated starting values; inventory/projectile fixtures assert required equipped/visible state before the action |
| P2 | Version the browser evidence schema | Report includes timestamp, source provenance/hash, named checks, state markers, failures, browser errors, and automation-vs-human approval status |
| P2 | Define a compatibility-sentinel set for cross-cutting reducer/render edits | Dispatcher or projection changes automatically run inventory identity, focus ownership, payload, and viewpoint sentinels before phase handoff |
| P2 | Add a criterion-evidence manifest | S3-style criteria link to independent test names and browser checks without manually reconstructing the matrix at final acceptance |

## Recommended QA policy

Use bounded suites during short phases, add compatibility sentinels for cross-cutting changes, and run one serialized full aggregate at final acceptance. Treat browser automation as evidence preparation plus deterministic state checks, with Smith retaining the human usability decision. Never convert unavailable trace data or a masked Make exit into a pass.

## Final lesson

The sprint's hardest failures lived at boundaries: duplicate logical identity, no-op referential identity, travel-relative viewpoint, focus ownership, renderer/reducer authority, and automated-versus-human evidence. Future QA plans should allocate explicit matrix rows to those boundaries before adding more happy-path examples.
