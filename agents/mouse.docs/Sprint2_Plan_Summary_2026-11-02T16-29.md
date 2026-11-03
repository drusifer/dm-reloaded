# Sprint 2 Task Breakdown Summary (`*sm plan sprint`)

- **Persona**: Mouse (`*sm`)
- **Date**: 2026-11-02T16:29-05:00
- **Deliverable**: Root `task.md` (Single Source of Truth)

## Phase Sizing & Gate Plan
- **Phase 1 (3 tasks)**: FTL Item Catalog (`item[556]`, `item[559]`, `items 42..48`, `DB5..DB10` + Mirror gear + Chest chains) + pure `InventoryEngine`, `ProjectileEngine`, and `SurvivalEngine` (`0` DOM coupling).
- **Phase 2 (2 tasks)**: `InventoryPainter` (`item[17]`, `23`, `25`, `items 42..48` icons, Load kg, Food/Water) + `ViewportPainter`/`HudPainter` sub-tile floor stacks, alcoves/fountains/altars, flying items, Sleep overlay, and cursor-hand affordance $\rightarrow$ **Mandatory `@Smith *user test phase-2` Live PNG Gate**.
- **Phase 3 (2 tasks)**: `InputController` (`contextmenu` suppression, paperdoll slots, strict viewport precedence, QoL `1–4`/`Z`/`ESC`) + `PaulaStereoAudio` cues, `(mx, my)` cursor loop, and vertical-slice tests $\rightarrow$ **Mandatory `@Smith *user test phase-3` Live PNG Gate**.
