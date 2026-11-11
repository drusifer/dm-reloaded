# Sprint 3 Phase 2 Architecture Review

## Verdict

**APPROVED after fix cycle 1.** `S3-P2.1` and `S3-P2.2` satisfy architecture A2-A8. Phase 3 may begin after Mouse records the sole-board checkpoint.

## Architecture Findings

- `EXECUTE_COMBAT_ACTION` enters through the sole reducer. Validation completes before RNG, stamina, cooldown, ammunition, projectile, damage, or XP mutation.
- Eligible combat consumes the fixed two-draw hit/damage budget and commits costs once. Rejected actions preserve RNG, party, targets, ownership, cooldowns, and progression apart from explicit recoverable feedback.
- Immutable combat definitions remain in `src/data/combatCatalog.ts`; pure transactions remain in `src/engine/combat.ts`. Render/input and source-art concerns did not leak into the rule modules.
- `CombatTargetState` is a passive review seam only. Targets have no tick, attack, pathfinding, scent, inventory, or Sprint 4 AI behavior.
- Item, ammunition, and spell payloads share one stable projectile tick path while retaining distinct physical landing and inventory behavior. The compatibility `itemId` projection is preserved for existing item rendering and is null for spells.
- Owner champion, lane, facing, geometry, energy, pit/door/wall/teleporter behavior, and physical item identity survive the generalized path. Existing free throws continue through the same engine.
- Impact removes a projectile in the same reduction and emits once. Explosions collect stable first-seen unique target IDs before mutation.
- Independent QA found the original explosion implementation could emit duplicate damage for duplicate records sharing one ID. Fix cycle 1 made first-seen identity canonical in both collection and `damageTarget`; the unchanged QA assertion and compatibility matrix passed afterward.
- Phase 3 spell payload infrastructure is a typed seam only. No rune catalog, magic transaction, potion, timed effect, Phase 4 panel/input, monster AI, deployment, or other later-phase behavior was implemented.

## Evidence Reviewed

- Neo pre-QA focused 7/7, bounded 50/50, render 43/43, lint/types passed.
- Initial Trin independent UAT: 7/8 with one exactly-once explosion failure.
- Neo fix 1: prior failing independent 8/8, bounded 41/41, lint/types passed.
- Trin post-fix bounded independent/engine/render aggregate: 90/90 across nine files; diff-check passed.
- `judge-trace` was invoked but remains unavailable because this Codex workspace has no Claude project directory. The masked target is not claimed as a pass.

## Phase 3 Constraints

- Magic must validate formula, skill, mana, and flask before consuming RNG or costs.
- Spell payloads must use the shared projectile engine without entering `GameState.items` or landing as inventory.
- Potion transformations must preserve same-ID atomic ownership rules and the accepted invalid/fizzle/backfire outcomes.
- Timed effects must use absolute ticks and remain derived from, rather than overwrite, base champion attributes and torch state.

