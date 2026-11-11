# Sprint 3 Architecture Retrospective

## Outcome

Sprint 3 delivered the ADR-014/A1-A12 architecture successfully: deterministic progression, combat, typed projectiles, magic/potions, effects, one interaction owner, and source-aware presentation all remained inside the existing pure reducer. Final acceptance passed 38/38 criteria, 339/339 serialized aggregate tests, strict quality/build gates, and fresh two-source browser approval.

The main lesson is not that the architecture was wrong; it is that several boundaries were specified correctly but verified too late or implemented in more than one place before convergence. The fixes consistently improved authority concentration rather than changing the design.

## Decisions That Worked

- **One reducer, clock, and RNG authority:** `dispatchCommand`, `stepSingleTick`, and `rng.ts::nextRandom` made fixed draw budgets and invalid-action atomicity reviewable. Deterministic failure evidence was precise enough to distinguish product defects from harness timing.
- **XP-derived ranks:** immutable 16-track experience avoided rank synchronization bugs. Recruitment migration, rank messages, attribute derivation, and spell gates all shared one progression authority.
- **Validate → commit → resolve → award:** combat and magic transaction ordering protected RNG, costs, cooldowns, inventory, targets, and XP on rejection. Extracting the shared combat validator completed the intended boundary.
- **Typed shared projectiles:** item, ammunition, and spell payloads reused one travel/impact engine. Stable ownership and exactly-once resolution survived the sprint; the late lane issue was isolated to projection, not simulation.
- **Absolute-tick derived effects:** Shield, Light, and Ku remained derivations over base state. The Shield correction strengthened party semantics without adding a second mutable truth.
- **Atomic item identity:** selected-flask transforms and normalized inventory ownership prevented potion duplication and allowed exact same-ID assertions.
- **One interaction owner plus shared rectangles:** after fixes, modal/input priority, Purist/QoL translation, inventory/cursor compatibility, and focus recovery were explicit and testable.
- **Source provenance as a presentation boundary:** clean-room labels/art and `AMIGA_GRAPHICS_DAT` glyphs/labels/damage feedback remained semantically separated, with visible fallback instead of index-based identity inference.
- **Passive review targets:** the vertical slice proved combat without leaking Sprint 4 autonomous-monster scope into Sprint 3.

## Corrections and What They Taught

1. **Duplicate explosion identities:** exactly-once rules require canonical identity normalization before effect iteration, not merely a set at the final event boundary.
2. **Caster-only Shield:** effect storage must match the user-visible scope. Party effects need explicit membership, provenance, replacement, derivation, and expiry semantics in the architecture checklist.
3. **Rune focus and `G/B` leakage:** focus ownership is an end-to-end property across browser shell, input translation, reducer lifecycle, and rendering—not just a discriminated state type.
4. **Duplicated combat disabled logic:** presentation must consume a pure engine query; it must not independently reproduce eligibility rules. A UI that says `READY` while the reducer rejects is an authority defect even if state remains safe.
5. **Utility pointer bypass:** input priority must be tested as a complete ordered matrix across pointer and keyboard, not inferred from individual handler tests.
6. **Invisible formula buffer:** state correctness and nonblack rendering do not establish usability. Every editable/ordered user state needs an explicit visible readback and state-to-pixel browser assertion before phase approval.
7. **Inventory no-op cloning:** reducer composition must preserve referential identity when a child reducer returns the input. Lifecycle cleanup belongs only on accepted transitions.
8. **Approaching lane projection:** `LEFT/RIGHT` was travel-relative but consumed as viewer-relative. Coordinate-frame meaning must be encoded at transform boundaries and tested in both travel directions.
9. **Parallel aggregate timeouts:** a red aggregate remains red even when focused evidence is green. The correct response was bounded diagnosis and serialized workers, not timeout inflation or repeated unchanged reruns.
10. **Anti-loop enforcement:** stopping after two automatic Phase 4 cycles exposed the missing visual contract to User/Oracle review and kept fix 3 presentation-only. This prevented a broad, unaudited cleanup cycle.

## Separation and Dependency Review

