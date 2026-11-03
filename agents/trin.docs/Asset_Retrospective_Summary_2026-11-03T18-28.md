# Asset Sprint QA Retrospective

Independent checks supplied different evidence from implementation tests: a table-free CRC oracle and native inflate checked raw PNG format/index boundaries; actual CLI calls exercised late record overrun, malformed RLE, source preservation and path ownership; valid-CRC metadata tampering proved unused palette/alpha entries must be checked even when visible pixels match.

Final acceptance review caught a declared-short palette and an omitted palette record that still left all535sprites decodable. Strict ADR011 original-source requirements and complete-format CLI fixtures corrected those assumptions; arbitrary-count pure fixtures retain explicit palettes. Preserve this split without adding production fallback switches.

Real failed-review tests proved stale success is invalidated and aliases cannot redirect evidence writes. Safe reruns preserve contributors' unrelated/edited files instead of treating all output as disposable.

Keep explicit AE1–8 evidence mapping, independent native Chromium decoding, serial Make slot ownership and bounded testing. Exact chronology matters: full226aggregate predates final strict guard; final31affected+lint/types+fresh535native follow it. Trace audit dependency remains separate unavailable tooling, not a clean result.

No QA source/check work remains. Final Smith actual CLI/PNG approval and domain retrospective posted18:28:19 after Oracle grooming. Parent retains archive and Cypher local close.
