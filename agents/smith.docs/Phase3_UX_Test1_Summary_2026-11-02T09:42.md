# Phase 3 Live UX Test #1 — Smith (`*user`)

## Visual Inspection Findings (4 Live `320×200` Rendered Screenshots)
### Strengths
- Genuine 1988 Amiga stone corridor walls, ceiling (`item[75]`), floor (`item[76]`), and Champion portraits (`item[26]`, e.g. Chani) render with razor-sharp integer-scaled pixel fidelity.
- Top-bar Champion boxes (`x=0..271`) and right-hand Utility Pills (`x=272..319`: `1988`/`QOL:ON`, `NO MAP`/`MAP:ON`, `SND:ON`) have zero visual overlap.
- Champion Mirror Modal (`RESURRECT`, `REINCARN`, `CANCEL`) is immediately readable and well-proportioned.

### UX Defects Found (`*user defects`)
1. **Defect 1 — Wrong Movement Arrow Pad Sprite (`item[14]` vs `item[13]`)**:
   - In `src/render/hudPainter.ts`, `bundle?.sprites.get(14)` blits the `96×45` cyan damage starburst (`item[14]`) onto `(224, 124, 96, 45)` instead of the 6-button Movement Arrow Pad (`item[13]`, `96×45`), violating **Recognition Rather Than Recall**.
2. **Defect 2 — Lowercase ASCII Mapped to Spell Runes in `item[557]` Font**:
   - In `src/render/bitmapFont.ts`, `drawBitmapText` indexes `systemFont` (`item[557]`) with raw character codes, where `97..122` (`'a'..'z'`) are FTL Magic Runes rather than Latin letters. Mixed-case level names (`"Hall of Champions"` on Automap header) render as arcane runes instead of uppercase `"HALL OF CHAMPIONS"`.

## Action
Returning `*user defects` to `@Neo` for targeted 2-file fix.
