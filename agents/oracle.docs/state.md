# Agent State

## Context
### Recent Decisions
- Recorded `Lesson 004` (and refined `Lesson 003`) in `agents/oracle.docs/lessons.md`:
  - `Dungeon.dat` `lowFlags & 0x08` encodes corridor passage direction (`0 = West-East passage -> NORTH_SOUTH slab`, `1 = North-South passage -> WEST_EAST slab`), verified across 158/158 interior flanked doors in all 14 levels.
  - `sprites 78, 79, 80` are crosswise 3D stone doorjambs (paired with lintels `82, 83` and push-button `315`), while only `sprite 77` is the depth-1 edge-on doorway track.
  - `DB0` `w1 & 0x03` maps all 4 door materials (`108..119`), `(w1 & 0x20) === 0` maps horizontal double-sliding doors, and `sprite 301` masks bashed doors.

## Current Task
**Status:** Complete (Lessons & Docs Synchronized)
**Assigned to:** Oracle (`*ora`)
**Started:** 2026-11-02

### Progress
- [x] Updated `Lesson 003` and added `Lesson 004` in `agents/oracle.docs/lessons.md`

---
*Last updated: 2026-11-02T15:01:00-05:00*
