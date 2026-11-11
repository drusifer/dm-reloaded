# Sprint 3 Gate 1 — User Story Review

## Verdict

**Needs revision.** The six-story boundary is valuable and coherent, but three product-level outcomes remain deferred rather than testable. Architecture must not be asked to invent these user-facing rules.

## What Works

- The sprint has a clear playable goal and correctly excludes Sprint 4 AI and Sprint 5 campaign/save scope.
- Mouse-only Purist completion and optional QoL acceleration are explicit and consistent.
- Failure paths generally prevent silent cost, cooldown, experience, damage, duplication, and input leakage.
- Original-data and clean-room parity preserve honest provenance.
- Headless determinism and actual-browser evidence are complementary mandatory gates.

## Blocking Findings

### 1. Mastery progression is not fully specified

S3-1 references “the 16 mastery ranks defined by the product requirements,” but the PRD only names a partial sequence with an ellipsis. S3-1.5 says ranks “can” affect eligibility or effectiveness without requiring any observable effect.

- **Heuristics:** #1 Visibility of system status; #6 Recognition rather than recall; #10 Help and documentation.
- **Required fix:** enumerate the canonical ordered 16 ranks in the product contract and require at least one concrete, visible rank-dependent eligibility/effectiveness behavior with a testable before/after outcome.

### 2. Potion scope is open-ended

S3-5 requires “healing/attribute potions” but does not identify the minimum shipped potion formulas/effects. “At least” leaves completeness and acceptance subjective.

- **Heuristics:** #2 Match with the real world; #4 Consistency and standards; #6 Recognition rather than recall.
- **Required fix:** name the bounded minimum potion recipe/effect set for Sprint 3, including target, potency/power behavior, and visible result.

### 3. Failed brewing inventory behavior is undecided

S3-5.5 permits a failed/fizzled brew to preserve or consume the flask according to a later rule. That is a player-facing consequence, not merely an implementation mechanism.

- **Heuristics:** #5 Error prevention; #9 Error recognition and recovery.
- **Required fix:** choose the product rule now for invalid, insufficient-skill/fizzle, and backfire brewing outcomes, including mana and flask consumption and the feedback shown.

## Non-Blocking Architecture Notes

- Architecture may define numeric thresholds, XP multipliers, damage formulas, cooldown durations, and deterministic seed mechanics after the user-visible outcomes above are fixed.
- Phase planning should preserve a final story-to-evidence audit and actual 320×200 interaction review.
