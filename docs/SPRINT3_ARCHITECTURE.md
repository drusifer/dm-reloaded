# Sprint 3 Architecture — Combat, Runic Magic, and Progression

## Status and Boundary

This architecture implements the Smith-approved contract in `docs/SPRINT3.md`. It adds deterministic player combat, progression, magic, potions, and a bounded non-AI review target. It does not add Sprint 4 monster AI or Sprint 5 campaign/save systems.

VIA inspection confirms the existing extension seams:

- `src/engine/simulation.ts::dispatchCommand` is the single pure command reducer.
- `src/engine/simulation.ts::stepSingleTick` already sequences doors, projectiles, and survival at 6 Hz.
- `src/engine/projectiles.ts` already owns lane-aware physical flight, geometry, door, pit, and teleporter behavior.
- `GameState.items` plus `ItemInstanceId` is the sole item-ownership authority.
- `src/input/inputController.ts` maps canonical 320×200 pointer/keyboard input to `GameCommand`.
- `src/render/index.ts::renderFrame` composes the viewport, HUD, inventory, held item, and terminal overlays.
- `GraphicsBundle.source`, `systemFont`, sprites, and item catalog provide the source-provenance boundary.

## Architectural Decisions

### A1 — One reducer and one clock

All Sprint 3 interaction becomes `GameCommand` handled through `dispatchCommand`. Persistent effects and projectiles advance only from `TICK` through `stepSingleTick`. UI controllers may translate input but may not mutate combat state, inventory, mana, XP, cooldowns, targets, or effects.

Tick order becomes:

1. due actuators;
2. door animation;
3. cooldown/status expiry and duration updates;
4. projectile travel and exactly-once impact resolution;
5. survival/death.

The order is fixed and covered by integration tests. A target killed by a projectile cannot receive survival or duplicate-impact processing later in the same tick.

### A2 — Existing `rngState` is the only random authority

Add `src/engine/rng.ts` with a pure, specified integer transition returning `{ value, nextState }`. `Math.random`, wall time, array hash order, and DOM state are forbidden in rules.

Every eligible command has a fixed draw budget:

- blocked or invalid action: zero draws;
- eligible spell/brew attempt: one outcome draw;
- eligible damaging action: one hit/outcome draw and one damage draw;
- backfire damage derives from the committed outcome draw and formula power, not an extra hidden draw.

Validation runs before draws and costs. The reducer commits `nextState` only with the corresponding action outcome, so identical state plus command produces identical state and events.

### A3 — Progression has one runtime authority

Add `src/engine/progression.ts`:

- `SKILL_RANK_NAMES`: the accepted 16-name ordered tuple;
- `SKILL_THRESHOLDS`: one immutable, monotonic 16-entry table;
- `rankForExperience(xp)` and `experienceFloorForRank(rank)`;
- `awardSkillExperience(state, championId, subskill, baseXp)`;
- `depthExperienceMultiplier(level.depth)`.

`ChampionDefinition.skills` remains source input only. Recruitment materializes a new `ChampionProgression` in `ChampionState`:

```ts
interface ChampionProgression {
  readonly experience: readonly number[]; // exactly 16 entries
}
```

Resurrect converts each imported/source rank to the corresponding threshold floor. Reincarnate starts all 16 tracks at the None floor; its already-delivered attribute boost remains separate. Rank is always derived from XP, never stored as a second mutable truth.

Only successful gameplay effects call `awardSkillExperience`. UI inspection, validation failure, miss with no defined practice credit, invalid formula, fizzle, and backfire award none. Rank crossing emits one `SKILL_RANK_GAINED` event and one visible message. The required Wizard threshold is enforced in magic validation: None blocks `Lo Ful Ir`; Neophyte permits an eligible outcome roll.

### A4 — Validate, commit costs, resolve effect, then award

Combat and magic share a four-stage transaction pattern:

1. **Validate** ownership, actor, reach/lane, target, cooldown, stamina/mana, ammunition/charge, formula, skill, and flask.
2. **Commit** the explicitly specified costs and RNG transition once.
3. **Resolve** exactly one action outcome and its state/events.
4. **Award** XP only for the successful effect defined by the action/recipe.

Validation returns a typed failure code and display text without mutation. This prevents partial mana use, detached inventory, duplicate projectiles, cooldown on rejection, or XP from inspection/failure.

### A5 — Data-driven actions and recipes, pure rule engines

Add these modules:

