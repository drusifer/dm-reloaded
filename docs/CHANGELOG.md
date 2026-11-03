# Change Log

## 2026-11-03 — Asset export (`sprint-2-assets`)

- Added `bobp make export-sprites`: indexed PNG per decoded original sprite, deterministic manifest, original palette and raw index-0 transparency.
- Added safe owned-output reruns, actionable input errors and strict original palette validation.
- Added `bobp make export-sprites-review`: independent Chromium decoding and palette/alpha/hash checks; verified 535 sprites and 1,690,768 pixels with unchanged source.
- Documented actual automation and export limits in README and SDLC. Runtime artwork loading, lighting and campaign packs remain future work.

Validation: final 31 affected tests, lint/types and native PNG review passed. Earlier 226-test aggregate and production build passed before the final isolated offline palette guard; see sprint acceptance evidence for exact boundaries. Local delivery only; no deployment.
