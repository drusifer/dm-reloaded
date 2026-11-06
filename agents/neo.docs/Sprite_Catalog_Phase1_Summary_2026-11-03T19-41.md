# Catalog Phase1 Summary

Pure src/data/spriteCatalog.ts owns buildSpriteCatalog, dm1ExportMetadata, panelSourceIndex and itemIconAddress. Catalog covers actualmap indices/dimensions and sourceidentity; only AMIGA source receives sparseverifiedfacts. CLEAN_ROOM numeric17/42 remains generated/unclassified with emptylabels/usages. Derived itemicon addresses explicitly retain rawatlas/crop; no inferredrawID. Usage masks0/10/opaque/separate301mask recorded with evidence;27 verifiedalias has nousage because activepainter rendersstatsprocedurally. Raw opaque atlas preview is an interpretation, not inventedruntimeusage.

SpriteSource/exporter now consume sharedpanel/category/address helpers. extractItemIcon also sharesaddress arithmetic while preservingnegative/upperclamp and oversizedatlas compatibility; SpriteSource retains exactatlasdimensions/cache/fallback. Parserdecoding, framebuffer, gameplay, runtime masks and lighting unchanged.

TDD missingmodule red then6tests green19:39:39. Affected9suites61tests pass19:40:21. Addedmeaningfullegacyaddress regression; catalog+SpriteSource9tests pass19:40:42. Final lint/types19:40:53. Actual535catalog and all535existingPNGbytes plus exactmanifestSHA d4b9555ff40ed93be4dec34dc9c1af8b071cdbe489608acbce576c26a834d083 match; no generatedfilesrewritten. No fullsuite/nativebrowser baseline. UIPhase2pending. Make slot released at QA handoff.
