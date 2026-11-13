# Sprint 7 — DM2 Data Enablement (Contract + Architecture)

Tier-1 sprint; Cypher stories, Morpheus architecture and Mouse plan share this document.

## Scoping decision (honest)
The roadmap line for Sprints 7–8 is "DM2 outdoor/weather, shops/coins, commandable minions, DM2 campaign". None of that can be built faithfully until the DM2 files can be read. Sprint 7 therefore delivers the evidence-first foundation: a CRC-verified Amiga LZX extractor, a findings report, and safe handling of a non-DM1 `Dungeon.dat`. The gameplay features are **not** started and nothing here claims DM2 behaviour. (First attempts to write the decoder from memory failed its CRC checks; the public libxmp description of the format fixed it, and the archive's own CRC32s are the proof.)

## Goal
A player or developer can extract their DM2 disk image reproducibly, see exactly what it contains, and import its map container without it being mistaken for the DM1 campaign.

## Stories and acceptance criteria

### S7-1 — Verified LZX extraction
1. `scripts/lzx_extract.py` lists and extracts Amiga LZX archives; every entry is verified against its stored header CRC and data CRC32 before being written. A failed entry is reported and never written; the process exits non-zero.
2. All 35 entries of the real DM2 archive extract with zero failures, including merged groups and the 3.5 MB `GRAPHICS.DAT`.
3. Path safety: absolute or `..` entry names are refused.
4. `bobp make extract-dm2` runs it into the gitignored `public/assets/extracted/dm2/`.

### S7-2 — Findings report
1. `docs/DM2_DATA.md` records inventory and header facts as observations, states what is unverified, and says what is not enabled.
2. A skip-if-absent test pins the verified structural facts (44 maps, record-count table, size arithmetic, zero champions, 0 decoded sprites from the DM1 graphics parser) so a future decoder change that alters them is noticed.

### S7-3 — Campaign identity
1. `parseDungeonDat` keeps `dm1-amiga-v2` only for a 14-map file; any other map count gets a content-derived id `amiga-dat-<N>maps-<hash>` and an honest title, so a DM1 save can never load into another campaign (and vice versa).
2. `importCampaignFiles` says when the campaign is not the recognized 14-level DM1 (for example "IMPORTED 44 LEVELS (UNRECOGNIZED CAMPAIGN, NO PARTY)") and the import panel keeps working; saves made on it use its own id.

### S7-4 — Evidence
1. Headless tests for S7-1..3 (incl. tampered-archive refusal) and an actual-browser check that importing the real DM2 `DUNGEON.DAT` through the panel reports 44 levels and the unrecognized-campaign message with zero uncaught errors.

## Architecture (Morpheus)
- **L1** The extractor is tooling in Python next to `extract_assets.py`; the runtime never decodes LZX.
- **L2** Verification-first: no byte is written unless its CRC32 matches; merged groups are decoded once and split by recorded sizes.
- **L3** `campaignId` is derived from content for non-DM1 files; engine and save codec already key on it.
- **L4** DM2-specific semantics are deliberately absent; the findings doc is the contract for what is known.

## Plan (Mouse) — see root `task.md`
1. Extractor + tests + make target. 2. Campaign identity + import message. 3. Findings test + browser check. 4. Close.

## Delivered outcome and honest deviations (2026-11-11)
Delivered locally: `scripts/lzx_extract.py` (independent Python decoder; verifies header and data CRC32 for all **35** entries of the real DM2 archive, including merged groups and the 3.5 MB `GRAPHICS.DAT`; refuses tampered, damaged, and unsafe-path entries and never writes a failed entry); `bobp make extract-dm2`; `docs/DM2_DATA.md`; a skip-if-absent test that pins the documented DM2 structural facts; content-derived campaign ids (`amiga-dat-<N>maps-<hash>`) with `dm1-amiga-v2` kept only for 14-map files; an honest import message; a no-champions start message; a browser check that imports the real DM2 `DUNGEON.DAT`, refuses a DM1 save there, and keeps the clock running.

Process note: three from-memory decoder attempts failed their CRC checks and were stopped by the anti-loop rule; the user asked whether I had researched online, and the public libxmp `lzx_unpack.c` description (block layout, two-part tree delta with per-half RLE rules, aligned tree before length, 512 distance+length codes, big-endian 16-bit words into an LSB-first stream) made the decoder pass every CRC on the first run.

Defects found by screenshot review and fixed: the imported campaign still logged "ENTER THE HALL OF CHAMPIONS" (now "NO CHAMPIONS IN THIS CAMPAIGN. LOOK AROUND."); the extractor's first version took 4.6 s (a 12-bit lookup brought it to ~1.8 s, inside the 5 s test timeout with explicit 20 s allowances for the real-archive tests).

Deviations and limits:
1. **No gameplay was built**: outdoor/weather, shops/coins/merchants, commandable minions and the DM2 campaign were not started because DM2's rules and formats are not decoded.
2. Importing the DM2 `DUNGEON.DAT` is **structural only**: 44 maps parse with the DM1 parser, but tile semantics are unverified (only 4 stairs vs 216 teleporters), creature ids exceed the DM1 catalog (up to 85), there are no champions, and the DM2 `GRAPHICS.DAT` (AGA) decodes to 0 sprites. It is not playable and is labelled unrecognized.
3. Only a 14-map file counts as DM1; another DM1 release with a different map count would be labelled unrecognized.
4. The extractor handles Amiga LZX method 0 and 2 only (block type 1 "no tree" is rejected) and lives in Python, so it needs `python3` on the developer machine.
5. Sprint 4–6 limits are unchanged.
