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
     - `86` (`256×111`), `87` (`144×71`), and `88` (`128×51`) are 3-face wall cube atlases (`left sloped side + flat stone center + right sloped side`) sliced into `D1L/D1C/D1R`, `D2L/D2C/D2R`, and `D3L/D3C/D3R` (`89` = `D3LL/D3RR`).
  3. **`SND2` Audio (`items 533..555, 563..574`)**: Every PCM item starts with `uint16be sampleCount` and `2..4` header bytes (`sampleOffset = itemBytes.length - sampleCount`) played at Paula `~5500 Hz`. Normal party steps are silent (`FOOTSTEP = null`) in 1988 Amiga *Dungeon Master*, while `item[565]` is the authentic `"OOF!"` wall bump.

## Lesson 004 — `Dungeon.dat` Door/Stair `0x08` Passage Bit & `graphics.dat` 3D Doorjambs (`77..83, 108..119, 301, 315`) (2026-11-02)
- **Context**: Playtest screenshot at `LVL:0 (7,9) DIR:WEST` showed a sideways stone pillar (`sprite 79`) in the center of the hallway instead of the crosswise Hall of Champions iron portcullis grate at `(5,9)`.
- **Key Findings**:
  1. **Passage Bit vs. Slab Span (`lowFlags & 0x08`)**: In `Dungeon.dat`, bit 3 (`0x08`) on `DOOR` and `STAIRS` tiles encodes the **corridor passage direction** (`0 = West-East passage` flanked by North/South walls $\rightarrow$ `'NORTH_SOUTH'` door slab across the corridor; `1 = North-South passage` flanked by West/East walls $\rightarrow$ `'WEST_EAST'` door slab across the corridor). Verified across **158/158** interior flanked doors in all 14 levels.
  2. **3D Stone Doorjambs vs. Parallel Slot (`77..80`)**: Only `item[77]` (`32×123` at `x=96, y=0`) is a parallel/edge-on center doorway track (depth 1). `item[78]` (`32×94`), `item[79]` (`48×65`), and `item[80]` (`32×44`) are **FTL's 3D stone doorjambs for crosswise doors** at depths `1, 2, 3` (`left: flipX=false`, `right: flipX=true` at `(43/149, 14)`, `(48/128, 22)`, `(64/128, 27)`), paired with top lintels `82` (`128×4`) & `83` (`96×3`) and right-jamb push-button `315` (`16×9`).
  3. **`DB0` Door Materials & Opening Mode (`w1`)**: `w1 & 0x03` selects `0=IRON_GRATE (108..110)`, `1=WOODEN (111..113)`, `2=METAL (114..116)`, `3=RA_MAGIC (117..119)`; `(w1 & 0x20) === 0` indicates horizontal double-sliding halves (`offsets 3444..3964`), while `item[301]` (`96×88`) provides the jagged breach mask (`pixel === 0`) for bashed doors (`progress === 5`).


