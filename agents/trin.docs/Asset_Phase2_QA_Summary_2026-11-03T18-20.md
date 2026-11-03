# Asset Export Phase 2 Final QA

## Verdict
Accepted-behavior QA PASS for sprint-2-assets after final corruption/ownership audit and strict original-palette correction. No known functional blocker found. Parent retains final Morpheus/Tank/Smith approvals, actual Make help/build evidence and sprint close; QA does not post those personas' approvals.

## Criterion-to-evidence audit
| Criterion | QA evidence |
|---|---|
| AE-1 one raw sprite/file | Actual exporter CLI exercised valid original archive and deterministic rerun;535manifest records/535rawsprites. Existing synthetic pure-map tests cover other counts without hard-coding encoder count. No font/sound/atlas-derived extra PNGs. |
| AE-2 original indices/palette/alpha | Phase1 independent table-free CRC checks every chunk using external CRC vectors; nativeinflate verifies all16indices and odd-width row boundaries. Final runner checks every actual PNG's PLTE/tRNS metadata, including unused entries; independent valid-CRC+updatedhash PLTE/tRNS tampering is rejected. Native Chromium decodes all535PNGs and1,690,768pixels against parser-derived expected RGBA/dimensions, with source unchanged and browserErrors[]. |
| AE-3 deterministic portable manifest | Pure numeric2/10/17 ordering test, map insertion reversal, source basename/hash, portable paths, no machine path/time. Actual535double export compared every PNG hash and manifest bytes; input/sentinels preserved. |
| AE-4 verified sparse labels | Semantic aliases for17/23/25/27 align with SpriteSource. Known category groups are documented; unknown fixtures stay unclassified with semanticKeys[]. No claim all535sprites have names. |
| AE-5 actionable complete-source failures | Real CLI help/argv/missing/read errors and late record overrun after a valid record, corruptRLE in complete container, short declared562palette and entirely omitted562record. Actual source truncated before562 still decodes535sprites in permissive parser, but strict exporter rejects before publication; prior manifest/allPNGhashes and input hashes remain unchanged. ADR011 requires original palette for EVERY real CLI source; arbitrary-count pure fixtures remain valid with explicit palettes. |
| AE-6 owned ignored output | Outsidebuild/rootbuildalias/categoryalias, unowned/modified PNG collisions, file/manifest symlinks and forged prior-manifest traversal/absolute paths rejected. Only validated unchanged stale owned files pruned; arbitrary sentinels and source bytes preserved. Staging uses owned temporary files, no recursive arbitrary-output deletion. Review evidence checks directory/report/representative/overview destinations, separate from export tree. Actual report/directory symlink tests preserve targets. |
| AE-7 inspectable real artifacts | Native review report passed with535records, original source SHA256 and1,690,768pixels; representative panel17/icon-sheet42(includes torch)/wall87 plus overview produced. Actual review help is read-only; failed review replaces stale passedreport with passed:false/status:failed. Smith actual CLI/artifact inspection remains parent-owned final gate. |
| AE-8 mechanism/docs parity | Reviewed actual quoted SPRITE_INPUT/SPRITE_OUTPUT Make recipes and README/SDLC defaults, pinned temporary Playwright, existingViteSSR/nativeNode tools and raw-index0 masking caveat. No new dependency/runtime pin/CI/deployment claimed. Tank final mechanism approval remains parent-owned. |

## Defects caught and closed
- Sparse palette/channel arrays could bypass validation; dense checks fixed in Phase1.
- Category alias could resolve outside its canonical owned export directory; writer now rejects category symlinks/escaping destinations.
- Review failures could leave stale success evidence or write through evidence aliases; Tank added checked shared destinations and explicit running/failed reports. Four actual Node regressions verify failure/help/reportalias/diralias behavior.
- Pixel comparison alone could miss unused palette/transparency entries; explicit PLTE/tRNS metadata checks and two independent valid-CRC tamper regressions cover this.
- Permissive parser palette fallback could accept short562 or a count562container with all535sprites but no original palette. Oracle consult/Morpheus ADR011 resolved EVERY real CLI source must contain full562palette. Narrow exporter-side guards and real-source regression now reject both; runtime parser unchanged.

## Final evidence and exact check boundaries
- Full226tests+ESLint/TypeScript passed18:10:06 before the final narrow strict-palette correction. This aggregate includes earlier independent tests; no claim that it ran after the final guard.
- After strict guard and shared complete-format fixture updates, ALL FOUR affected CLI/writer/safety/review suites passed31/31 at18:17:20, including real omitted562 and short562 regressions. Strict lint/TypeScript passed18:17:39.
- Fresh native Chromium all535sprites/1,690,768pixels/source unchanged passed18:18:07 after that final source correction. Report build/sprite-export-review/report.json; representative artifacts in that directory.
- Existing183game tests and14pureencoder/manifest tests are unchanged; no redundant baseline/full-suite rerun. Parent supplies final build/actualMakehelp and named approval gates separately.

## Limits
Trace audit remains explicitly unavailable because missingjinja2 is masked by Makefile||true; no clean audit claim. All Make writers were serialized under explicit slot ownership. Original assets/generated art remain local/ignored; no commit/push/deployment authorized or performed by QA. Pure independent CRC uses no hidden newer node:zlib.crc32 prerequisite; no browser dependency added to default test runtime.
