# Sprint 3 Product Contract — Combat, Runic Magic, and Progression

## Goal

Make the existing dungeon slice meaningfully playable beyond exploration: champions improve through use, select weapon actions, launch physical and magical attacks, cast runes, and brew potions through the authentic compact HUD. Sprint 3 establishes deterministic player-combat rules for later Sprint 4 monsters without pulling monster ecology or AI into this sprint.

## Product Principles

- Preserve the pure, deterministic 6 Hz simulation and the responsive 320×200 interface.
- Purist mouse interaction remains complete; keyboard shortcuts are optional QoL and must obey the existing mode setting.
- Original-data mode uses evidenced source facts such as `item[557]` rune glyphs, `item[560]` action names, and `item[14]` damage feedback. Clean-room mode must provide equivalent usable content without claiming original-data identity.
- A failed, blocked, or invalid action must explain itself and must not silently grant experience, consume inventory, duplicate items, or apply damage.
- Sprint acceptance requires both headless rule evidence and actual-browser interaction/visual evidence. Neither substitutes for the other.

## User Stories and Acceptance Criteria

### S3-1 — Usage-Based Champion Progression

As a player, I want each champion to improve in the skills they actually use so that party growth reflects my choices rather than generic character levels.

Acceptance criteria:

1. Every champion has four primary classes—Fighter, Ninja, Priest, and Wizard—with four independently tracked subskills per class (16 subskills total). Every subskill uses this canonical ordered 16-rank sequence: **None, Neophyte, Novice, Apprentice, Journeyman, Craftsman, Artisan, Adept, Expert, Lo Master, Um Master, On Master, Ee Master, Pal Master, Mon Master, Archmaster**.
2. A successful eligible action awards experience only to the champion and subskill that performed it. Rejected commands, UI inspection, and actions with no gameplay effect award none.
3. The same eligible action awards more experience at a deeper configured dungeon depth than at a shallower depth, with deterministic results for the same state and action sequence.
4. Crossing a mastery threshold changes the affected rank exactly once and makes the new rank visible from the champion statistics experience; ordinary progress remains hidden in Purist mode.
5. Rank changes influence explicit action eligibility/effectiveness while base champion attributes remain distinct from earned skill state. Required visible threshold case: a champion at **None** in the applicable Wizard subskill cannot invoke the lowest-power `Lo Ful Ir` fireball and sees an insufficient-skill message; after reaching **Neophyte**, that same champion with the same mana, formula, and valid target can attempt it and receives the normal success/fizzle/backfire result. Architecture may set additional thresholds and numeric scaling, but may not remove this before/after behavior.
6. Existing Resurrect champions retain their trained skills; Reincarnate champions begin from the reset/boosted progression state already promised by Sprint 2.

### S3-2 — Weapon Actions and Combat Feedback

As a player, I want held equipment to offer understandable melee, thrown, and ranged actions so that formation and gear choices matter in real time.

Acceptance criteria:

1. Selecting an occupied action hand opens only the actions valid for that item and champion. Original-data action labels use evidenced `item[560]` names where available; fallback labels remain truthful and usable.
2. Choosing an enabled action commits it once, applies its stamina/ammunition/charge costs once, starts its cooldown once, and closes or updates the action menu without duplicate input.
3. Formation and reach are enforced: a champion who cannot reach the selected lane or target receives clear feedback and causes no damage, cost, cooldown, or experience gain.
4. Melee resolves against a valid adjacent target; thrown and ranged attacks create a directional projectile from the correct party lane. A bounded non-AI combat target is available in the vertical-slice/review scenario so these rules are playable before Sprint 4 AI.
5. Damage is deterministic for the same champion, equipment, target, and random seed/state. The affected target and amount are unambiguous, and original-art mode uses the evidenced `item[14]` damage burst without confusing it with `item[13]` movement art.
6. Disabled actions visibly communicate the blocking reason, including cooldown, formation, stamina, missing ammunition, or invalid target.
7. Existing drag/drop and free throwing remain compatible; adding combat actions does not duplicate, lose, or detach items from the physical inventory model.

### S3-3 — Physical and Magical Projectiles

As a player, I want projectiles and explosions to travel through the visible dungeon consistently so that position, direction, doors, and distance have predictable consequences.

Acceptance criteria:

