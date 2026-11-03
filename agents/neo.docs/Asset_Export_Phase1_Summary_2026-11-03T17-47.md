# Asset Export Phase 1

Implemented src/tools/spriteExport.ts with pure encodeIndexedPng(sprite,palette) and createSpriteExport(graphics,{fileName,bytes}). Indexed4bit PNG preserves dimensions/source pixel indices in filter0rows (including oddwidth padding),16-color PLTE, tRNS alpha0only, compressed IDAT and CRC32 chunks. No filesystem, CLI, parser or runtime changes.

createSpriteExport returns manifest, deterministic newline-terminated manifestJson and pngFiles readonly map. Manifest schemaVersion1 records sourcebasename/SHA256, copied brightest palette, raw-index0 transparency policy and numerically sorted records with portable category/index_WxH paths, sparseverifiedsemantic keys and PNG hashes. Four panelaliases match existing SpriteSource; unknownindices remainunclassified. Rejectinvaliddimensions/buffers/indexvalues/palettes/mapindices, emptyoriginalmap and clean-roomfallback source.

TDD: initial newtest run failed for missingmodule. After implementation10/11 tests passed; one assertion expectedregex index but diagnostic said indices, corrected expectation and added adaptercontract coverage. Final12/12 affected tests passed17:46:07. Full195/195tests plus ESLint/strict TypeScript passed17:46:35. No additional full rerun or productionbuild; isolated internalmodule is not browser-composed. PNG structure/inflate and known IEND CRCvector are Phase1evidence; independentnativebrowserPNGdecode remains Phase2, notclaimed done.

ExclusiveMake slot released afterhandoff. Root task.md remains Mouse-owned. No original/generatedassets committed and no commit/push performed. Phase2 must add sourcecontainer completeness validation because existing parser can returnpartialmaps, safeownedfilesystempublication, CLIhelp/errors, independentall535decode and Tank/Smithactualreview.


## First independent review correction
Trin found JavaScript sparse arrays bypassed palette/channel .some validation. Replaced iteration with dense Array.from for all16colors/all3channels; missing entries now raise the palette diagnostic. Sparsepalette/channel regressions added to existing palettecase. Finalaffected12/12pass17:48:03; finalESLint/strictTypeScriptpass17:48:20. Previous195aggregatepass preceded this isolated correction; no redundant fullsuite rerun. Source stable; Trin may now run independent tests. Make slot released.