| Module | Responsibility |
|---|---|
| `src/data/combatCatalog.ts` | Immutable item/action definitions: action id, label key, required hand/item facts, reach, lane rule, costs, cooldown, subskill, projectile/effect kind. |
| `src/data/magicCatalog.ts` | 24 runes, tier/order, mana costs, accepted formulas, skill thresholds, effect/potion definitions and power scaling. |
| `src/engine/combat.ts` | Action validation/transaction, formation reach, damage, cooldowns, bounded targets, XP handoff. |
| `src/engine/magic.ts` | Rune-buffer commands, formula validation, deterministic success/fizzle/backfire, spell/potion transactions. |
| `src/engine/progression.ts` | XP, depth multiplier, ranks, rank-up events. |
| `src/engine/effects.ts` | Timed light/shield/attribute effects and poison-severity updates/expiry. |
| `src/engine/rng.ts` | The only deterministic RNG transition. |

Catalogs contain no `GameState` mutation. Engines contain no Canvas, DOM, source parsing, or sprite selection.

### A6 — Generalize the projectile engine; do not fork it

Replace the item-only projectile payload with a discriminated payload while retaining current spatial fields and behavior:

```ts
type ProjectilePayload =
  | { readonly kind: 'ITEM'; readonly itemId: ItemInstanceId }
  | { readonly kind: 'AMMUNITION'; readonly itemId: ItemInstanceId; readonly actionId: string }
  | { readonly kind: 'SPELL'; readonly spellId: string; readonly effectId: string };

interface ProjectileState {
  readonly id: string;
  readonly ownerChampionId: string;
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly direction: Direction;
  readonly lane: 'LEFT' | 'RIGHT';
  readonly power: number;
  readonly stepEnergyCost: number;
  readonly payload: ProjectilePayload;
}
```

Current free throws remain `ITEM` and land through `landItem`. Ranged ammunition remains a normalized owned item until transaction commit, is removed from its slot/quiver exactly once, and lands or is consumed according to its action definition. `SPELL` payloads never enter `GameState.items` and never land as inventory.

`stepProjectiles` keeps stable array order. On entering a tile it checks blocking geometry, then a target in the projectile lane, then range exhaustion. `resolveProjectileImpact` removes the projectile in the same reduction and emits one `PROJECTILE_IMPACT`. Explosions collect unique target IDs before applying center/adjacent effects, preventing repeat damage from one impact. Ownership travels on the projectile for damage, XP, and later Sprint 4 kill credit.

### A7 — Bounded targets are a combat seam, not monster AI

Add immutable `CombatTargetState` records to `GameState.combatTargets` with id, level, tile, lane, traits, max/current health, and defeated state. They have no pathfinding, turns, attacks, scent, inventory, or autonomous tick behavior.

The production campaigns need not gain targets. `createSprint3ReviewScenario(bundle)` deterministically adds documented training targets for unit, integration, render, and actual-browser review. This keeps Sprint 4 out of scope while making every attack and spell observable.

### A8 — Cooldowns and timed effects use absolute ticks

`ChampionState.actionCooldowns` maps action/hand keys to `readyAtTick`; no decrement loop is needed. Timed effects use `{ kind, magnitude, expiresAtTick, sourceChampionId }`. `effects.ts` derives effective strength/shield/light while preserving base attributes, and removes expired effects during the fixed tick stage.

Add `poisonSeverity: number` to champion runtime state, initialized to zero. The Bro potion reduces this value and clears it at zero. Ku is a timed derived Strength bonus. Light contributes through the existing party-light derivation rather than overwriting torch state. Shield is a derived mitigation effect. Effect changes emit visible status events/messages.

### A9 — Potion ownership is an atomic item transformation

Extend `ItemInstance` with optional immutable potion metadata:

```ts
readonly potion?: { readonly recipeId: string; readonly power: 0 | 1 | 2 | 3 | 4 | 5 };
```

The rune panel stores a selected `flaskId` that must still be reachable from the acting champion's action hands, pouch, or backpack at invocation. Validation rejects stale/non-owned IDs.

- invalid, incomplete, insufficient mana, or insufficient skill: no RNG, mana, flask, effect, or XP change;
- fizzle: commit full mana and one outcome draw; preserve flask;
- backfire: commit full mana and draw, remove exactly the selected flask ID from its owner and `GameState.items`, damage the brewer deterministically, create no potion;
- success: commit full mana and draw, replace the same instance ID atomically with the recipe's potion definition/metadata, create no second item.

Drinking routes through the inventory engine's existing consume command into `magic.ts::consumePotion`; it removes one item and applies one effect to the specified champion.