1. A projectile advances on simulation ticks from its recorded level, tile, direction, lane, power, and owner; identical initial state and actions produce identical paths and events.
2. Solid geometry and closed doors stop applicable projectiles at the first collision. Open passages allow travel, and an impact resolves no more than once.
3. Ranged ammunition, thrown objects, and spell projectiles use the same observable spatial conventions while preserving their distinct inventory and effect rules.
4. An explosive impact applies its configured center/adjacent effects exactly once, emits one coherent visual/audio event, and cannot damage the same target repeatedly from one impact.
5. The viewport shows travel and impact at the correct depth/lane in all four facings; off-screen simulation remains correct without drawing misleading on-screen effects.
6. Ownership is retained so damage, experience, and later kill credit are awarded to the correct champion.

### S3-4 — Authentic 24-Rune Casting Experience

As a player, I want to construct spells from the four six-rune tiers so that magic feels like Dungeon Master rather than a conventional spell list.

Acceptance criteria:

1. The selector exposes all 24 runes in four ordered tiers: Power, Elemental, Form, and Class/Alignment. Original-data mode renders the evidenced `item[557]` rune glyph slots `97..122`; clean-room mode renders distinct equivalent symbols without false provenance.
2. A player can add permitted runes in order, inspect the current formula, remove the most recent rune, clear the formula, and invoke it entirely with the mouse.
3. Optional keyboard rune selection works only when the existing QoL setting enables it and never leaks keystrokes into movement, inventory, or debug overlays while the rune selector owns focus.
4. Each rune has an explicit mana cost affected by power tier. Insufficient mana prevents invocation with clear feedback and no partial effect.
5. Invocation checks the acting champion's applicable Priest or Wizard mastery. Success, fizzle, and backfire outcomes are deterministic from the same state/seed, consume only their defined costs, and provide distinct feedback.
6. Invalid or incomplete formulas fail safely: they create no projectile/effect, grant no experience, and do not consume or duplicate unrelated inventory.
7. Closing the selector or completing an invocation restores focus and input ownership predictably.

### S3-5 — Spell Effects and Potion Brewing

As a player, I want valid rune formulas to create recognizable dungeon effects or potions so that learning magic changes exploration and combat.

Acceptance criteria:

1. The data-defined recipe set supports at least the PRD-promised families: `Ful Ir` fireball, `Des Ew` non-material weakening, `Zo` door opening, party shielding, magical light, and flask-based healing/attribute potions.
2. Projectile spells enter the shared projectile rules; door spells affect only eligible doors; light and shield effects have visible status/duration and expire on deterministic simulation ticks.
3. Brewing requires an Empty Flask in the acting champion's valid possession. A successful brew transforms or replaces exactly one flask with exactly one potion and records its power without duplication.
4. Drinking a potion consumes exactly one potion, applies its named effect/potency once to the intended champion, and leaves inventory/hand ownership consistent.
5. A formula that requires a flask cannot succeed without one and clearly says why. A failed/fizzled brew preserves or consumes the flask only according to an explicit, testable rule.
6. Successful spellcasting and brewing award experience to the correct Priest/Wizard subskill; invalid formulas and blocked attempts award none.
7. Original and clean-room content expose equivalent mechanics even when their art or labels differ.

Minimum shipped potion set:

| Formula | Target | Required effect | Visible result |
|---|---|---|---|
| `<Power> Vi` | Drinker | Restore health, capped at the champion's maximum | Health bar/value rises and a named healing result appears |
| `<Power> Ya` | Drinker | Restore stamina, capped at maximum | Stamina bar/value rises and a named stamina result appears |
| `<Power> Ee` | Drinker | Restore mana, capped at maximum | Mana bar/value rises and a named mana result appears |
| `<Power> Ku` | Drinker | Temporarily increase Strength | Strength/status display shows the bonus and remaining effect; expiry is visible |
| `<Power> Bro` | Drinker | Reduce poison severity, curing it when the scaled reduction reaches the remaining severity | Poison status visibly decreases or clears and a named antivenom result appears |

`<Power>` is one of **Lo, Um, On, Ee, Pal, Mon**. Higher power must never produce a weaker result: it increases restorative magnitude, or attribute magnitude and/or duration, while also increasing mana cost and skill requirement. Exact numeric values belong to architecture, but the ordering and user-visible difference are mandatory.

Brewing outcome contract:

| Outcome | Mana | Empty Flask | Gameplay effect and required feedback |
|---|---|---|---|
| Invalid/incomplete formula | Consume none | Preserve it | No potion/effect/experience; show that the formula is invalid |
| Insufficient mana or insufficient skill | Consume none | Preserve it | Invocation is prevented; name the missing resource or skill |
| Fizzle after an eligible attempt | Consume the full formula cost | Preserve it | No potion/effect/experience; show a distinct fizzle result |
| Backfire after an eligible attempt | Consume the full formula cost | Destroy exactly one selected Empty Flask | Create no potion, grant no experience, apply deterministic health damage to the brewer, and show distinct backfire plus shattered-flask feedback |
| Success | Consume the full formula cost | Transform exactly one selected Empty Flask | Create exactly one potion at the invoked power and show its name/power |

