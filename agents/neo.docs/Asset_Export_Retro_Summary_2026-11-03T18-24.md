# Neo Retrospective — sprint-2-assets

Pure indexed PNG/manifest construction and a separate owned filesystem writer kept exporter behavior testable without touching runtime gameplay. Small known-data tests verified packed indices, palette/alpha, CRC and determinism; independent native Chromium decoding validated all535 actual PNGs/1690768pixels.

The important correction was fidelity at the CLI boundary: missing or incomplete source palette562 must fail rather than inherit runtime fallback colors. A complete tiny563record fixture now tests the real input contract instead of introducing a production exception for convenient tests. Sparsearray validation and outputsymlink/ownership edges also benefited from independent review.

Keep the complete fixture and actualCLI negative cases as the template for future importer/exporter work. Separate raw-index export semantics from future runtime transparency/mask classification; exported PNGs are not automatically drop-in replacements for index10-masked walls or opaque panels. Preserve serial Make captures and reuse unchanged passing evidence.

Implementation and Neo retrospective complete. Final31affectedtests/lint/types and535nativepositive pass after strictpalette correction; prior226aggregate/build evidence predates the focusedfix. No further source changes/tests, commit or push in this retrospective. Parent owns remaining finalSmith/Oracle/Cypher close.
