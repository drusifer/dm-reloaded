# Sprint 4 — Monster Ecology, AI & Traps (Product Contract + Architecture)

Tier-1 sprint; Cypher stories, Morpheus architecture and Mouse plan are kept in one document. Smith gates are recorded in `agents/CHAT.md`/the sprint chat archive.

## Goal
Make the dungeon hostile: all 27 Dungeon Master type slots exist as data, original Amiga monster groups are placed from `Dungeon.dat`, groups of 1–4 hunt the party deterministically, and the party can fight, kill, and be killed by them with the Sprint 3 combat, projectile, and magic rules. Doors can crush; generators spawn. Out of scope: saves, Sprint 5 polish, Lord Chaos endgame scripting, monster-specific art from original sprite data (placeholder silhouettes are used and labelled).

## Product principles
- Preserve the pure deterministic 6 Hz reducer and fixed RNG. Same state plus commands produces identical monster paths, hits, and deaths.
- No hidden cheats: monsters obey walls, closed doors, pits (non-flying), and subcell occupancy.
- Honest provenance: stats are a clean-room approximation (`CLEAN_ROOM_STATS`), identity/placement comes from the dungeon file. Record layout inference is documented and tested against the real file.
- Every refusal, hit, miss, kill, and party injury produces visible feedback; invalid actions grant no XP.

## Stories and acceptance criteria

### S4-1 — Monster catalog
1. Catalog has 27 entries (type ids 0–26) with name, hit points, attack power, defense, move interval, attack interval, sight range, max group size, and traits (`NON_MATERIAL`, `FLYING`, `RANGED`, `THIEF`, `TOUGH_TO_HIT` etc.). Lookup of an unknown id fails safely.
2. Names/ids match the DM1 order; stats are labelled approximate.

### S4-2 — Placement from the dungeon file
1. The Amiga parser reads creature records (16-byte, db category 4: type at byte 4, per-creature health words at bytes 6–13, count bits 5–6 of byte 15) from every tile chain and produces monster groups on their tile/level; garbage types (>26) are dropped, never thrown.
2. Real-file gate: ≥ 150 groups parse, every type id < 27, every position on a walkable tile, and parse is deterministic.
3. The clean-room campaign supplies a small bounded review pack (several monster types incl. a group of 3 and a non-material one) near the start.

### S4-3 — Group formation and AI
1. A group occupies 1–4 subcells of one tile; no two monsters share a subcell; a group never leaves its tile without every member fitting.
2. Monsters are dormant until the party is within their sight range on the same level (or they are hurt); then they hunt: shortest path (BFS bounded) over passable tiles, falling back to following the party's scent trail when no direct path exists inside sight.
3. Movement obeys move interval (absolute ticks), walls, closed doors, pits (flyers cross), and tile occupancy (max 4 per tile, never onto the party tile).
4. Adjacent monsters face the party and attack on their attack interval. Ranged monsters fire the existing projectile engine type at line range.
5. Identical state yields identical monster paths.

### S4-4 — Fighting monsters
1. Existing champion melee, thrown/ranged projectiles and spell projectiles damage monsters through the same hit path; kill credit and XP go to the owner; defeated monsters leave the world and may drop a defined item.
2. `NON_MATERIAL` monsters ignore physical hits and are hurt by `Des Ew`/fire-spell effects.
3. Monster attacks reduce a front-row champion's health (formation lane based) through armor; the champion dies at 0 via the Sprint 2 death path; party wipe sets game over.
4. A hit, miss, kill, party injury message is logged and a sound cue is emitted.

### S4-5 — Doors and generators
1. A door that closes onto a monster crushes it (damage, then death if lethal), once per closing.
2. Generators (data-defined spawner tiles) spawn a group at a deterministic interval only when the tile is free, party not adjacent, and a global cap (24 live monsters/level) is respected.