### S3-6 — Playable Combat-and-Magic UX

As a player, I want combat, progression, and magic to remain readable in the constrained original HUD so that real-time play does not become modal or confusing.

Acceptance criteria:

1. Action and rune panels do not obscure critical champion health/stamina/mana state or leave stale overlays after closing, sleeping, switching inventories, death, or restart.
2. Pointer hit regions match visible controls at canonical 320×200 coordinates and remain correct at integer display scales.
3. Cooldown, insufficient-resource, fizzle/backfire, impact, damage, rank-up, and potion results are distinguishable without relying on browser console output.
4. Mouse-only Purist play can select and complete every shipped action, spell, and potion flow. QoL shortcuts accelerate the same commands rather than exposing separate mechanics.
5. Actual-browser review covers original and clean-room sources, mouse and QoL keyboard paths, all four facings, representative near/far projectiles, success/failure states, and focus restoration with zero uncaught errors.

## In Scope

- Per-champion 4-class/16-subskill usage progression and visible mastery ranks.
- Item-driven melee, thrown, and ranged action selection with costs, cooldowns, reach, and feedback.
- Deterministic physical/magical projectile travel, collision, impacts, and bounded explosions.
- Complete 24-rune selection grammar and data-defined spell/potion recipes needed by the stories above.
- A bounded non-AI combat target for the playable vertical slice and acceptance review.
- Original-source and clean-room UX parity, with provenance kept explicit.
- Headless rules, integration tests, and actual-browser visual/interaction evidence for every accepted story.

## Out of Scope

- Sprint 4 monster roster, autonomous AI, scent/pathfinding, monster formations, generators, theft behavior, or full monster balancing.
- Full DM1 campaign/content polish, Firestaff/Lord Chaos endings, saving, file-picker import, or IndexedDB work (Sprint 5).
- Campaign-pack loading, runtime PNG pack replacement, or semantic identification of every remaining sprite.
- New deployment, hosting, service, environment-variable, or CI infrastructure.
- Multiplayer, pause-based combat, conventional hotbar spell lists, or replacing Purist mouse controls.

## Definition of Done

- Smith explicitly approves these stories and later the architecture's user impact.
- Every accepted criterion maps to a bounded task and independent evidence; final audit covers all criteria rather than only phase-local checks.
- Simulation evidence proves determinism, ownership, no duplication, and no experience on invalid actions.
- Actual-browser evidence proves the real draw/input paths; nonblack screenshots or unit tests alone are not visual acceptance.
- Project automation runs serially through `bobp make`; shared output writers are not run concurrently.
- The known trace-audit `jinja2` issue is reported honestly if still unavailable and is never counted as a passing product gate.
- No commit, push, release, or deployment is implied by local sprint completion.

## Final Delivery Evidence (2026-11-09)

All `38/38` accepted criteria were approved locally. Delivered behavior includes 16-subskill progression, item-driven combat actions, typed physical/ammunition/spell projectiles, the complete 24-rune selector and formula grammar, five potion families across six powers, and mouse-complete 320×200 action/rune/progression flows for original and clean-room sources.

Chronology is part of the record: Phase 2 corrected explosion target deduplication; Phase 3 corrected Shield to its party-wide contract; Phase 4 closed two ordinary fix cycles, then used one user-authorized exceptional third cycle limited to the visible current-formula preview. Final audit stabilization corrected unchanged inventory commands that had lost referential identity and reverse-travel approaching-LEFT projection. Focused stabilization passed `35/35` tests.

The first post-stabilization parallel aggregate timed out in unrelated render/export/review files under worker/resource contention rather than producing a common product assertion failure. After separate user authorization, `test-serial` disabled file parallelism, used one worker and retained the unchanged `5000 ms` timeout. The diagnostic passed `72/72`; the full aggregate passed `339/339`, followed by lint, strict TypeScript and production build. Fresh browser review passed `10/10` scenarios for each source, including `16` projectile geometry cases per source, with empty failure and error lists. Judge trace was invoked but unavailable because no Claude project directory existed and is not counted as a pass. This is local acceptance only; no commit, push, release or deployment is claimed.