## Lesson 005 — FTL Item Catalog in `graphics.dat` (`item[556]`, `items 42..48`, `item[559]`) & `Dungeon.dat` `DB5..DB10` Chains (2026-11-02)
- **Context**: Verifying Sprint 2 item names, `16×16` icon sheets, paperdoll panels, and `DB5..DB10` item records in `public/assets/extracted/dm1/`.
- **Key Findings**:
  1. **UI Panels**: `item[17]` (`224×136`) is the Champion Paperdoll Inventory backdrop; `item[23]`, `item[25]`, `item[27]`, and `item[40]` (`144×73`) are the right-side sub-panels (Scroll, Open Chest, Stats, Resurrect/Reincarnate).
  2. **199 High-Bit Item Names (`item[556]`, `1,847`B)**: Every item name string ends with `char | 0x80`, yielding **199 strings** (`0..198`) in exact 1:1 alignment with icon indices `0..198` (`0..3 COMPASS`, `4..7 TORCH`, `8..9 WATERSKIN`, `30..31 OPEN/CLOSED SCROLL`, `32..66 WEAPONS`, `67..119 CLOTHES/ARMOR/SHIELDS`, `144..145 CHEST`, `147/198 BONES`, `148..167 POTIONS/BOMBS`, `168..175 FOOD`, `176..191 KEYS`, `195 EMPTY FLASK`).
  3. **7 Item Icon Sheets (`items 42..48`, each `256×32`)**: Each sheet holds `16 cols × 2 rows = 32` `16×16` icons (`224` total). Icon `N` lives on `sheet = 42 + Math.floor(N / 32)` at `col = (N % 32) % 16`, `row = Math.floor((N % 32) / 16)`.
  4. **180-Entry `ObjectDescriptor` Table (`item[559]`, offsets `1959..3038`, `stride = 6`)**: Contiguous 6-byte `[iconIndex, floorSpriteDescIdx, subtypeStatIdx, equipMaskHi, equipMaskLo, extra]` descriptors ordered: `0..22` (`DB7` Scroll, `DB9` Chest, `21 × DB8` Potions) + `23..68` (`46 × DB5` Weapons) + `69..126` (`58 × DB6` Clothes) + `127..179` (`53 × DB10` Misc/Food/Keys/Coins/Bones).
  5. **Chest & Champion Mirror Gear Chains (`Dungeon.dat`)**: In `DB9` Chests (`8` bytes), `w1` (`offset +2`) is the `followObjectChain(w1)` head ID of items stored inside the chest. On Level 0 (`Hall of Champions`), each Champion's starting clothes/weapons/items are chained directly behind their `rawType=127` Mirror actuator on the same wall `face`.


## Lesson 006 — Live Rendering and Independent Spatial QA (2026-11-03)

Unit render checks missed white text drawn outside the original scroll parchment. Live Chromium PNG review found it. Measure original sprite border pixels rather than guessing slot geometry; chest slots are irregular. Compare changed text pixels with a blank parchment to assert bounds and dark-ink contrast in both original and fallback art. Independent world-coordinate checks caught approaching-lane inversion, closed-door floor overdraw and inventory hiding the sleep overlay; verify all four facing directions and both sides of the door midpoint. Keep real-browser screenshots and pure simulation tests as separate gate evidence.

## Lesson 007 — Explicit Runtime Routes and Honest Audit Results (2026-11-03)

Audio presets must distinguish explicit silence (`null`) from synthesized playback. Missing keys in old presets inherit new cue defaults without overriding explicit silence. The trace-annotation Makefile target can exit successfully despite a missing jinja2 import; inspect its captured output and report the audit unavailable rather than claiming it passed. Hand-load attribution must not change when the player views another inventory; Morpheus assigned it to the stable living leader, counting nested held-chest contents once (implemented and verified in final QA on 2026-11-03).

## Lesson 008 — Final Story Audit Must Cover Every Accepted Criterion (2026-11-03)
Earlier bounded phase approvals missed side alcoves, equipment stat effects, depletion warning colors and party-wipe feedback. A final accepted-story audit reopened and completed these requirements rather than weakening docs. Side visibility tests cover32depth/facing/side combinations plus backfaces/occlusion; equipment tests verify bonuses are reversed without mutating base stats and feed actual throw/mana behavior. Final evidence:177 aggregate tests and2additional independent gameplay tests passed; strict lint/typecheck and build passed;27actual browser checks and20render scenes passed with no browser errors. Serialize bobp make calls because its capture file is shared. Trace tooling missing jinja2 is a separate unresolved tooling issue and must never be reported as a clean audit.


## Lesson 009 — Verify Torch Art and Cursor Hotspots (2026-11-03)
Original sheet42 icons4..7 progress from unlit to full flame, not fresh to burned-out. Compare real decoded artwork before defining a charge mapping. Resolve charge-sensitive icons centrally so hand slots, inventory, world and cursor show the same complete sprite. Center carried sprites on pointer and clip naturally at edges; hide duplicate native arrow. Final183tests and29live browser checks passed. Evidence build/visual-review/torch-stages.png and live-torch-cursor.png.
