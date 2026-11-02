Sprint 1 task board and single source of truth for active phases, assignees, and gates.

TLDR:
    Goal: Deliver Sprint 1 (Engine Foundation & 320x200 Amiga Vertical Slice) across 3 bounded phases of 2-3 tasks each.
    Status: Sprint 1 COMPLETE and LAUNCHED (8/8 tasks done, 29/29 Vitest tests green, Smith UX-approved, Oracle archived).
    Action: Run bobp make dev to play Sprint 1, or run /sprint *plan sprint to start Sprint 2.

# Sprint 1 Task Board — Engine Foundation & Amiga Vertical Slice

- **PRD**: [docs/PRD.md](docs/PRD.md)
- **Stories**: [docs/USER_STORIES.md](docs/USER_STORIES.md) (*Gate 1 Approved by Smith*)
- **Architecture**: [docs/ARCH.md](docs/ARCH.md) (*Gate 2 Approved by Smith*)
- **Decisions**: [docs/DECISIONS.md](docs/DECISIONS.md)

---

## Phase 1: Toolchain, Dual-Mode Data & Headless 6 Hz Engine
**Scope**: Stories 1.1 & 1.3 (Pure simulation core — zero DOM coupling)
**Chain**: `Neo` (`*swe impl phase-1`) $\rightarrow$ `Trin` (`*qa uat phase-1`) $\rightarrow$ `Morpheus` (`*lead review phase-1`)

- [x] **Task 1.1** (`@Neo`): Bootstrap `Makefile` (`help`, `setup`, `extract-assets`, `dev`, `build`, `test`, `lint`, `typecheck`, `tldr`), `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.gitignore` (ignoring `*.zip`, `*.adf`, and extracted `.dat` binaries), and `README.md`; implement Amiga OFS `.adf` extractor to unpack `/DM/Dungeon.dat` (`25,006`B) and `/DM/graphics.dat` (`411,960`B, 575 uncompressed items) from `Dungeon-Master_Amiga_EN.zip`.
- [x] **Task 1.2** (`@Neo`): Implement `DungeonDatParser` & `CampaignBundle` (`src/data/`, `src/engine/types.ts`) parsing real Big-Endian `Dungeon.dat` (all 14 levels including `Level 0: Hall of Champions` with all 24 original Champion Mirrors/texts + `Level 1` doors, switches, plates, pits, stairs, fake walls, teleporters) alongside deterministic test fixtures.
- [x] **Task 1.3** (`@Neo`): Implement deterministic ~6 Hz `SimulationReducer` & `ActuatorEngine` (`src/engine/`) emitting `EngineEvent[]` for step/turn cooldowns, wall bump `"OOF!"`, multi-tick door animations, switches/plates, pit falls, stairs, teleporters, and Champion Mirror Resurrect/Reincarnate/Cancel, backed by comprehensive Vitest unit tests (`tests/engine/`).

---

## Phase 2: 320×200 Amiga Framebuffer, Pseudo-3D Viewport & Classic HUD
**Scope**: Story 1.2 (Visual rendering pipeline + canvas unit tests)
**Chain**: `Neo` (`*swe impl phase-2`) $\rightarrow$ `Trin` (`*qa uat phase-2`) $\rightarrow$ `Morpheus` (`*lead review phase-2`)

- [x] **Task 2.1** (`@Neo`): Implement `GraphicsDatDecoder` (`src/data/graphicsDatParser.ts` + `src/render/`) decoding the 575 uncompressed Amiga `graphics.dat` items (4-bitplane `IMG1`/`IMG5` walls, floors, ceilings, doors, champion portraits, UI panels, fonts, and palettes) onto the `320×200` offscreen framebuffer with 6-level torchlight shading LUT and clean-room fallback.
- [x] **Task 2.2** (`@Neo`): Implement `ViewportPainter` (`224×136` depth-3 perspective corridor, step-alternating floor/ceiling parity, doors, pits, stairs, wall switches, mirrors, blue-haze teleporters) and `HudPainter` (`4 × 68px` champion slots at `x=0..271`, utility pills at `x=272..319`, right movement arrow pad, bottom scrolling message strip, and Champion Mirror modal), with Vitest rendering/layout tests (`tests/render/`).

---

## Phase 3: Input, Paula Spatial Web Audio, QoL Automap & Playable Slice
**Scope**: Story 1.4 (End-to-end playable browser app + mandatory Smith UX gate)
**Chain**: `Neo` (`*swe impl phase-3`) $\rightarrow$ `Trin` (`*qa uat phase-3`) $\rightarrow$ `Morpheus` (`*lead review phase-3`) $\rightarrow$ **`Smith` (`*user test phase-3` — REQUIRED)**

- [x] **Task 3.1** (`@Neo`): Implement `InputController` (`src/input/`) using `getBoundingClientRect()` `320×200` hitbox mapping (movement pad, facing wall switches/mirrors/doors, mirror modal buttons, utility pills) + Purist-default / QoL-gated `QWEASD`, Arrow keys, and `M` automap toggle with Vitest hitbox/input tests (`tests/input/`).
- [x] **Task 3.2** (`@Neo`): Implement `PaulaStereoAudio` (`src/audio/`) playing genuine Amiga 8-bit PCM audio samples decoded from `graphics.dat` (with procedural synth fallback), first-gesture `AudioContext` auto-unlock, `AudioStatus` (`locked` | `active` | `muted`), and Manhattan-distance + party-facing stereo panning (`tests/audio/`).
- [x] **Task 3.3** (`@Neo`): Wire `index.html`, `src/main.ts` (60 FPS render loop + 6 Hz simulation accumulator), and QoL `AutomapPainter`; pass `bobp make test`, `bobp make lint`, and `bobp make build`. **Smith re-engages post-Phase 3 for live `*user test phase-3`.**

---

## Backlog (Future Sprints — Reference: `docs/PRD.md`)
- **Sprint 2**: Paperdoll Inventory (`item[17]`), Item Icon Sheets (`items 42..48` from `graphics.dat`), Weight/Encumbrance, Cursor-Hand Drag & Throw Physics, Floor Item Stacks, Food/Water/Stamina/Sleep, Vi Altars (with mandatory live PNG UX frame capture per Sprint 1 retro).
- **Sprint 3**: 4-Class / 16-Subskill Usage Progression, Melee/Ranged Combat Actions (`item[14]` damage starburst), 24-Rune Combinatorial Spell & Potion System (reusing `item[557]` rune glyph slots `97..122`).
- **Sprint 4**: All 27 DM1 Monster Types, Group AI/Formations, Scent Tracking, Doors Crushing Monsters, Monster Generators.
- **Sprint 5**: Complete 14-Level DM1 Campaign Polish, Firestaff/Lord Chaos Endings, Multi-Slot IndexedDB Saves, File-Picker `.DAT` Import.
- **Sprint 6**: *Chaos Strikes Back* (Champion Import Utility, Prison, Corbums & Ful Ya).
- **Sprint 7–8**: *Dungeon Master II: The Legend of Skullkeep* (LZX unpacking from `DM2_archive.LZX`, Outdoor/Weather, Shops/Coins, Commandable Minions).
