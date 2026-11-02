# Agent State

## Context
### Recent Decisions
- Fixed sideways doors across all 14 levels in `src/data/dungeonDatParser.ts` and `src/render/viewportPainter.ts`:
  1. `Dungeon.dat` bit 3 (`0x08`) on `DOOR` and `STAIRS` tiles encodes **corridor passage direction** (`0 = West-East passage` with North/South walls -> `'NORTH_SOUTH'` door slab across hallway; `1 = North-South passage` with West/East walls -> `'WEST_EAST'` door slab across hallway). Verified 158/158 interior doors across all 14 levels match their flanking walls.
  2. Decoded all 4 `DB0` door materials (`0 = IRON_GRATE`, `1 = WOODEN`, `2 = METAL`, `3 = RA_MAGIC`), horizontal double-sliding doors (`(w1 & 0x20) === 0`), and `sprite 301` bashed cutout mask (`progress === 5`).
  3. Replaced synthetic `drawBevelBox` door frames with FTL's authentic 3D stone doorjamb sprites (`78` at D1, `79` at D2, `80` at D3), top lintels (`82`, `83`), and push-button (`315` on right jamb), keeping `sprite 77` exclusively for depth-1 edge-on parallel doorways.
  4. Expanded `LAYOUT_RECTS.VIEWPORT_CENTER_HIT` (`x=32..191, y=42..151`) so clicking right-jamb door buttons at D1 triggers `INTERACT_AHEAD`.

### Important Notes
- Passed `bobp make -vvv test` (32/32 green), `bobp make -vvv build` (23.74 kB gzip), and `bobp make via-index`.

## Current Task
**Status:** Complete (100% — Handed Off to Trin)
**Assigned to:** Neo (`*swe`)
**Started:** 2026-11-02

### Progress
- [x] Fixed `Dungeon.dat` `DOOR` / `STAIRS` `0x08` orientation & 4-material `DB0` decoding
- [x] Wired authentic FTL `78/79/80` 3D stone doorjambs, `82/83` lintels, `315` push-button, and `301` bashed cutout in `viewportPainter.ts`
- [x] Added 14-level `Dungeon.dat` door orientation sweep + `LVL:0 (7,9) DIR:WEST` render regression tests (32/32 passing)

---
*Last updated: 2026-11-02T15:00:10-05:00*
