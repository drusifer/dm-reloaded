Catalog inspection review framework implementation, awaiting actual UI integration.

TLDR:
    Goal: Isolate real catalog UAT without changing lighting/legacy review bodies.
    Status: Framework written; no execution or completion claim.
    Action: Fill actual SC4/5 interactions after Neo Phase2 UI is stable, then root-authorized serial run.

Only scripts/sprint2-visual-review.mjs top dispatch and new scripts/sprite-catalog-review.mjs changed. Framework compares strict original producer manifest to existing exact baseline bytes/hash and every535PNG produced bytes/existinghash before browser; never republishes. Separate guarded build/catalog-review report starts false and remains false on errors. Existing pinned Chromium and own strict5197 ready announcement used; browser errors captured and cleanup bounded. UI branch explicitly fails pending integration rather than declaring a framework pass.

Confirmed UI contract: cs-search/category/status/selected/preview-mode/usage/preview-canvas/details/counts/reset/copy/zoom/ramp/close. Modes raw-opaque/raw-index-0/usage; statuses all/verified/unclassified. Known/unknown counts measured dynamically;39verified tentative is not an assertion. Required examples17key/index,42item.icon.7,85viewport.source.85,rawunknown2. No Make/tests/source/global-doc changes.


## Actual UAT implementation update
Replaced pending branch with real G controls/search/filter/category/no-match/reset, selected/evidence/unknown policy, exact raw/cropped dimensions and independent source-pixel torch/wall mask checks. Added zoom/ramp, real clipboard plus denied-write recovery, actual app game-state no-leak while typing G/WASD/1–4, one Escape/focus restoration, generated17/42negative provenance and actual clean-room app rebootstrap empty state. UI source contract and execution still pending; no pass claimed. No Make calls.
