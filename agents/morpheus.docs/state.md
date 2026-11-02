# Agent State

## Context
### Recent Decisions
- Approved `*lead review door-orientation`:
  1. `DoorState.orientation` and `StairsState.orientation` are now 100% consistent across `dungeonDatParser.ts`, `cleanRoomProvider.ts`, `viewportPainter.ts`, and `automapPainter.ts`.
  2. `viewportPainter.ts` uses authentic FTL `item[558]` blitter coordinates for crosswise door slabs (`108..119`), horizontal double-doors, bashed door mask (`301`), 3D stone doorjambs (`78..80`), lintels (`82..83`), and push-button (`315`) while preserving clean-room fallbacks.

## Current Task
**Status:** Complete (Architecture Approved — Handed Off to Smith)
**Assigned to:** Morpheus (`*lead`)
**Started:** 2026-11-02

### Progress
- [x] Reviewed parser/renderer/layout changes & hexagonal boundaries
- [x] Handed off to `@Smith *user test door-orientation`

---
*Last updated: 2026-11-02T15:00:20-05:00*