- Engine rules did not acquire DOM, Canvas, parser, or sprite dependencies.
- Input continued to translate canonical coordinates into commands rather than mutate gameplay state.
- Rendering remained a read-only consumer of state/events and engine queries. The formula preview and projectile projection corrections stayed in presentation.
- Catalogs remained semantic data; source-specific facts stayed behind `GraphicsBundle.source` checks and adapters.
- `GameState.items` remained the physical-item authority; spells did not become inventory objects.
- Sprint 4 AI, Sprint 5 save/campaign work, dependencies, services, deployment, commit, and push stayed out of scope.

## Concrete Architecture Backlog

### AB-1 — Centralize interaction transition policy (high)

Create one pure interaction-lifecycle policy used by reducer and input tests for open, capture, accepted-transition close, rejected-transition preservation, sleep, mirror, death, restart, and inventory. Preserve exact input-state identity on no-op. Acceptance: a table-driven pointer/keyboard/reducer matrix covers every owner and transition without duplicated priority lists.

### AB-2 — Introduce explicit spatial coordinate-frame types (high, before Sprint 4 AI)

Distinguish world position, projectile-travel lane, party-relative lane, and viewer-screen side through named types/helpers. Centralize world→view projection for projectiles, impacts, targets, and future monsters. Acceptance: all four facings, receding/approaching/transverse directions, both lanes, lateral offsets, depths, and off-screen cases are independently covered without boolean sign conventions in painters.

### AB-3 — Require presentation contracts in phase design (high)

For every new editable/status state, define its visible readback, empty state, failure preservation, source modes, and state-to-pixel/browser assertions before implementation. Acceptance: phase gates cannot pass on state-only or nonblack evidence when the criterion is user-visible.

### AB-4 — Split interaction presentation adapters (medium)

Separate action, rune/formula, and progression painters behind a small right-deck composer. Centralize source-aware action-label, rune-glyph, and damage-feedback selection in presentation adapters rather than scattered source checks. Acceptance: painters consume semantic presentation records and contain no rule eligibility or source-index inference.

### AB-5 — Standardize pure validation/transaction results (medium)

Adopt a reusable typed result pattern for `validate`, accepted resolved inputs, canonical failure reason, and no-op/committed transition metadata across combat, magic, inventory wrappers, and future AI actions. Acceptance: reducers and presentation share queries without duplicating rules, and wrapper lifecycle behavior is driven by committed/no-op status rather than object cloning assumptions.

### AB-6 — Formalize party-wide effect semantics (medium)

Document and encode target membership, caster provenance, replacement/stacking, magnitude derivation, base-state immutability, absolute expiry, and event cardinality for every effect scope. Acceptance: single-target, party-wide, and future area effects use one explicit model and exact expiry/event tests.

### AB-7 — Protect the passive-target seam for Sprint 4 (medium)

Before adding autonomous monsters, define a combat-target interface separating targetable health/lane identity from AI scheduling, movement, attacks, and inventory. Acceptance: player combat/projectile code depends on the target seam, not the monster controller, and passive review fixtures remain valid.

### AB-8 — Make serialized verification and trace health first-class (high tooling debt)

Keep `test-serial` as the resource-bounded final aggregate path unless measured parallel stability is restored. Repair trace discovery/dependencies and remove masked success semantics so unavailable/error/passed are distinct. Acceptance: one documented final target reports deterministic product results, retains the 5-second deadline, and trace failures propagate honestly without `|| true`.

### AB-9 — Plan Sprint 5 state migration explicitly (medium, before save work)

Inventory the new progression, cooldown, effects, projectiles, passive targets, rune formulas, potion metadata, and interaction state before adding persistence. Acceptance: versioned migration/default rules identify persistent versus ephemeral fields, preserve item identity, and reproduce deterministic state without serializing presentation-only data.

## Recommendation to Cypher

Prioritize AB-1, AB-2, AB-3, and AB-8 as enabling work before broad new gameplay scope. Schedule AB-7 immediately before Sprint 4 monster AI and AB-9 immediately before Sprint 5 persistence. AB-4 through AB-6 are bounded refactors that should attach to the next feature touching those seams rather than form an unbounded cleanup sprint.

No Sprint 3 code, tests, task board, or global documentation was changed for this retrospective.
