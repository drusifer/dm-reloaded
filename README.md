Project overview, quickstart commands, controls, and documentation index for the Amiga Dungeon Master trilogy web implementation.

TLDR:
    Goal: Provide a complete browser-based TypeScript/Canvas/WebAudio recreation of the FTL Games Amiga Dungeon Master trilogy.
    Status: Sprint 1 delivered (Engine Foundation, 14-Level/24-Champion Dungeon.dat + 575-Item graphics.dat Decoders, 320x200 Viewport/HUD, Paula Spatial Audio, 29/29 Vitest tests green).
    Action: Run bobp make setup to install dependencies and unpack local Amiga archives, then bobp make dev to play or bobp make test to verify.

# Dungeon Master — Amiga Trilogy (Web Edition)

A pixel-authentic browser implementation of FTL Games' Commodore Amiga first-person real-time dungeon crawler series (*Dungeon Master*, *Chaos Strikes Back*, and *Dungeon Master II: The Legend of Skullkeep*), built with **TypeScript 5**, **HTML5 Canvas (`320×200` integer-scaled Amiga framebuffer)**, and **Paula Spatial Web Audio**.

## Sprint 1 Highlights
- **Authentic Amiga Binary Decoders (`src/data/`)**:
  - Unpacks local `Dungeon-Master_Amiga_EN.zip` OFS `.adf` disk images into gitignored `public/assets/extracted/` (plus joins `Dungeon-Master-II-Skullkeep_Amiga_EN.zip` into `DM2_archive.LZX`).
  - Decompresses `0x8104` prefix-bitstream `/DM/Dungeon.dat` (`25,006`B $\rightarrow$ `33,444`B) with all **14 original levels** and **24 Hall of Champions heroes**.
  - Decodes all **575 `/DM/graphics.dat` items**: **535/535** FTL 4bpp byte-aligned RLE sprites, **33** signed 8-bit Paula PCM sound effects, `item[557]` `6×6` Amiga system font, and `item[562]` 6-level `$0RGB` torchlight shading ramps — with automatic `CleanRoomProvider` fallback when archives are absent.
- **Pure ~6 Hz Simulation Engine (`src/engine/`)**: Headless reducer with zero DOM dependencies supporting step/turn cooldowns, wall `"OOF!"`, multi-tick doors, wall switches, floor pressure plates, illusionary walls, open/closed pits, stairs, blue-haze teleporters, and Champion Mirror Resurrect / Reincarnate / Cancel.
- **Purist Default + Toggleable QoL (`src/input/`, `src/render/`, `src/audio/`)**:
  - **1988 Purist Mode (default)**: Classic 6-button cyan Movement Arrow Pad (`item[13]`) and center-viewport pointer interaction.
  - **QoL Mode (`1988` / `QOL:ON` pill at top-right)**: Enables `W/A/S/D` + `Q/E` / Arrow movement, `M` parchment Automap overlay, and `Escape` modal dismissal.
  - **Paula Stereo Web Audio (`SND:LCK` / `SND:ON` / `SND:MUT` pill)**: Auto-unlocks on first gesture and pans genuine Amiga PCM audio by Manhattan distance and party facing (silent open-floor steps per 1988 Amiga rules, authentic `item[565]` `"OOF!"` on wall bumps).
  - **Interactive Paula SFX Soundboard (`SFX BOARD [B]` button or `B` key)**: Audition all 33 extracted `graphics.dat` 8-bit PCM sound items with oscilloscope waveforms, adjust Paula Hz & stereo pan, type persistent labels (`localStorage`), live-assign items to game cues, and copy/download JSON presets.

## Quickstart (`bobp make`)

```bash
bobp make help             # List all automation targets
bobp make setup            # Install npm deps, extract local Amiga .zip/.adf assets, index via
bobp make extract-assets   # Re-extract Dungeon-Master_Amiga_EN.zip & DM2 archives
bobp make test             # Run ESLint + TypeScript check + 31 Vitest tests
bobp make dev              # Launch Vite dev server on http://127.0.0.1:5173
bobp make build            # Build production bundle into dist/
```

## Documentation Index

- **[PRD.md](docs/PRD.md)** — Product Vision, Dual-Mode Asset Strategy, Mechanics, and Trilogy Roadmap
- **[USER_STORIES.md](docs/USER_STORIES.md)** — Sprint 1 User Stories & Acceptance Criteria
- **[ARCH.md](docs/ARCH.md)** — Hexagonal Architecture, `320×200` HUD Spec, and Data Flow
- **[DECISIONS.md](docs/DECISIONS.md)** — Product & Architectural Decision Records (`PDR-001`, `ADR-001..005`)
- **[task.md](task.md)** — Sprint Task Board (Single Source of Truth)
- **[agents/DOCUMENTATION_INDEX.md](agents/DOCUMENTATION_INDEX.md)** — BobProtocol Persona & Skill Reference
