# Project Lessons Learned

This file contains critical lessons and rules derived from past errors, technical discoveries, and architectural decisions. All agents MUST review this file before starting new implementation or architectural tasks.

---

## Lesson 001 — Amiga `graphics.dat` Sprite, Font & Palette Layout (2026-11-02)
- **Context**: Decoding the 575 uncompressed container items inside `/DM/graphics.dat` (`411,960` bytes) during Sprint 1 Phases 2 & 3.
- **Key Findings**:
  1. **FTL 4bpp Byte-Aligned RLE (`items 0..532, 538, 548`)**: Every sprite starts with `uint16be width, uint16be height` followed directly (no 3-byte local palette) by byte-aligned opcodes (`0..7` short run, `8` byte run, `c` word run, `b` byte prev-line copy + 1px, `f` word prev-line copy + 1px, `9` 1px + `N` byte-padded literal nibbles). Decodes **535/535** sprites cleanly.
  2. **Movement Pad vs Damage Burst (`96×45`)**: Both `item[13]` and `item[14]` have dimensions `96×45`, but `item[13]` is the **6-button Movement Arrow Pad**, whereas `item[14]` is the cyan damage starburst overlay. Always inspect rendered pixels (`Smith *user test`), not just sprite dimensions!
  3. **System Font Rune Slots (`item[557]`)**: `item[557]` (`768` bytes) is interleaved by scanline (`font[row * 128 + code]`). ASCII `32..95` hold uppercase English letters/digits/punctuation, whereas **`97..122` (`'a'..'z'`) hold the 24 FTL Magic Runes**! Always `.toUpperCase()` English strings before rendering with `item[557]`, and reuse `97..122` in Sprint 3 for authentic spell runes!
  4. **Torchlight Shading Ramps (`item[562]`)**: Offsets `1438` stepping by `-32` back to `1278` hold the 6 authentic FTL 9-bit `$0RGB` 16-color torchlight shading palettes.

## Lesson 002 — Hall of Champions Mirror Linkage in `Dungeon.dat` (2026-11-01)
- **Context**: Linking Champion Mirror wall actuators (`type=127`) to their 7-line `A..P` nibble-encoded Champion stat/skill text records (`db2`) in `/DM/Dungeon.dat`.
- **Rule**: A `type=127` actuator on wall tile `(wx, wy)` facing direction `f` (`value = portraitIndex 0..23`) pairs with the Champion `db2` text record stored on the **adjacent walkable corridor tile** `(wx + dx[f], wy + dy[f])`.

## Lesson 003 — FTL `item[558]` Viewport Blitter Rects & `SND2` 5500 Hz Audio (2026-11-02)
- **Context**: Playtest feedback revealed reversed wall/floor/ceiling perspective at `LVL:0 (1,6) DIR:NORTH` and monster audio playing on normal party steps.
- **Key Findings**:
  1. **Ceiling (`item[76]`) vs Flagstone Floor (`item[75]`)**: `item[76]` (`224×29`) is the speckled stone ceiling (`y = 0..28`), while `item[75]` (`224×70`) is the cobblestone floor (`y = 66..135`).
  2. **Master Blitter Table (`item[558]` offsets `3332..4700`)**: Stores 8-byte `[x1, x2, y1, y2, srcByteWidth, srcHeight, srcX, srcY]` blitter rects for every viewport element:
     - `D0L = item[85]` at `(0, 0)`, `D0R = item[84]` at `(192, 0)` (color index `10` = transparent key).
     - `86` (`256×111`), `87` (`144×71`), and `88` (`128×51`) are 3-face wall cube atlases (`left sloped side + flat stone center + right sloped side`) sliced into `D1L/D1C/D1R`, `D2L/D2C/D2R`, and `D3L/D3C/D3R` (`89` = `D3LL/D3RR`), while `77..80` are edge-on parallel doorway slots!
  3. **`SND2` Audio (`items 533..555, 563..574`)**: Every PCM item starts with `uint16be sampleCount` and `2..4` header bytes (`sampleOffset = itemBytes.length - sampleCount`) played at Paula `~5500 Hz`. Normal party steps are silent (`FOOTSTEP = null`) in 1988 Amiga *Dungeon Master*, while `item[565]` is the authentic `"OOF!"` wall bump.