### A10 — A single canvas interaction mode owns focus

Add `GameState.interaction` as a discriminated union:

```ts
type InteractionState =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'ACTION_MENU'; readonly championIndex: number; readonly hand: 'leftHand' | 'rightHand' }
  | { readonly kind: 'RUNE_PANEL'; readonly championIndex: number; readonly runes: readonly RuneId[]; readonly flaskId: ItemInstanceId | null }
  | { readonly kind: 'PROGRESSION_VIEW'; readonly championIndex: number };
```

New commands open/close the mode, select an action/rune/flask, remove/clear runes, and invoke. Opening inventory, sleeping, death, restart, or a mirror closes Sprint 3 interaction state. Executing an action closes its menu; rune invocation clears the formula after success/fizzle/backfire and preserves it on pre-validation failure so the player can recover.

Input priority is explicit:

1. game-over restart;
2. sleep wake;
3. mirror modal;
4. active Sprint 3 interaction mode;
5. inventory;
6. ordinary HUD/viewport/movement.

When a rune panel is active, `Escape` closes it, mouse controls every operation, and QoL rune shortcuts are translated only there. Purist mode ignores rune keyboard shortcuts. No rune key reaches movement, inventory, soundboard, or catalog handlers. Main's existing editable-target guard remains unchanged.

An empty-cursor primary click on an occupied top-HUD action hand opens its action menu. A carried cursor item or open inventory retains the existing swap/drag behavior, preserving Sprint 2 ownership semantics.

### A11 — Panels use the right deck and preserve champion status

Add `actionPanelPainter.ts` and `runePanelPainter.ts`; progression details extend the existing champion stats experience. Layout rectangles live only in `render/layout.ts` and are shared with input hit testing.

Action/rune panels replace the right control deck at `x=224..319, y=33..168`; they never cover champion health/stamina/mana at `y=0..28` or the message strip. They include a visible close control and disabled-reason/status text. `renderFrame` keeps a single overlay priority so mirror, sleep, inventory, action/rune, death, and restart cannot leave stale layers.

The viewport painter consumes projectile/impact presentation records derived from state/events and draws correct lane/depth/facing geometry. Original mode uses source-guarded semantic presentation for item 14 damage feedback and `item[557]` rune slots 97..122. Item 13 is never a damage fallback. Clean-room mode supplies distinct rune symbols and procedural damage feedback without original identity claims.

### A12 — Source facts stay in adapters

Extend `GraphicsBundle` with decoded, optional original action labels from `item[560]`; the clean-room bundle supplies equivalent canonical fallback labels. A presentation adapter selects labels and rune glyphs using `GraphicsBundle.source`:

- `AMIGA_GRAPHICS_DAT`: may use verified item 560 labels, item 557 rune codepoints, and semantic original sprite 14;
- `CLEAN_ROOM`: uses explicit fallback labels/symbols/art and never infers identity from matching index or dimensions.

Rule catalogs refer to semantic keys, never raw sprite/font indices. Missing original presentation data falls back visibly without altering combat mechanics.

## Command and Event Surface

Representative new commands:

- `OPEN_ACTION_MENU`, `CLOSE_INTERACTION`, `EXECUTE_ACTION`;
- `OPEN_RUNE_PANEL`, `ADD_RUNE`, `REMOVE_RUNE`, `CLEAR_RUNES`, `SELECT_BREW_FLASK`, `INVOKE_RUNES`;
- `OPEN_PROGRESSION_VIEW`.

Representative events:

- `ACTION_REJECTED`, `ACTION_EXECUTED`, `COOLDOWN_STARTED`;
- `DAMAGE_APPLIED`, `PROJECTILE_LAUNCHED`, `PROJECTILE_IMPACT`, `EXPLOSION_RESOLVED`;
- `SPELL_SUCCEEDED`, `SPELL_FIZZLED`, `SPELL_BACKFIRED`, `POTION_BREWED`, `POTION_CONSUMED`;
- `SKILL_XP_AWARDED`, `SKILL_RANK_GAINED`, `STATUS_EFFECT_CHANGED`;
- existing `MESSAGE_LOGGED` and `SOUND_CUE` remain the visible/audio adapter seam.

Events describe committed results only. A rejected action emits `ACTION_REJECTED` plus a message but no cost/cooldown/damage/XP event.

## Dependency Flow

```text
combatCatalog / magicCatalog / source presentation facts
                         |
                         v
input -> GameCommand -> dispatchCommand
                         |
          +--------------+----------------+
          v              v                v
     progression       combat           magic
          |              |                |
          +---------- projectiles --------+
                         |
                    effects/items
                         |
                GameState + EngineEvent
                         |
            render / audio presentation
```

