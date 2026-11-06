# Binding Lighting Scope Consultation

Source decisions: ADR-009 applies fidelity to gameplay, permits one parametric renderer filter and keeps original ramps as tuning reference; ADR-011 keeps raw indexed export/original palette policy independent of runtime masks.

1. Change presentation only. Keep gameplay effective light inputs, 6Hz tick rules, torch/item charges, visibility/pitch-black behavior, collision and interaction unchanged. A lighting refactor must not adjust engine light to make screenshots easier.
2. Apply one pure RGB transform to indexed source colors and synthetic/future truecolor RGB samples. The same input color/light/depth/parameters must produce the same result regardless of art encoding. This does not require campaign-pack loading or a new truecolor asset format in this bounded sprint.
3. Use source/base colors for full-bright UI: HUD, inventory, status/pills, modal/overlay text, held-item cursor and inspection tools. World inscriptions/items/ornaments are world presentation and may shade with their depth; UI must not inherit world distance tint/dimming.
4. Preserve transparency/masking/alpha and clipping. Existing runtime index0/index10 masks remain index decisions before color transformation; do not substitute raw-export index0 policy for runtime masks. Procedural world RGB must share the transform instead of remaining an unlit exception.
5. Keep brightest source palette data and the six decoded original ramps available as source/reference as needed, but rendering must not select six pre-authored ramp copies as the new lighting mechanism. Exact1988 ramp matching is not the acceptance target. Parameter source/defaults must be explicit in the plan; no implicit pack-loader expansion.
6. Raw export remains independent and deterministic: no filtered/light-variant PNGs, palette/manifest churn or source data changes. Source sprite buffers/palettes should remain immutable under shading.
7. Keep classification, pack loading, combat, runtime/toolchain pinning, CI and deployment outside this bounded scope unless separately approved. Validate shared-transform parity, darkness/depth response, mask invariants, full-bright UI and actual original/fallback screenshots; reuse unchanged export/gameplay evidence unless integration changes create a concrete concern.

No global architecture/decision/source changes or Make/test execution performed for this consultation. Parent owns planning gates/board and Make serialization. Tank will review any concrete new lighting review automation only when its interface exists.
