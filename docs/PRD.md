Product Requirements Document for the full web-based recreation of the FTL Games Amiga Dungeon Master trilogy.

TLDR:
    Goal: Deliver a complete, faithful browser-based implementation of the classic Amiga Dungeon Master series (DM1, Chaos Strikes Back, and DM II: Skullkeep).
    Status: Approved scope; Sprint 1 stories ready for Smith Gate 1 review.
    Action: Review Sprint 1 user stories in docs/USER_STORIES.md and design engine architecture in docs/ARCH.md.

# Product Requirements Document (PRD): Dungeon Master — Amiga Trilogy

## 1. Product Vision & Overview
**Dungeon Master** is a full and complete, clean-room web implementation of FTL Games' legendary Commodore Amiga first-person real-time dungeon crawler trilogy:
1. **Milestone I — *Dungeon Master* (1988 Amiga Edition)**: 14 interconnected subterranean dungeon levels, 24 Hall of Champions heroes, Lord Chaos & Firestaff endgame.
2. **Milestone II — *Chaos Strikes Back* (1989 Amiga Expansion/Sequel)**: Champion Utility (import party from DM1 or select from Prison), nonlinear diabolical dungeon, 4 Corbums of Ful Ya.
3. **Milestone III — *Dungeon Master II: The Legend of Skullkeep* (1993 Amiga Sequel)**: Expanded engine with outdoor/weather environments, dynamic shop/merchant economy, commandable minions, and upgraded AI/machinery.

The game runs zero-install in modern browsers using **TypeScript, HTML5 Canvas, and Web Audio**, rendering an authentic **320×200 pixel-accurate Amiga viewport** (integer-scaled with crisp nearest-neighbor pixels) and stereo spatial audio modeled after the Amiga Paula chip.

---

## 2. Core Product Pillars

### 2.1 Dual-Mode Asset & Campaign Architecture
- **Out-of-the-Box Clean-Room Mode (Default)**: Ships with complete, copyright-safe, built-in 16/32-color Amiga-aesthetic pixel art, synthesized/procedural Paula-style stereo sound effects, and full campaign definitions so the game is 100% playable immediately upon opening.
- **Original Data Loader Mode (Optional)**: Supports loading user-supplied classic FTL data files (`DUNGEON.DAT`, `GRAPHICS.DAT`, `CSBGAME.DAT`) into the same normalized runtime engine data structures.

### 2.2 Authentic 1988 Amiga Simulation Rules (Default)
- **Real-Time Tick Simulation**: Continuous real-time world clock (~6 ticks/sec matching the classic 5.45–6 Hz FTL game clock) governing monster AI, projectiles, door animations, light decay, regeneration, hunger/thirst, and poison.
- **Pseudo-3D First-Person Grid Viewport**: Tile-based step movement (Forward, Backward, Strafe Left, Strafe Right, Turn 90° Left/Right) with 3-tile forward depth + peripheral side visibility, party formation (2×2 grid: Front-Left, Front-Right, Back-Left, Back-Right), and wall/floor/ceiling/object perspective scaling.
- **Direct Mouse & Physical Inventory UX**:
  - Cursor-as-hand item manipulation: pick up items from floor alcoves/tiles, throw objects into the 3D viewport (left/right side of corridor), place items into chests/scrolls/pouches, click doors/buttons/keyholes/fountains directly.
  - Per-champion inventory paperdoll (Head, Neck, Torso, Legs, Feet, Left/Right Action Hands, Pouch, 2 Quiver rows, 17-slot Backpack) with exact kilogram weight & encumbrance affecting stamina drain and movement cooldowns.
- **Usage-Based Progression (No Traditional XP Levels)**:
  - 4 primary classes (**Fighter**, **Ninja**, **Priest**, **Wizard**), each subdivided into 4 hidden sub-skills (16 total sub-skills), progressing across 16 mastery ranks (*None*, *Neophyte*, *Novice*, *Apprentice*, *Journeyman*, *Craftsman*, *Artisan*, *Adept*, *Expert*, *Lo Master* … *Archmaster*) purely by performing actions in the world, with dungeon-depth XP multipliers.
  - **Resurrect vs. Reincarnate** at Champion Mirrors (keep pre-trained skills vs. reset skills for boosted base attribute growth).
- **Combinatorial Runic Magic System**:
  - 6×4 Rune Selector across 4 tiers:
    1. **Power** (*Lo*, *Um*, *On*, *Ee*, *Pal*, *Mon*)
    2. **Elemental** (*Ya*, *Vi*, *Oh*, *Ful*, *Des*, *Zo*)
    3. **Form** (*Ven*, *Ew*, *Kath*, *Ir*, *Bro*, *Gor*)
    4. **Class/Alignment** (*Ku*, *Ros*, *Dain*, *Neta*, *Ra*, *Sar*)
  - Casting consumes Mana per rune syllable, checks Priest/Wizard skill mastery (fizzle/backfire risk), brews potions into Empty Flasks (*Vi*, *Ya*, *Ee*, etc.), projects spells (*Ful Ir* Fireball, *Des Ew* Weaken Non-Material, *Zo* Open Door), or enchants party shields/torchlight.
