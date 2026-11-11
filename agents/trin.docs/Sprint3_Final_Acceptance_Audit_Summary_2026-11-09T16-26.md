# Sprint 3 P5.1 Final Acceptance Audit — BLOCKED

Date: 2026-11-09 16:26 EST  
Persona: Trin  
Scope: Sprint 3 S3-1 through S3-6, architecture A1-A12, and Sprint 1/2 regression acceptance

## Result

**BLOCKED.** The acceptance criteria have independent evidence, but the one-shot final aggregate gate failed at 16:25:49 EST: **47/49 files passed and 327/333 tests passed; 2 files and 6 tests failed**. Per P5.1 instructions, Trin stopped immediately. Lint, typecheck, build, fresh two-source Chromium review, and judge trace were not run against this failed source state. No production code or `task.md` was changed.

## Criterion-to-independent-evidence matrix

| Criterion | Independent evidence | Audit |
|---|---|---|
| S3-1.1 — 16 subskills/ranks | `derives every mastery boundary...` checks all 16 independent XP floors | Covered |
| S3-1.2 — eligible owner/subskill; no invalid XP | `awards only one track...`; `keeps rejected awards...` | Covered |
| S3-1.3 — deterministic depth multiplier | `awards only one track...` pins depth 2 multiplier to 9 XP | Covered |
| S3-1.4 — exactly one visible rank event | Same case pins one `SKILL_RANK_GAINED` and one message | Covered |
| S3-1.5 — eligibility/base attributes/None→Neophyte | Rank-boundary case plus magic `enforces None-to-Neophyte...` and Reincarnate attribute case | Covered |
| S3-1.6 — Resurrect/Reincarnate | Independent materialization/no-draw and reset/two-draw boost cases | Covered |
| S3-2.1 — valid actions/source labels | Independent commit case plus Phase 4 render action evidence | Covered |
| S3-2.2 — once-only cost/cooldown/menu | `commits two draws, costs, cooldown, damage, and XP...` | Covered |
| S3-2.3 — formation/reach rejection atomicity | Rejected-action case and distinct render reason case | Covered |
| S3-2.4 — melee/ranged/projectile/passive targets | Commit, ammunition, and passive-review-target cases | Covered |
| S3-2.5 — deterministic damage/item 14 provenance | Commit case and `never substitutes item 13 for impact 14` | Covered |
| S3-2.6 — visible ammo/target disabled reasons | Shared pure validator/painter case pins both exact reasons and glyph masks | Covered |
| S3-2.7 — drag/free-throw compatibility | Phase 2 bounded compatibility evidence; final aggregate exposed adjacent inventory identity regressions | **Blocked by final gate** |
| S3-3.1 — deterministic projectile state/path | Payload/landing and wall/door/pit/teleporter cases | Covered |
| S3-3.2 — geometry/doors/exactly once | All-facing lane case and obstacle case | Covered |
| S3-3.3 — item/ammunition/spell distinction | Independent three-payload case | Covered |
| S3-3.4 — unique explosions | Duplicate-ID test pins stable first-seen IDs once | Covered |
| S3-3.5 — all facings/lanes/depth/offscreen | Independent engine all-facing case and Phase 4 near/far projection case | **Blocked by approaching-projectile regression** |
| S3-3.6 — projectile ownership | Ammunition transfer and payload ownership cases | Covered |
| S3-4.1 — exact 24 runes/source glyphs | Exact-order engine case plus all-rune render and Amiga glyph cases | Covered |
| S3-4.2 — mouse add/remove/clear/invoke | Shared-rect pointer case and formula-preview DEL/CLR preservation | Covered |
| S3-4.3 — QoL-only keyboard/no Purist leak | Independent G/B and movement capture case | Covered |
| S3-4.4 — mana semantics | Invalid zero-cost and exact success/fizzle/backfire cost cases | Covered |
| S3-4.5 — skill and deterministic outcomes/cost | QA-owned Mulberry reference seeds; one draw per outcome | Covered |
| S3-4.6 — invalid safe/no XP/no duplication | Invalid/mana/flask gate and preview preservation cases | Covered |
| S3-4.7 — focus restoration | Committed close vs pre-validation preserve case | Covered |
| S3-5.1 — five recipes/effects | 30 recipe/power brew combinations and all five consume effects | Covered |
| S3-5.2 — spells/doors/light/shield/expiry | Door/light/shield case and party-Shield replacement/expiry case | Covered |
| S3-5.3 — same-ID flask/no duplication | Same-ID count and backpack-location assertions | Covered |
| S3-5.4 — single potion consumption | Five-effect consumption case pins one event/item removal | Covered |
| S3-5.5 — outcome table | Success/fizzle/backfire cases pin preserve/destroy rules | Covered |
| S3-5.6 — XP owner/no invalid XP | Success XP plus fizzle/backfire/rejection no-XP assertions | Covered |
| S3-5.7 — source equivalence/monotonic power | Six powers for each of five recipes; exact `12 + power * 4` XP | Covered |
| S3-6.1 — bars/no stale overlays | Phase 4 bars/messages region equality and lifecycle cleanup case | Covered |
| S3-6.2 — canonical hit regions/scales | Shared layout rectangle and all 24 rune hitbox assertions | Covered |
| S3-6.3 — visible feedback | Distinct disabled-reason pixels and message preservation | Covered |
| S3-6.4 — Purist/QoL mouse completeness | Independent shared-rectangle and capture/no-leak case | Covered |
| S3-6.5 — two-source browser/facing/depth/outcomes/errors | Prior Phase 4 fresh two-source pass exists; required P5.1 refresh was intentionally not run after aggregate failure | **Final refresh pending** |

