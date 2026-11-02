Sprint 1 user stories and testable acceptance criteria for the Dungeon Master engine foundation and playable starter slice.

TLDR:
    Goal: Establish the TypeScript/Canvas/WebAudio foundation, Makefile automation, deterministic dungeon grid simulation, 320x200 Amiga viewport/HUD, and playable Level 0/1 vertical slice.
    Status: Drafted by Cypher; awaiting Smith Gate 1 review (*user review).
    Action: Smith evaluates stories for classic Amiga UX fidelity and testability before Morpheus designs docs/ARCH.md.

# Sprint 1 User Stories: Engine Foundation & Amiga Vertical Slice

**Sprint Goal**: Stand up the repeatable build/test pipeline (`Makefile` + TypeScript + Vite + Vitest) and deliver a playable, pixel-accurate **320×200 Amiga Dungeon Master vertical slice** featuring deterministic grid navigation, pseudo-3D dungeon rendering with torchlight attenuation, interactive doors/buttons/pits/teleporters, Paula-style stereo SFX, Dual-Mode campaign data schema, and toggleable classic mouse vs. keyboard QoL navigation.

---

## Story 1.1: Repeatable Project Toolchain & Headless Engine Harness
**As a** developer and QA engineer on the team,
**I want** a zero-friction TypeScript + Vite + Vitest project wired into standard `Makefile` targets (`help`, `setup`, `dev`, `build`, `test`, `lint`, `tldr`),
**So that** all game simulation logic can be verified deterministically via `bobp make test` and built cleanly via `bobp make build`.

### Acceptance Criteria
- **AC 1.1.1**: Running `bobp make help` lists all available project targets (`setup`, `dev`, `build`, `test`, `lint`, `typecheck`, `tldr`).
- **AC 1.1.2**: Pure dungeon simulation state and tick advancement run headlessly in Vitest with deterministic seeds (zero DOM dependency in `src/engine/`).
- **AC 1.1.3**: `bobp make test` and `bobp make lint` pass with zero errors.

---

## Story 1.2: Authentic 320×200 Amiga Viewport & Classic HUD Layout
**As a** player who loved the 1988 Amiga *Dungeon Master*,
**I want** the game screen rendered on a crisp, integer-scaled 320×200 logical canvas using the iconic Amiga color palette and layout (top champion bar, 224×136 dungeon viewport on the left, movement arrows / spell & weapon panel on the right, message scroll bar at the bottom),
**So that** it immediately looks and feels like playing *Dungeon Master* on an Amiga monitor.

### Acceptance Criteria
- **AC 1.2.1**: Logical framebuffer is `320×200` upscaled to fit the browser window with crisp nearest-neighbor (`image-rendering: pixelated`) aspect-ratio preservation.
- **AC 1.2.2**: Top bar displays up to 4 champion slots (name, Health/Stamina/Mana vertical bars, hand slots); right panel renders the 6-button movement/turn pad (Turn Left, Forward, Turn Right, Strafe Left, Backward, Strafe Right); bottom bar displays real-time scrolling dungeon text messages.
- **AC 1.2.3**:Pseudo-3D dungeon viewport renders perspective walls, alternating floor/ceiling textures (creating the unmistakable visual sense of step motion), stairs, pits, doors, wall switches, champion mirrors, and floor alcoves up to 3 tiles deep with 6-level torchlight shading (from bright torchlight down to pitch-black darkness).

---

## Story 1.3: Real-Time Dungeon Grid Navigation & Interactive Mechanics
**As a** dungeon explorer,
**I want** to navigate a multi-level grid dungeon in real time (~6 Hz tick clock), open/close portcullis and wooden doors via wall buttons, trigger pressure plates, traverse stairs, fall down open pits to the level below, and step through blue-haze teleporters,
**So that** the core spatial puzzle and movement feel of *Dungeon Master* works authentically.

### Acceptance Criteria
- **AC 1.3.1**: Clicking the on-screen Amiga movement/turn arrows moves or rotates the party by 1 tile / 90° with authentic movement cooldowns; bumping into a solid wall or closed door halts movement, flashes a subtle impact feedback, logs `"OOF!"` (or plays the classic wall-bump thud), and respects fake/illusionary walls (walk-through walls).
- **AC 1.3.2**: Clicking wall buttons/levers on the immediately facing wall toggles target doors, pits, or teleporters via the trigger/actuator system; doors animate smoothly across multiple ticks (open -> 1/4 -> 1/2 -> 3/4 -> closed) and block passage when > 1/4 closed.
- **AC 1.3.3**: Stepping onto an open pit drops the party to the corresponding `(x, y)` coordinates on `level + 1` with fall feedback; stepping into an active teleporter relocates and optionally rotates the party cleanly; clicking or stepping into stairs transitions between dungeon levels.

---

## Story 1.4: Hall of Champions Preview, Stereo Audio & QoL Controls
**As a** modern browser player,
**I want** to inspect Champion Mirrors in a playable Hall of Champions starter level, hear directional Amiga-style sound effects (footsteps, switches, doors, wall bumps, teleporter hum), and optionally toggle `WASD`/`QWEASD` keyboard controls and an automap overlay without breaking 1988 Purist Mode,
**So that** Sprint 1 delivers a genuinely playable vertical slice out of the box while validating our Dual-Mode data schema.

### Acceptance Criteria
- **AC 1.4.1**: Built-in clean-room starter dungeon (`Level 0: Hall of Champions` + `Level 1: Entry Puzzles`) loads through the normalized Dual-Mode `DungeonData` schema (designed with an adapter boundary ready for `DUNGEON.DAT` binary import in later sprints), provides a lit starter Torch / ambient Hall lighting so players are never stranded blind on entry (HCI #5 Error Prevention), and includes at least 4 inspectable Champion Mirrors (e.g., *Iaido Ruyito Chiburi*, *Zed Duke of Banville*, *Chani Sayyadina Sihaya*, *Elija Lion of Yaitopya*) with stats preview and explicit **Resurrect**, **Reincarnate**, and **Cancel** actions (HCI #3 User Control & Freedom) up to a 4-champion party limit.
- **AC 1.4.2**: Synthesized Web Audio engine plays stereo-panned SFX (footsteps, switch click, door clank, wall bump, pit fall, teleporter buzz) attenuated by Manhattan distance and relative party facing, automatically unlocking browser `AudioContext` on first user click/key gesture and surfacing a visible mute/audio status indicator (HCI #1 Visibility of System Status).
- **AC 1.4.3**: An unobtrusive retro Options toggle switches between **1988 Purist Mode** (mouse-only navigation, no automap) and **QoL Mode** (`W/S` forward/back, `A/D` strafe left/right, `Q/E` turn 90° left/right, Arrow keys, and toggleable `M` parchment automap overlay with visible control legend — HCI #6 Recognition Rather Than Recall & #7 Flexibility).
