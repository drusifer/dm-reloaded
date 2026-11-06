# Catalog Phase 1 Independent QA

## Verdict
PASS after one bounded metadata correction. Phase2 inspection/preview and final actual browser gates remain required.

Added tests/render/spriteCatalogIndependent.test.ts with five independent cases. Cropped item17 remains rawsheet42/crop(16,16,16,16) even though its derivedSpriteSource index collides with rawpanel17; atlas usages are crops only and never claim a whole-atlas opaque runtime blit. Verified stats27 alias has no active usage. Portrait26 and source81 retain legacy categories but unknown roles/usages. CLEAN_ROOM numeric helpers cannot confer DM1identity; raw17/42withmatchingdimensions remain generated/unclassified. Nested metadata/mask/crop edits cannot poison later catalog/helper calls.

Initial4/5passed19:43:31; SC2/plan§4 required structural cross-sprite association, while door usages only had descriptive relation text. Parent settled auxiliaryMask{rawSourceIndex:301,condition:bashed,mask:{kind:mask-index,index:0}} for door108–119 ordinary index10 usages. Neo added exactly this metadata;301remains a mask role, not normal color art. Reviewed final source and reused current passing results.

Both producer+independent catalog files12/12PASS19:43:58; ESLint/strictTypeScriptPASS19:44:08. The producer original archive case confirms all535measured records and fixed preexisting manifestSHA/allPNGbytes. Earlier61affectedtests and crop/source checks remain relevant; no unchanged rerun or full aggregate during this internal phase.

Runtime parser decode/palette and SpriteSource behavior remain compatible. Legacy extractItemIcon reuses shared addressing while retaining clamping/minimum-size and oversized-sheet stride behavior; strictSpriteSourceexactatlaschecks stay distinct. Rawexport categories/fouraliases/schema/filenames/bytes unchanged; no catalog-onlyfields added to manifest.

Next: parentMorpheusreview then Phase2 actual G filters/counts/details/raw-vs-usage previews, keyboard/Escape/focus UAT and independent native535fidelity review. Door preview must disclose the conditional external301rule without claiming a new compound bashed-door renderer. No automaticcommit/push.
