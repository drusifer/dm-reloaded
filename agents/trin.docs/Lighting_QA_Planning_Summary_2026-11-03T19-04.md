# Lighting Sprint Independent QA Preparation

Read current palette/blitter/viewport procedural paths through VIA, Oracle current state and Lessons008–010, and recent chat after asset exporter commit ed12bbd. No Make calls, product edits or test changes.

## Risks and acceptance checks
1. Current side-wall sprite projection writes directly through setPixel. Blitter-only filtering misses it; procedural walls, doors, glyph/text, pits and teleporter effects must receive the same world RGB transform exactly once.
2. Raw indexed transparency keys0/10 must be resolved before RGB transformation. Darkness/tint can collapse colors, so RGB-based key comparisons can discard opaque pixels or paint transparent backgrounds. Truecolor alpha must stay unchanged, including0/128/255.
3. Limit filtering to world rendering. HUD, inventory, held cursor, mirror modal and automap overlays remain fullbright; blanket final-frame/viewport filtering can dim UI accidentally.
4. Test genuine and no-bundle clean-room paths. Effective light0 remains true black regardless of tint/desaturation; lights1/3/5 and depths0..3 must show deterministic falloff. Near ceiling/floor and layered distant walls need consistent treatment without double attenuation.
5. Specify the formula, config validation and normalization/error behavior before implementation. Use independent mathematical golden vectors instead of deriving expected colors from the same implementation helper.
6. A bundle whose darkest five ramps are changed but brightest palette is unchanged should render identical world colors. This independently proves runtime no longer chooses historical ramp indices.
7. Truecolor support in this bounded sprint should mean the same pure transform over decoded RGB/RGBA, not an implicit campaign-pack/PNG-loader migration. Preserve source buffers and simulation state.
8. Live original/fallback light/depth contact sheet plus unchanged fullbright UI regions complements pure numeric tests. No legacy pixel-exact ramp matching required by ADR009.

Parent requested Smith review of combined stories and architecture after docs/SPRINT_LIGHTING.md planning handoff; separate explicit gate1/gate2 decisions must precede implementation. Trin state is saved for that switch.