Matrix status: **38/38 criteria mapped to independent evidence; 3 criteria cannot receive final acceptance because the aggregate regression gate failed or its mandated downstream refresh was not reached.** No evidence gap justified adding another test before the final run.

## A1-A12 audit

- A1: one reducer/clock — `dispatchCommand` and `stepSingleTick` remain the command/tick authorities.
- A2: one RNG/fixed budgets — VIA found the sole `nextRandom` definition in `src/engine/rng.ts`; callers are combat, magic, and recruitment. QA uses an independent Mulberry32 reference.
- A3: one progression authority — all XP/rank mutation remains exercised through `awardSkillExperience`.
- A4: validate → commit → resolve → award — independent rejection cases pin zero RNG/cost/XP; successful combat pins two draws and one award.
- A5: catalogs/pure engines — catalog-driven actions/runes/potions and pure validators have independent assertions.
- A6: generalized projectiles — payload union and single tick path are covered, but the final aggregate caught reverse-direction lane mirroring loss.
- A7: passive targets — six ticks leave review targets immobile and non-attacking.
- A8: absolute ticks/derived effects — Light/Shield/Ku expiry and pure mitigation/attributes are pinned.
- A9: atomic flask — stale/reachable selection, same-ID transform, preserve/destroy, and no duplication are pinned.
- A10: one focus owner — cursor/inventory/mirror/interaction priority and committed/rejected recovery are pinned.
- A11: deck/status/geometry/provenance — bars/messages and item 13/14 are pinned; approaching-projectile lane geometry currently fails.
- A12: source adapters — clean-room labels and source-guarded Amiga glyph/fallback are independently pinned.

## Exact failure evidence

Command (run once): `bobp make test-q`  
Start: 2026-11-09 16:25:40 EST  
Result recorded: 2026-11-09 16:25:49 EST, exit 2  
Duration: 8.34 s  
Counts: 47 passed / 2 failed files; 327 passed / 6 failed tests; 333 total

### Production regression 1 — Sprint 2 inventory identity no-ops (5 failures)

`dispatchCommand` unconditionally returns `{ ...inv.state, interaction: { kind: 'NONE' } }` for every inventory-domain command. When `applyInventoryCommand` correctly returns the original object for a rejected/no-op command, the wrapper still creates a new state object. Five existing compatibility assertions require identity preservation (`toBe`), and received a deep-equal clone:

1. missing champion equip click — `tests/engine/inventory.test.ts:102`
2. invalid backpack slot 99 — `tests/engine/inventory.test.ts:137`
3. empty-hand consume — `tests/engine/inventory.test.ts:230`
4. empty floor quadrant with empty hand — `tests/engine/inventory.test.ts:257`
5. pickup/drop on wall tile — `tests/engine/inventory.test.ts:263`

This is a real compatibility regression, not a test expectation-helper issue: the returned states serialize identically, but no-op referential identity was lost.

### Production regression 2 — approaching projectile lane mirroring (1 failure)

`tests/render/phase2IndependentUat.test.ts:48` creates a north-adjacent projectile travelling south toward a north-facing viewer with lane `LEFT`. Its pixels must appear on the viewer's right (`x > 112`); current output includes pixels on the wrong side. VIA inspection shows `projectileMarkerRect` computes lane offset solely from `projectile.lane` and does not account for projectile direction relative to party facing. This breaks the established Sprint 2 reverse-direction lane projection and blocks S3-3.5/A6/A11 final acceptance.

## Gate chronology and stop condition

- Phase 1: independent 7/7; bounded 24/24; approved.
- Phase 2: initial duplicate-ID defect; fix cycle 1 passed independent 8/8 and bounded 90/90; approved.
- Phase 3: Shield architecture rejection; fix cycle 1 passed focused 1/1 and bounded 101/101; approved.
- Phase 4: focus/input fix 1; validator/pointer fix 2; user-authorized formula-preview fix 3; final independent 8/8, bounded 30/30, browser 10 checks per two sources with zero failures/errors; Morpheus and Smith approved.
- P5.1: artifact/diff/VIA audit completed; 38-criterion matrix completed; final aggregate failed 6/333. Stop invoked before all downstream gates.

## Required handoff

This is a final acceptance blocker. Neo should correct only the two scoped regressions above and return to Trin for a new explicitly authorized final gate cycle. Trin did not attempt production fixes and did not edit `task.md`.