Dependencies point inward to pure state and rule modules. Render, input, audio, and source adapters do not call each other to change rules.

## Verification Strategy

### Headless rule evidence

- progression: 16 tracks, threshold boundaries, one rank event, depth multiplier, Resurrect/Reincarnate materialization, no XP for every blocked outcome;
- combat: action availability, formation/reach/lane, exact costs/cooldowns, stable RNG, item ownership and free-throw compatibility;
- projectiles: all four facings/two lanes, walls, doors, pits, teleporters, range, target hit, unique explosion targets, physical landing vs spell disappearance;
- magic: all 24 ordered runes, formula editing, mana/skill gates, required None→Neophyte fireball case, deterministic success/fizzle/backfire;
- potions: five required recipes across powers, monotonic scaling, exact selected-flask preservation/destruction/transformation, one-item consumption, poison/effect expiry;
- lifecycle: sleep, death, inventory switch, mirror, restart, and close clear interaction ownership.

### Render and input evidence

- exact shared layout rectangles at native 320×200 and integer-scaled client mapping;
- original and clean-room rune/action/damage presentations with provenance-negative fixtures;
- champion bars remain visible under every panel;
- projectile and impact markers at near/far depths, left/right lanes, and four facings;
- pointer-only completion of every shipped action/spell/potion path;
- QoL shortcuts enabled/disabled, focus capture, Escape restore, and no command leakage.

### Independent and actual-browser gates

Trin owns independent tests that do not reuse production expected-value helpers. Browser evidence uses the bounded review scenario with original and clean-room sources, success and all specified failure outcomes, screenshots plus interaction assertions, and zero uncaught errors. Nonblack screenshots do not prove the intended draw path; known markers/pixels and state transitions must be asserted separately.

All project automation remains serial through `bobp make`. The trace audit is reported unavailable if `jinja2` remains missing and never substitutes for product evidence.

## Acceptance-Criterion Trace Map

| Story | Architecture coverage |
|---|---|
| S3-1 | A2–A4, progression module, recruitment materialization, rank/XP events and headless boundaries |
| S3-2 | A4–A5, combat catalog/engine, absolute cooldowns, interaction mode, action panel, inventory compatibility |
| S3-3 | A6–A7, shared lane projectile payloads, unique impact/explosion resolution, viewport evidence |
| S3-4 | A2, A4–A5, A10–A12, 24-rune catalog, source-aware glyphs, focus ownership |
| S3-5 | A4–A5, A8–A9, recipes, effects, exact flask transactions and potion consumption |
| S3-6 | A10–A12, shared layout, overlay priority, messages/events, actual-browser matrix |

## Compatibility and Migration Constraints

- Existing Sprint 1/2 commands and public behavior remain source-compatible.
- Existing physical throws retain landing, plates, doors, pits, teleporters, and inventory ownership.
- `ChampionDefinition.skills` input remains accepted; runtime progression is materialized deterministically during state creation/recruitment.
- Existing raw sprite exports, manifest bytes/schema, catalog identities, lighting transforms, and original-data parsing remain unchanged except for adding a non-breaking decoded action-label field.
- Campaign data receives no required monster/AI schema. Review targets are scenario fixtures.
- No new runtime dependency, service, environment variable, deployment, commit, or push is part of this sprint plan.

## Implementation and Verification Outcome (2026-11-09)

Morpheus approved A1–A12 after final stabilization. The delivered implementation preserves the command/tick, RNG, XP, item-ownership, source-provenance and one-interaction-owner boundaries above. Phase corrections remained bounded: unique explosion targets in Phase 2, party-wide Shield in Phase 3, two ordinary Phase 4 fix cycles plus one user-authorized presentation-only current-formula preview cycle, then final identity-preserving inventory no-ops and travel-relative approaching-projectile projection.

Final verification passed all `38/38` contract criteria, focused stabilization `35/35`, serialized diagnostic `72/72`, full aggregate `339/339`, lint, strict TypeScript and production build. Fresh actual-browser evidence passed `10/10` original and `10/10` clean-room scenarios, including `16` projectile geometry cases per source, with no captured failures or errors. The initial parallel aggregate timeout was diagnosed as cross-file resource contention; the authorized serial target changed scheduling only, retained the `5000 ms` timeout, and did not alter tests or product behavior. Judge trace remained unavailable because no Claude project directory existed. No commit, push, release or deployment is claimed.
