# Change Log

## 2026-11-11 — Monster ecology (`sprint-4`)

- Added the 27-type monster catalog, Amiga creature parsing, deterministic hunting AI with subcell groups, melee/ranged strikes, kill credit, drops, non-material rules, door crushing and a tested generator engine.
- Added viewport silhouettes (labelled placeholder art), HP pips, HUD injury flash, visible-only automap markers, new sound cues and `bobp make sprint4-visual-review`.
- Party movement is now blocked by live monsters; a hit wakes a sleeping party.

Validation: serial `370/370`, lint/types/build and two-source actual-browser gate passed. Local delivery; no commit, push or deployment. Disclosed limits: approximate stats, placeholder art, no shipped generators, only the party level simulates.

## 2026-11-03 — Parametric dungeon lighting (`sprint-2-lighting`)

- Replaced historical dark-ramp selection with one validated color filter configured in `src/render/lighting.json`; brightness curve, depth falloff, tint and desaturation share a pure RGB formula.
- Preserved source masks, alpha, gameplay and full-bright UI; added an equivalent pure RGBA helper for future artwork use.
- Added focused and independent rendering regressions plus `bobp make visual-review ARGS=--lighting` with separate evidence and original/fallback coverage.

Validation: all250tests, lint/types and production build passed. Actual Chromium review passed26scenes/98measured checks with both art sources and no browser errors. Local delivery; no deployment. Runtime PNG loading, semantic classification and campaign packs remain future work.

## 2026-11-03 — Asset export (`sprint-2-assets`)

- Added `bobp make export-sprites`: indexed PNG per decoded original sprite, deterministic manifest, original palette and raw index-0 transparency.
- Added safe owned-output reruns, actionable input errors and strict original palette validation.
- Added `bobp make export-sprites-review`: independent Chromium decoding and palette/alpha/hash checks; verified 535 sprites and 1,690,768 pixels with unchanged source.
- Documented actual automation and export limits in README and SDLC. Runtime artwork loading, lighting and campaign packs remain future work.

Validation: final 31 affected tests, lint/types and native PNG review passed. Earlier 226-test aggregate and production build passed before the final isolated offline palette guard; see sprint acceptance evidence for exact boundaries. Local delivery only; no deployment.
