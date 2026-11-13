# Sprint 8 — DM2 GRAPHICS.DAT (GDAT) Reader (Contract + Architecture)

Tier-1 sprint; Cypher stories, Morpheus architecture and Mouse plan share this document.

## Scoping decision (honest)
Sprint 7 left DM2's `GRAPHICS.DAT` undecoded. Online research found the public `gbsphenx/skproject` repository (SKWin / DM2GDED / DMDC2) whose sources describe the DM2 "GDAT" container, directory, text encoding and image encodings. That repository has **no license file**, so this sprint treats it as documentation of *file-format facts* only: no code or data tables are copied; the reader is written independently and validated against the user's own file. Gameplay (outdoor/weather, shops, minions, DM2 party) is still **not** started: creature *stats* and *rules* are not in the decoded data, and the palette needed for colour is not yet identified.

## Goal
A developer can read DM2's `GRAPHICS.DAT` in TypeScript: container, directory, text/names, and all 3,011 distinct images (4,758 directory records) as indexed pixels, with every claim verified by the file's own arithmetic and by the encodings' exact-consumption property, and imports never mislabel it as DM1 art.

## Stories and acceptance criteria

### S8-1 — Container and directory
1. `parseGdat(bytes)` returns `{ok:true,gdat}` or a typed failure (`TOO_SMALL`, `BAD_MAGIC`, `SIZE_MISMATCH`, `BAD_DIRECTORY`) and never throws. Magic word `0x8005`/`0x8004` selects big- or little-endian; layout: magic, entry count (u16), entry-0 size (u32), `count-1` u16 entry sizes, then entry 0 and entries 1..n.
2. The real DM2 file must satisfy: 4,630 entries; header 9,266 bytes + entry sizes = 3,493,879 = file length exactly; entry 0 holds a 0x14-byte header and 10,045 eight-byte directory records (6-byte key + u16 value/entry index) that fill it exactly.
3. Directory access by 6-byte key; class byte (3rd) distinguishes entry-index classes (images 1, sounds 2, text 5, …) from inline-value classes.

### S8-2 — Text and names
1. Text entries decode as `((byte + index) & 0xFF) ^ 0xFF` (auto-detected against plain), stopping at 0, with unknown codes shown as `?`.
2. `creatureName(gdat, id)` returns the English name from key `(0x0F, id, 0x05, 0x00, 0xF0, 0x00)`; test pins known names (e.g. id 0 `THORN DEMON`, id 2 `VORTEX`) and that every creature id used by DM2's `DUNGEON.DAT` has a name.

### S8-3 — Images
1. `decodeGdatImage` decodes the 4-bit nibble-RLE image encoding (6-colour local palette, duration codes, copy-above, explicit colour) in primary and secondary (transparent overlay, 5 palette nibbles) forms and returns indexed pixels plus the 16-byte palette-index tail, or `null` (never throws).
2. All 3,011 distinct image entries of the real file (referenced by 4,758 directory records) decode with the encoding's own check (stream consumed exactly, image filled exactly): 2,060 primary + 951 secondary, 0 failures. A visual contact sheet was inspected for recognizable art.
3. **Colour is not claimed**: the palette is unidentified; renderers use indices (grayscale).

### S8-4 — Honest import
1. `importCampaignFiles` recognizes a GDAT `graphics.dat`: it reports entries/images/creature names, keeps generated art (no mixing with DM1 art), and says "DM2 GRAPHICS RECOGNIZED: ART NOT USED YET" instead of claiming "WITH YOUR GRAPHICS". A corrupt or unknown graphics file is still a typed failure.
2. `bobp make dm2-sheet` writes grayscale PNG contact sheets of the decoded images into the gitignored `build/dm2-sheets/` for human review.

### S8-5 — Evidence
1. Headless tests incl. synthetic GDAT/image fixtures and the real-file facts (skip-if-absent), serial suite, lint/types/build, earlier browser gates, and a browser check importing the real DM2 `GRAPHICS.DAT` showing the honest message and no errors.

## Architecture (Morpheus)
- **G1** Pure `src/data/gdat.ts` (no DOM/Node); validation-first; bounded allocations (entry count ≤ 65,535 by format).
- **G2** Images decode into `Uint8Array` pixels (0..15, 255 = transparent) so a later palette decision does not change the decoder.
- **G3** Nothing copied from the unlicensed reference repository; attribution of *where facts were learned* lives in `docs/DM2_DATA.md`.
- **G4** The DM1 `GraphicsBundle`/renderer stay untouched; DM2 art is not wired into the game until the palette and sprite roles are evidenced.

## Plan (Mouse) — see root `task.md`
1. Container/directory/text. 2. Image decode. 3. Import honesty + sheet tool. 4. Browser check, acceptance, close.

## Delivered outcome and honest deviations (2026-11-11)
Delivered locally: `src/data/gdat.ts` (container, directory, text, creature names, indexed image decoding, never throws); typed failures; 10 synthetic + 3 real-file test groups; honest import recognition ("DM2 GRAPHICS: 3011 IMAGES, 77 CREATURES." and "DM2 ART NOT USED YET: GENERATED ART SHOWN."); `bobp make dm2-sheet` (22 grayscale contact sheets, 3,011 images, 0 failures) and a browser check importing the real DM2 files.

Corrections made during the sprint: my first research notes said "4,758 images decode (3,084 primary + 1,674 secondary)"; those were directory *records*. The distinct image entries are 3,011 (2,060 + 951); tests and docs use the exact figures.

Deviations and limits:
1. No gameplay: DM2 outdoor/weather, shops, minions, creature stats and a DM2 party remain undecoded and unstarted.
2. DM2 art is **not** used by the game; no colour is claimed (palette unidentified; a plausible guess was tested and rejected visually).
3. The reference repository is unlicensed, so only format facts were used and the decoder was written independently; if you want its code included you must clear the license first.
4. The uncompressed 4-bit image form and DM2 sounds/music are not decoded.
5. Sprint 4–7 limits are unchanged.
