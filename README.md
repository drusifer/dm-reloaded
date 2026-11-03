Project overview, quickstart commands, controls, and documentation index for the Amiga Dungeon Master trilogy web implementation.

TLDR:
    Goal: Provide a complete browser-based TypeScript/Canvas/WebAudio recreation of the FTL Games Amiga Dungeon Master trilogy.
    Status: Sprint 2 inventory, world items, throwing and survival implemented; QA, architecture and live browser gates passed; retrospective recorded; delivered locally.
    Action: Run bobp make setup to install dependencies and unpack local Amiga archives, then bobp make dev to play or bobp make test to verify.

# Dungeon Master — Amiga Trilogy (Web Edition)

A browser recreation of FTL Games' Commodore Amiga first-person real-time dungeon crawler series (*Dungeon Master*, *Chaos Strikes Back*, and *Dungeon Master II: The Legend of Skullkeep*), built with **TypeScript 5**, **HTML5 Canvas (`320×200` integer-scaled Amiga framebuffer)**, and **Paula Spatial Web Audio**.

## Foundation Highlights
- **Authentic Amiga Binary Decoders (`src/data/`)**:
  - Unpacks local `Dungeon-Master_Amiga_EN.zip` OFS `.adf` disk images into gitignored `public/assets/extracted/` (plus joins `Dungeon-Master-II-Skullkeep_Amiga_EN.zip` into `DM2_archive.LZX`).
  - Decompresses `0x8104` prefix-bitstream `/DM/Dungeon.dat` (`25,006`B $\rightarrow$ `33,444`B) with all **14 original levels** and **24 Hall of Champions heroes**.
  - Decodes all **575 `/DM/graphics.dat` items**: **535/535** FTL 4bpp byte-aligned RLE sprites, **33** signed 8-bit Paula PCM sound effects, `item[557]` `6×6` Amiga system font, and `item[562]` 6-level `$0RGB` torchlight shading ramps — with automatic `CleanRoomProvider` fallback when archives are absent.
- **Pure ~6 Hz Simulation Engine (`src/engine/`)**: Headless reducer with zero DOM dependencies supporting step/turn cooldowns, wall `"OOF!"`, multi-tick doors, wall switches, floor pressure plates, illusionary walls, open/closed pits, stairs, blue-haze teleporters, and Champion Mirror Resurrect / Reincarnate / Cancel.
- **Purist Default + Toggleable QoL (`src/input/`, `src/render/`, `src/audio/`)**:
  - **1988 Purist Mode (default)**: Classic 6-button cyan Movement Arrow Pad (`item[13]`) and center-viewport pointer interaction.
  - **QoL Mode (`1988` / `QOL:ON` pill at top-right)**: Enables `W/A/S/D` + `Q/E` / Arrow movement, `M` parchment Automap overlay, and `Escape` modal dismissal.
  - **Paula Stereo Web Audio (`SFX` mute pill)**: Auto-unlocks on first gesture and pans genuine Amiga PCM audio by Manhattan distance and party facing (silent open-floor steps per 1988 Amiga rules, authentic `item[565]` `"OOF!"` on wall bumps).
  - **Interactive Paula SFX Soundboard (`SFX BOARD [B]` button or `B` key)**: Audition all 33 extracted `graphics.dat` 8-bit PCM sound items with oscilloscope waveforms, adjust Paula Hz & stereo pan, type persistent labels (`localStorage`), live-assign items to game cues, and copy/download JSON presets.

## Inventory, Items and Survival

- Paperdoll inventory has equipment slots, 17 backpack slots, chest contents, scroll inspection, numeric HP/ST/MP, food/water and load indicators.
- Items persist across inventory, cursor hand, floor quadrants, alcoves and flying projectiles. Fountains, matching keys, torches, food, sleep, champion bones and Vi Altars interact with the pure 6 Hz simulation.
- New pickup, throw, drink, lock and death cues default to synthesized sounds. The soundboard can assign original samples, synthesis or explicit silence.
- The glyph contact sheet (`G`) shows decoded sprites for inspection and later classification.

## Controls

