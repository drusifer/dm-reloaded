# Parametric Lighting Sprint Close

Delivered locally: one shared RGB filter, validated lighting.json profile, palette/RGBA adapters and brightest-only world lighting. Procedural colors use the depth palette exactly once. Gameplay, source-index masks, UI and raw exports stay intact; no runtime PNG/truecolor loader, new dependency or deployment.

All LT1–5 accepted by Trin, Morpheus, Tank and Smith. Final250tests across37files plus ESLint/strict TypeScript passed19:18:17; production build passed19:18:59. Actual Chromium review passed26scenes/98measured checks with original535sprites and fallback, no browser errors. Smith inspected low/full/zero-light/depth and inventory/cursor/torch captures. Current evidence is build/lighting-review/report.json; old29interaction report was not rerun or reclaimed.

Documentation, ADR012 and all seven domain retrospectives are archived in ../chat_archive/CHAT_sprint-2-lighting.md. docs/CHANGELOG.md records delivery; root task.md is the sole task board. Retrospective backlog prioritizes semantic classification and source mask policy before campaign packs; combat remains Sprint3. Existing trace audit missingjinja2 remains unavailable, not passed.

No commit or push performed. Tune src/render/lighting.json; review using bobp make visual-review ARGS=--lighting. No more source/check work remains.
