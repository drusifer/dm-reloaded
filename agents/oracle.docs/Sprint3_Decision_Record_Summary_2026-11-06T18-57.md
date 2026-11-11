# Sprint 3 Decision Record Summary

## Outcome

Recorded ADR-014 in `docs/DECISIONS.md` after both Smith planning gates approved the Sprint 3 product contract and architecture.

## Binding boundaries

- One pure reducer, one 6 Hz clock, and one specified deterministic RNG authority.
- Validation before atomic cost/RNG commit, effect resolution, and success-only XP.
- One XP-derived progression authority and shared typed projectile engine.
- `GameState.items` remains the only physical-item authority; potion brewing has explicit selected-flask outcomes.
- One canvas interaction-focus owner preserves complete Purist mouse control and contained optional QoL input.
- Original action labels, rune glyphs, and damage art require original-source provenance; clean-room presentation never inherits identities by numeric coincidence.
- Headless rule evidence and actual-browser evidence remain separate mandatory gates.

The detailed A1–A12 design remains authoritative in `docs/SPRINT3_ARCHITECTURE.md`; ADR-014 links it rather than copying it into `docs/ARCH.md`.

No product code, tests, task board, commit, push, release, or deployment was touched.