| Action | Control |
|---|---|
| Move/turn | Six-button arrow pad; QoL adds WASD, Q/E and arrow keys |
| Open/switch/close inventory | Right-click champion/canvas or left-click champion name header; QoL adds 1–4 |
| Close inventory/modal | Escape or inventory X |
| Move an item | Click a hand, equipment, backpack or chest slot to pick up, place or swap |
| Inspect chest/scroll or eat/drink | Hold item, open inventory and click Eye or Mouth |
| Floor pickup/drop | Bottom-left/right viewport piles on current tile |
| Throw | Hold item, close inventory, click upper-left/right viewport; facing wall features take precedence |
| Sleep/wake | ZZZ pill or inventory ZZZ; QoL adds Z; any click/key wakes |
| Automap | MAP pill; QoL adds M |
| Mute / soundboard / sprites | SFX pill / B / G |

Validation on 2026-11-03: **177 aggregate tests + 2 additional independent QA tests**, ESLint, strict TypeScript and production build passed; **27 live Chromium interaction checks** passed with no browser exceptions. QA, architecture and Smith end-to-end approval are recorded in the [final Sprint 2 acceptance archive](agents/chat_archive/CHAT_sprint-2-acceptance.md).

## Current Limits

Special wall ornaments and skulls use recognizable procedural art until original sprite classification is verified; world items use perspective-scaled inventory icons. Scroll parchment wraps and truncates long text with an ellipsis; inspection retains the transcript in game messages. Combat, spells, monsters, persistent saves and campaign-pack loading remain later work. The separate BobProtocol trace audit currently lacks its Python `jinja2` dependency; this does not represent a passing audit.

## Quickstart (`bobp make`)

```bash
bobp make help             # List all automation targets
bobp make setup            # Install npm deps, extract local Amiga .zip/.adf assets, index via
bobp make extract-assets   # Re-extract Dungeon-Master_Amiga_EN.zip & DM2 archives
bobp make test             # Run ESLint + strict TypeScript + Vitest regression suites
bobp make dev              # Launch Vite dev server on http://127.0.0.1:5173
bobp make build            # Build production bundle into dist/
bobp make visual-review    # Capture live Chromium rendering scenes
bobp make visual-review ARGS=--interactions  # Also exercise actual browser input
```

## Export original sprites

With the original local `public/assets/extracted/dm1/graphics.dat` available:

```sh
bobp make export-sprites ARGS=--help
bobp make export-sprites
bobp make export-sprites-review
```

The exporter writes one indexed PNG per decoded source sprite under `build/sprites/<category>/<index>_<width>x<height>.png` and a deterministic `manifest.json`. The supplied DM1 archive contains 535 decoded sprites. Atlases remain single images; sounds, fonts and metadata are not exported as sprites. Verified semantic names are included where known; other entries remain unclassified.

Set `SPRITE_INPUT` and `SPRITE_OUTPUT` consistently for both commands to use another source or a dedicated directory inside ignored `build/`. Existing unrelated files are preserved; edited or unowned collisions cause a clear error. The source archive is never modified, and missing or corrupt input does not substitute fallback artwork.

`export-sprites-review` reads the actual exported files and compares every decoded RGBA pixel with the original data through Chromium. Install its browser once with `bobp make visual-review-setup` if needed. The review report and representative images are separate, under `build/sprite-export-review/`.

These are raw indexed exports: index 0 is transparent and other palette entries are opaque. Current runtime sprites sometimes use other masks, so these PNGs are not universally ready for runtime replacement. Lighting filters and campaign-pack loading remain later work. Original assets, exported PNGs and review evidence stay local and gitignored.

## Documentation Index

- **[SPRINT_ASSET_EXPORT.md](docs/SPRINT_ASSET_EXPORT.md)** — Exporter scope and acceptance evidence
- **[SDLC.md](docs/SDLC.md)** — Tank-owned toolchain, quality gates, change management and release workflow
- **[PRD.md](docs/PRD.md)** — Product Vision, Dual-Mode Asset Strategy, Mechanics, and Trilogy Roadmap
- **[USER_STORIES.md](docs/USER_STORIES.md)** — Sprint 2 Stories and archived Sprint 1 Acceptance Criteria
- **[ARCH.md](docs/ARCH.md)** — Hexagonal Architecture, `320×200` HUD Spec, and Data Flow
- **[DECISIONS.md](docs/DECISIONS.md)** — Product & Architectural Decision Records (`PDR-001`, `ADR-001..009`)
- **[task.md](task.md)** — Sprint Task Board (Single Source of Truth)
- **[agents/DOCUMENTATION_INDEX.md](agents/DOCUMENTATION_INDEX.md)** — BobProtocol Persona & Skill Reference
