# Agent State

## Context
### Recent Decisions
- Fixed reversed 3D viewport perspective in `src/render/viewportPainter.ts` using exact FTL `item[558]` blitter coordinates (`offsets 3332..4700`):
  1. Swapped Ceiling (`item[76]`, `224x29` at `y=0..28`) and Floor (`item[75]`, `224x70` flagstones at `y=66..135`).
  2. Swapped `D0L` (`item[85]` at `0..31`) and `D0R` (`item[84]` at `192..223`).
  3. Replaced sideways door-track sprites (`77..79`) on corridor walls with 3-face wall cube slices (`88` for `D3L/D3C/D3R`, `87` for `D2L/D2C/D2R`, `86` for `D1L/D1C/D1R`, `89` for `D3LL/D3RR`) plus authentic pit (`50..56`) and stairs (`90..102`) sprites.
- Fixed audio decoding & movement cues in `src/data/graphicsDatParser.ts` and `src/audio/paulaAudio.ts`:
  1. Unified all 33 `SND2` items (`533..555` and `563..574`) to decode at `5500 Hz` from `offset = itemBytes.length - declaredSamples`, preserving `WALL_BUMP: 565` (`"OOF!"`) while making open-floor `FOOTSTEP` silent (`null`) by default.
  2. Built the interactive Paula 8-Bit SFX Soundboard (`src/ui/soundboard.ts`) with waveform previews, `▶` auditioning, editable `localStorage` labels, live cue assignment, and JSON copy/download.

### Key Findings
- `item[558]` offsets `3332..4700` store 8-byte `[x1, x2, y1, y2, srcByteWidth, srcHeight, srcX, srcY]` blitter rects for every wall, pit, stairs, and door in 1988 Amiga *Dungeon Master*.

### Important Notes
- Passed `bobp make -vvv test` (31/31 green) and `bobp make -vvv build` (23.26 kB gzip).

## Current Task
**Status:** Complete (100% — Handed Off to Trin)
**Assigned to:** Neo (`*swe`)
**Started:** 2026-11-02

### Task Description
Fix reversed wall/floor/ceiling perspective, fix movement audio while preserving `item[565]` `"OOF!"`, and ship interactive Soundboard UI.

### Progress
- [x] Updated `viewportPainter.ts` with exact `item[558]` blitter coordinates
- [x] Fixed `graphicsDatParser.ts` 5500 Hz PCM decoding & `paulaAudio.ts` silent default footsteps
- [x] Built `src/ui/soundboard.ts` and wired `index.html` + `src/main.ts`
- [x] Added regression tests (31/31 passing) and handed off to `@Trin`

### Blockers
None

### Oracle Consultations
N/A

## Next Steps
### Immediate Next Action
`@Trin *qa uat fix-perspective-soundboard`, `@Morpheus *lead review`, `@Smith *user test`, then publish clean-room repo to `git@github.com:drusifer/dm-reloaded.git`.

---
*Last updated: 2026-11-02T14:23:10-05:00*
