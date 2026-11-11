# Sprint 3 Architecture Summary

## Outcome

Designed Sprint 3 against VIA-located runtime seams and the Smith-approved product contract.

- Preserves `dispatchCommand`, the 6 Hz tick, `rngState`, normalized item ownership, canonical input mapping, and frame composition as single authorities.
- Adds pure progression, combat, magic, effects, and RNG modules plus data-only action/recipe catalogs.
- Generalizes the existing projectile engine with typed item/ammunition/spell payloads and exactly-once impacts.
- Uses a bounded non-AI review target instead of pulling Sprint 4 AI into scope.
- Makes costs, RNG, cooldowns, XP, flask transformations, focus ownership, source provenance, and overlay ordering explicit.
- Maps all six stories to headless, render/input, independent, and actual-browser evidence.

## Decision Record Request

Oracle should record decisions A1–A12 from `docs/SPRINT3_ARCHITECTURE.md`, especially the single reducer/RNG authority, generalized projectile payload, atomic flask transaction, one interaction-mode focus owner, and source-guarded presentation boundary.

## Next Gate

Smith Gate 2 reviews the architecture's user impact before Mouse may create the sole task board.

