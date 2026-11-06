# Lighting Sprint Smith Planning Gates

## Gate 1 — Product stories
APPROVED for docs/SPRINT_LIGHTING.md LT1–5. Less light and greater depth have predictable neutral-profile behavior; zero light is truly black. HUD/inventory/cursor/controls retain legibility. Story evidence is concrete:24light/depth combinations, independent colors/masks/alpha, lower-ramp independence, immutable data and actual original/fallback browser scenes. The truecolor promise is explicitly a pure RGBA helper, with no runtime PNG or pack-loader claim. No story blocker found.

HCI grounds: system status and real-world consistency for predictable darkness; recognition/legibility for full-bright controls and carried cursor; error prevention and recovery through validated local profile errors; honest feature boundaries avoid misleading contributors.

## Gate 2 — Architecture
APPROVED. The one pure RGB formula has explicit defaults, order, rounding and golden examples. Brightest-source palette adapter and RGBA adapter call the same function; all direct/procedural colors are explicitly audited and transformed once at their assigned depth. A screen-wide postprocess is excluded because it loses depth and can dim UI twice. Side-wall direct setPixel, masks0/10, opaque black, sconce flame policy and no-bundle fallback are explicitly covered. Existing frame order and gameplay light generation stay intact. Oracle scope consult is complete; no unresolved policy.

Implementation review notes, not new gates: UI assertions must compare stable artwork/colors or mask changing LIGHT status text, since legitimate readout content changes with game light. Integrated direct-RGB expectations must use known base colors and the documented formula, not reuse transformed palette output as their oracle. Changing lower five ramps while keeping brightest unchanged is a useful independent proof that ramp selection is gone. Preserve existing occlusion, flips/crops/scaling and source masks before color conversion.

## Next steps
Mouse records the actual phase/task board, then Morpheus reviews it before implementation. Trin is ready for independent phase QA after source handoff and an assigned serial Make slot. Smith returns for mandatory actual original/fallback lighting scene inspection in Phase2. These are planning approvals; no claim that implementation has run or passed. No tests or Make calls performed.