- **Survival, Lighting & Acoustic Immersion**:
  - Health, Stamina, and Mana bars per champion; Food & Water meters; sleeping to accelerate recovery; harvesting monster meat (e.g., Screamer Slices, Dragon Steak); refilling Waterskins/Flasks at fountains; Vi Altars of Rebirth for fallen champions' bones.
  - Multi-step ambient light levels driven by torches (burning down over time), *Ful* / *Oh Ir Ra* spells, Illumulet, and per-level darkness; complete blackness when unlit.
  - Stereo distance-attenuated spatial audio: directional footsteps, metallic door clanks, switches, monster roars, wall bumps ("oof!"), and spell explosions warning players of unseen threats.
- **Interactive Dungeon Mechanics & Physics**:
  - Wooden/iron/ra-doors (bashable, blastable with *Zo* or Fireballs, lockable with specific keys/coins/gems, and **capable of crushing monsters or dropping on party heads**).
  - Pressure plates (party/monster/item weight/type triggers), hidden wall switches, alcoves, false/illusionary walls, ceiling/floor pits (visible, invisible, open/closed, falling damage across vertical dungeon levels), teleporters (visible blue haze or silent, item/monster/party filters, rotation), spinners, projectile launchers, monster generators.

### 2.3 Toggleable Quality-of-Life (QoL) Enhancements
Disabled or non-intrusive when "1988 Purist Mode" is selected, and cleanly toggleable at any time via a retro-styled Options Drawer:
1. **Keyboard Controls**: Optional `WASD` / `QWEASD` movement + `1–4` champion inventory toggles + numeric rune/weapon hotkeys alongside classic mouse arrows.
2. **Parchment Automap**: Optional toggleable grid map recording visited tiles, stairs, pits, and player notes.
3. **Save System**: Multiple named browser save slots (`IndexedDB` / `localStorage`) + JSON/binary `.sav` export/import (plus single-slot "Save & Quit" purist option).
4. **Viewport Display Options**: Crisp integer pixel scaling, optional Amiga CRT scanline filter, and stereo audio volume mixer.

---

## 3. Trilogy Phased Roadmap

| Milestone | Scope | Key Sprints |
|-----------|-------|-------------|
| **Sprint 1: Engine Foundation & Vertical Slice** | Build toolchain (`Makefile`, TypeScript, Vite, Vitest), 320×200 Amiga Canvas + HUD shell, deterministic 6 Hz simulation clock, multi-level dungeon grid, step/turn movement, lighting, doors/pits/plates/teleporters, stereo Web Audio synthesizer, Dual-Mode data schema, QoL input toggle, playable starter dungeon slice | Sprint 1 |
| **Sprint 2: Champions, Physical Inventory & Survival** | Hall of Champions mirrors (24 heroes, Resurrect/Reincarnate), full paperdoll inventory, weight/encumbrance, mouse cursor-hand drag/drop/throw physics, Food/Water/Stamina/Sleep, Vi Altar bones revival | Sprint 2 |
| **Sprint 3: Combat, Runic Magic & Progression** | 4-class / 16-subskill usage XP engine, melee/thrown/ranged weapon action menus, full 24-rune spell & potion system, projectiles & explosions in 3D space | Sprint 3 |
| **Sprint 4: Monster Ecology, AI & Traps** | Complete DM1 27 monster types (Screamers, Mummies, Worms, Giggler thief, Beholders, Knights, Materializers, Lord Chaos, Red Dragon), group formations (1–4 per tile), pathfinding/scent tracking, generators & complex triggers | Sprint 4 |
| **Sprint 5: Full *Dungeon Master* (DM1) Campaign & Save/DAT Loader** | All 14 authentic DM1 levels, Firestaff / Power Gem / Fuse / Order/Chaos endgame endings, multi-slot save/load, QoL parchment automap, optional `DUNGEON.DAT`/`GRAPHICS.DAT` binary parser | Sprint 5 |
| **Sprint 6: *Chaos Strikes Back* (CSB)** | Champion Utility & DM1 party importer, Prison of Champions, Diabolical Demon Director /DSA-equivalent trigger extensions, 4 Corbums & Ful Ya Pit endgame | Sprint 6 |
| **Sprint 7+: *Dungeon Master II: The Legend of Skullkeep*** | Outdoor tilesets & dynamic weather/day-night, Skullkeep mechanics, merchant table barter & coin system, commandable minions, DM2 campaign & UI skin | Sprints 7–8 |

---

## 4. Non-Functional Requirements
- **Deterministic Simulation Core**: Decouple pure simulation state & tick logic (`src/engine/`) from Canvas rendering (`src/render/`) and Web Audio (`src/audio/`) so 100% of game rules, puzzles, combat, and AI are unit-testable headlessly in Vitest.
- **Performance**: Solid 60 FPS UI/cursor responsiveness over the classic ~6 Hz world tick; zero frame drops on 320×200 integer-scaled Canvas.
- **Automation Compliance**: All build, lint, typecheck, and test workflows run via `bobp make <target>` (`Makefile` targets: `help`, `setup`, `build`, `test`, `lint`, `dev`, `tldr`).
