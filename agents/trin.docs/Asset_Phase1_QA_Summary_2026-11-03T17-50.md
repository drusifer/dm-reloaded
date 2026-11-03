# Asset Export Phase 1 Independent QA

## Verdict
PASS for AE-P1.1/AE-P1.2 pure indexed PNG and manifest scope. Morpheus architecture review remains before Phase2. This is not CLI, filesystem ownership or native Chromium all-sprite acceptance.

## Findings and evidence
Read docs/SDLC.md, root task.md, docs/SPRINT_ASSET_EXPORT.md AE1–8 and OracleLessons001/006/008/009 before assertions. Reviewed src/tools/spriteExport.ts and existing tests via fallback after VIA had no indexed result for newly created files.

Read-only review found sparse palette/channel arrays bypassed Array.some validation and could produce malformed PLTE data. Neo corrected validation to visit every entry/channel and added rejection assertions before final handoff.

Neo initial full195tests with ESLint/TypeScript passed before that focused correction. Final affected12/12 tests passed17:48:03 and final correction lint/types passed17:48:20. Reused those results for unchanged production code.

Added tests/tools/spriteExportIndependent.test.ts, passed2/2 at17:49:38:
- Table-free bit-at-a-time CRC oracle validated against external standard123456789=CBF43926 and IEND=AE426082 checks every chunk CRC, not only IEND. Production uses a lookup-table CRC implementation; no production decoder used.
- Independent chunk parse validates signature/order/lengths/IHDR4-bitindexed header, all16PLTE colors, alpha0/opaque1–15 and nativezlib inflate. Known17x3 source exercises every palette index and odd-width row boundaries/padding; every decoded index equals source.
- Manifest fixture uses numeric2/10/17 order (different from lexical sorting), Windows source path, darkest/brightest palettes, unknownunclassified entries, map insertion reversal and byte-identical manifest/PNG outputs.

Final lint/strictTypeScript including new tests passed17:49:48. No unchanged full-suite rerun. All Make calls serialized under explicit QA slot ownership.

## Acceptance boundary
Pure artifact properties satisfy current AE2/3/4 portions: original dimensions/index/brightest palette/export alpha policy, deterministic sourcebasename/hash/sorted records/paths/verifiedpanelkeys and unknownlabels. CLI behavior AE1/5/6, nativebrowser decode all535, real artifact inspection AE7 and mechanism/docs parity AE8 remain Phase2 gates. No runtime art migration or original asset publication occurred.

## Tooling
No new dependencies or Node minimum assumption. Independent CRC avoids relying on newer native node:zlib.crc32. Known trace audit remains unavailable due missingjinja2 masked by Makefile||true; no clean audit claimed or repeated unchanged failure.
