Sprint 2 task board and single source of truth for active phases, assignees, and gates.

TLDR:
    Goal: Deliver Sprint 2 (Champions, Physical Inventory, World Items, Throw Physics & Survival) across 3 bounded phases (including final acceptance completion checks).
    Status: All Sprint 2 tasks complete, including reopened final accepted-story criteria; QA, architecture and live Smith approvals passed 2026-11-03.
    Action: Retrospective recorded; Cypher local launch completed Sprint 2. Final verification: 177 aggregate tests + 2 additional independent QA tests, lint/typecheck, build, 27 browser checks and 20 rendered scenes passed.
    Note: Historical completion claims are not substitutes for review evidence.

# Sprint 2 Task Board — Champions, Physical Inventory & Survival

- **PRD**: [docs/PRD.md](docs/PRD.md)
- **Stories**: [docs/USER_STORIES.md](docs/USER_STORIES.md) (*Gate 1 Approved by Smith*)
- **Architecture**: [docs/ARCH.md](docs/ARCH.md) (*Gate 2 Approved by Smith*)
- **Decisions & Lessons**: [docs/DECISIONS.md](docs/DECISIONS.md) (`ADR-006..008`) & [agents/oracle.docs/lessons.md](agents/oracle.docs/lessons.md) (`Lessons 001..005`)

---

## Phase 1: FTL Item Catalog, `DB5..DB10` World Items & Headless 6 Hz Inventory/Throw/Survival Core
**Scope**: Stories 2.1, 2.2, 2.3 (Pure data & headless simulation core — zero DOM coupling)
**Chain**: `Neo` (`*swe impl phase-1`) $\rightarrow$ `Trin` (`*qa uat phase-1`) $\rightarrow$ `Morpheus` (`*lead review phase-1`)

- [x] **Task 1.1** (`@Neo`) — DONE 2026-11-03 (tests/data/itemCatalog.test.ts: real graphics.dat + Dungeon.dat verified). Scope: Implement `src/data/itemCatalog.ts` and extend `graphicsDatParser.ts`, `dungeonDatParser.ts`, and `cleanRoomProvider.ts` to decode `item[556]` (199 item names), `item[559]` (`180 × 6`-byte `ObjectDescriptor` table), `items 42..48` (`16×16` item icon slicer), all `DB5..DB10` world items across 14 levels (preserving 2-bit sub-tile quadrants, wall alcoves/fountains/keyholes/Vi Altars, `DB9` Chest `w1` child chains, and `DB7` Scroll `DB2` texts), and Level 0 Champion Mirror starting equipment chains (`tests/data/`).
- [x] **Task 1.2** (DONE 2026-11-03, tests/engine/inventory.test.ts) (`@Neo`): Implement pure `InventoryEngine` (`src/engine/inventory.ts`) and `ChampionInventory` / `GameState.items` / persistent `handItem` state (`Head`, `Neck`, `Torso`, `Legs`, `Feet`, `L/R Hand`, `Pouch 1..2`, `Quiver 1..4`, `17`-slot `Backpack`, `8`-slot `Chest` sub-containers, `Scroll` inspection, slot compatibility validation emitting `"CANNOT EQUIP THERE"`, `Load / MaxLoad kg` encumbrance cooldowns, and dynamic Torch/Illumulet light radius) (`tests/engine/inventory.test.ts`).
- [x] **Task 1.3** (DONE 2026-11-03, tests/engine/survivalAndThrow.test.ts + phase1RealUat.test.ts) (`@Neo`): Implement pure 6 Hz `ProjectileEngine` (`src/engine/projectiles.ts`: Left/Right sub-tile corridor throws, Strength-vs-weight kinetic range, `IRON_GRATE` small-item pass-through, object teleporters, item-triggered floor plates/alcoves, keyholes) and `SurvivalEngine` (`src/engine/survival.ts`: Food/Water/Stamina ticks, Mouth consumption, Wall Fountain drink/refill, Torch charge burn, `Zzz` Sleep recovery/wake, pit/door-crush/starvation death dropping gear + `<NAME> BONES`, and Vi Altar revival) wired into `SimulationReducer` (`tests/engine/survivalAndThrow.test.ts`).

---

## Phase 2: Paperdoll Inventory (`item[17]`), `16×16` Icon Sheets (`42..48`) & 3D Floor/Alcove Rendering
**Scope**: Stories 2.1 & 2.2 (Visual rendering pipeline + **Mandatory Smith Live PNG Gate**)
**Chain**: `Neo` (`*swe impl phase-2`) $\rightarrow$ `Trin` (`*qa uat phase-2`) $\rightarrow$ `Morpheus` (`*lead review phase-2`) $\rightarrow$ **`Smith` (`*user test phase-2` — REQUIRED)**

- [x] **Task 2.0** (`@Neo`, ADR-009 — do FIRST in Phase 2): Add `SpriteSource` (`src/render/spriteSource.ts`): `getSprite(key)` with DM1 key→`graphics.dat` index adapter and clean-room fallback; all NEW Phase 2 painters (`inventoryPainter.ts`, floor/alcove items) request sprites by semantic key only, never by raw index (`tests/render/spriteSource.test.ts`). Existing painters migrate later.
- [x] **Task 2.1** (`@Neo`): Verify exact `item[17]` (`224×136`) and `item[25]` (`144×73`) slot frame coordinates in `src/render/layout.ts` and implement `src/render/inventoryPainter.ts` rendering the `item[17]` Paperdoll Inventory screen, `items 42..48` `16×16` item icons (+ clean-room fallback icons), `item[25]` 8-slot Open Chest sub-panel, `item[23]` Open Scroll text sub-panel, Champion Stats (`STR..ANTI-FIRE`), Food/Water gauges, yellow/red `LOAD X.X / MAX Y.Y KG`, Mouth/Eye/Save/Sleep icons, and dead-champion skull HUD cards (`tests/render/inventoryRender.test.ts`).
- [x] **Task 2.2** (`@Neo`): Extend `ViewportPainter` & `HudPainter` to render perspective floor item stacks on `depths 0..3` sub-tile quadrants, wall alcoves/fountains/keyholes/Vi Altars with placed items, flying corridor projectiles, top-bar L/R hand icons, `ZZZ`/`SFX` utility pills, Sleep darkened overlay, and dual cursor-hand `16×16` icon + `HELD: <NAME> (<X.X> KG)` banner. **Smith re-engages post-Phase 2 for mandatory live PNG `*user test phase-2`.**

