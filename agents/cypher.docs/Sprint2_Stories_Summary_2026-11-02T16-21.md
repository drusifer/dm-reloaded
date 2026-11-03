# Sprint 2 User Stories Summary

- **Persona**: Cypher (`*pm plan sprint`)
- **Date**: 2026-11-02T16:21-05:00
- **Deliverable**: `docs/USER_STORIES.md` (Stories 2.1, 2.2, 2.3)

## Highlights
1. **Story 2.1 (Paperdoll Inventory, Chests, Scrolls & Encumbrance)**: Full `item[17]` paperdoll sheet inside `224×136` viewport, `items 42..48` icon sheets (+ `CleanRoomProvider` fallback), slot validation, 8-slot Chest sub-containers, `DB2` Scroll reading, and live `kg` Load/Max Load encumbrance feedback.
2. **Story 2.2 (`DB5..DB10` World Items, Alcoves, Keyholes & Throw Physics)**: All 6 item DB tables parsed across 14 `Dungeon.dat` levels with 2-bit sub-tile quadrants/faces, perspective floor/alcove rendering, cursor-hand (`handItem`) pickup/drop, keyhole unlocking, and 6 Hz left/right lane projectile throwing activating plates/teleporters.
3. **Story 2.3 (Survival Vitals, Sleep, Torches & Vi Altars)**: 6 Hz Food/Water/Stamina loop, Mouth consumption, Wall Fountain drinking/refilling, Torch charge decay, `Zzz` Sleep mode with instant wake-up exit, Champion death dropping gear + `<NAME> BONES`, and Vi Altar resurrection.