### S4-6 — Seeing and reading the fight
1. Monsters render in the 320×200 viewport at correct depth/lane/facing with an HP indicator after damage and never through walls; Purist mode needs no keyboard.
2. Automap in QoL mode marks monster groups only when visible tile data permits (no wall-hack of unseen monsters beyond sight).
3. Real-browser evidence for both sources: monster visible, approaches, attacks, takes a hit and dies, zero uncaught errors.

## Architecture (Morpheus)
- **M1 Reuse the target model.** A monster is a `CombatTargetState` extended with optional `monster` runtime data (`typeId`, `group` id, `subcell` 0–3, `facing`, `nextMoveTick`, `nextAttackTick`, `awake`). All existing projectile/impact/damage/XP code keeps working unchanged. Passive Sprint 3 review targets simply have no `monster` field.
- **M2 Pure modules.** `src/data/monsterCatalog.ts` (data), `src/engine/monsters.ts` (spawn, perception, pathing, steps, attacks, crushing, generators). Hooked into `stepSingleTick` after projectiles and before survival. RNG only via `nextRandom`, with a fixed draw budget per attack.
- **M3 Passability authority.** One `monsterCanEnter(state, level, x, y, flying)` function; same function is used by AI and generators.
- **M4 Lane mapping.** `subcell` 0/3 → LEFT? Defined: subcell % 2 === 0 → LEFT, else RIGHT; subcell 0,1 are the far row relative to the tile entry facing, 2,3 the near row. Existing `lane` field is derived from it.
- **M5 Bounded cost.** BFS radius ≤ sight (≤ 8). Monsters beyond sight and not hurt skip all work.
- **M6 Parser.** Creature records extend the existing chain walk; positions bits of byte 5 are retained but only used as subcell hints.
- **M7 Generators** are explicit data (`monsterGenerators`) produced from the Amiga actuator type that spawns creatures when evidence exists, else clean-room pack only. Unknown generator types are ignored.
- **M8 Rendering.** Silhouette painter per type colour, size by depth; shares the layout/projectile projection used by Sprint 3 target markers; no draw for unseen tiles.
- **M9 Evidence.** Determinism tests, a real-file parser gate, headless fights, then an actual-browser run.

## Plan (phases, Mouse) — see root `task.md`
1. Catalog + parser + state/types.
2. AI core (perception, pathing, formation, movement, attack).
3. Combat integration, death/drops, crushing, generators.
4. Presentation (viewport, HUD feedback, sound) + clean-room review pack.
5. Acceptance, browser gate, docs, close.

## Delivered outcome and honest deviations (2026-11-11)
Delivered locally: 27-entry catalog (approximate clean-room stats), Amiga creature-record parser (182 raw records → groups, real-file gate), pure `stepMonsters` (bounded BFS distance field, subcell formation, melee/ranged strikes, kill credit, drops, non-material rule, door crushing, generator engine), party movement blocked by live monsters, damage-on-sleep wake-up, viewport silhouettes with HP pips and an on-screen "PLACEHOLDER MONSTER ART" label, red HUD injury flash, automap shows only currently visible monsters, three new sound cues, and `make sprint4-visual-review`.

Deviations from the contract above (accepted by Morpheus, disclosed to Smith):
1. **S4-3.4 ranged**: ranged monsters make a direct line-of-sight strike at 70% attack, not a dodgeable projectile.
2. **S4-2.3 review pack**: provided as `createSprint4ReviewScenario` (a lit corridor arena), not baked into the clean-room campaign, so existing tests and Sprint 3 flows keep their exact behaviour.
3. **S4-5.2 generators**: the generator *engine* (interval, cap 24/level, 4/tile, party-adjacency block) is tested; no Amiga generator actuator is parsed and the clean-room campaign ships none, so no shipped level spawns yet.
4. **Facing and subcell hints**: only the count bits (byte 15 bits 5–6) are evidenced; facing and per-creature cell bits are inferred/ignored. Groups always start dormant at their tile on subcells in record order.
5. **Scope of activity**: only monsters on the party's current level act; other levels are frozen until visited.
6. **Stats**: all numbers are labelled approximations; no original combat balance claim is made.