---

## Phase 3: Cursor-Hand Input, Corridor Throwing, Paula Survival SFX & Playable Slice
**Scope**: Stories 2.1, 2.2, 2.3 (End-to-end playable browser interaction + **Mandatory Smith Live PNG Gate**)
**Chain**: `Neo` (`*swe impl phase-3`) $\rightarrow$ `Trin` (`*qa uat phase-3`) $\rightarrow$ `Morpheus` (`*lead review phase-3`) $\rightarrow$ **`Smith` (`*user test phase-3` — REQUIRED)**

- [x] **Task 3.1** (`@Neo`): Extend `InputController` (`src/input/inputController.ts`) with canvas `contextmenu` suppression (right-click portrait/canvas inventory toggle + trackpad-friendly left-click portrait header), QoL `1–4` / `Z` / `ESC` shortcuts, top-bar L/R hand slot clicks, Paperdoll/Chest/Mouth/Eye slot hit-testing, and strict 3D Viewport click precedence (`Modal/Sleep -> Facing Wall Keyhole/Vi Altar/Fountain/Alcove -> Depth-0 Floor Front-Left/Front-Right Pickup/Drop -> Upper Left/Right Corridor Throw`) (`tests/input/`).
- [x] **Task 3.2** (`@Neo`): Wire new `PaulaStereoAudio` cues (`ITEM_PICKUP`, `THROW_SWOOSH`, `GULP`, `LOCK_CLICK`, `CHAMPION_DEATH` in `src/audio/paulaAudio.ts` + `soundboard.ts`), logical `(mx, my)` pointer tracking in `src/main.ts`, and Sprint 2 vertical-slice integration tests (`tests/integration/sprint2VerticalSlice.test.ts`); pass `bobp make test`, `bobp make lint`, and `bobp make build`. **Smith re-engages post-Phase 3 for mandatory live PNG `*user test phase-3`.**

- [x] **Task 3.3** (`@Neo`, final accepted-story audit): Finish derived equipment armor/stat display and effects (AC2.1.2), side alcove art/contents (AC2.2.2), low/depleted food/water warning colors (AC2.3.1), and visible Game Over with actual click/Enter restart (AC2.3.3). Independent targeted tests and fresh live PNG/input review required before closing; initial approval did not cover these omitted criteria.

---

## Completed Milestones

- **Sprint 2 (`sprint-2` — Delivered locally 2026-11-03)**: Physical inventory/chests/scrolls and derived equipment effects; center/side world items and throws; survival/bones/Vi Altars; pointer and sound cues; warning/restart feedback. Final accepted-story approvals in `agents/chat_archive/CHAT_sprint-2-acceptance.md`; original phase history in `CHAT_sprint-2.md`. No deployment.
- **Sprint 1 (`sprint-1` — Delivered & Launched 2026-11-02)**: Toolchain, OFS/8104 `Dungeon.dat` (14 levels, 24 Champions) & `graphics.dat` (535 RLE sprites, 33 `5500 Hz` Paula PCM sounds) decoders, `item[558]` perspective walls & `0x08` 3D doors, `320×200` Framebuffer/HUD/Automap, Purist/QoL input, Paula spatial audio + `SFX BOARD [B]` (`32/32` Vitest tests green).

## Backlog (Future Sprints — Reference: `docs/PRD.md`)
- **Sprint 2 retrospective follow-up**: repair trace-audit `jinja2` dependency and stop masking trace failures; serialize shared `bobp make` log writers; improve long-scroll pagination while retaining full logged text; keep final story-to-evidence review and live browser regressions.
- **Post-Sprint 2 (ADR-009)**: `bobp make export-sprites` (one PNG per sprite, `build/sprites/<category>/<index>_<WxH>.png` + `manifest.json`, round-trip test, gitignored); one parametric lighting filter replacing ramp swaps; semantic-key classification of all 535 sprites via the contact sheet (`G`). Later epic: campaign-pack loader (`campaign.json`, PNG sprites, `maps/`, `items.json`) for community content.
- **Sprint 3**: 4-Class / 16-Subskill Usage Progression, Melee/Ranged Combat Actions (`item[14]` damage starburst + `item[560]` action names), 24-Rune Combinatorial Spell & Potion System (reusing `item[557]` rune glyph slots `97..122`).
- **Sprint 4**: All 27 DM1 Monster Types, Group AI/Formations, Scent Tracking, Doors Crushing Monsters, Monster Generators.
- **Sprint 5**: Complete 14-Level DM1 Campaign Polish, Firestaff/Lord Chaos Endings, Multi-Slot IndexedDB Saves, File-Picker `.DAT` Import.
- **Sprint 6**: *Chaos Strikes Back* (Champion Import Utility, Prison, Corbums & Ful Ya).
- **Sprint 7–8**: *Dungeon Master II: The Legend of Skullkeep* (LZX unpacking from `DM2_archive.LZX`, Outdoor/Weather, Shops/Coins, Commandable Minions).
