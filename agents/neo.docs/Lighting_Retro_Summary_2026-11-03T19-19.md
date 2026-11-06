# Neo Lighting Retrospective

One pure RGB transform, validated frozen profile and reusable light/depth context kept indexed/truecolor parity explicit. Derived depth palettes covered all existing procedural and projected world paths; auditing the actual call sites avoided a second filter and double dimming. Brightest-source UI palette and source-space masks remained separate.

Independent QA established an important boundary invariant: getViewportLightPalette requires exactly16 dense source colors, although the generic pure palette helper permits arbitrary lengths. Preserve that guard before removing color fallbacks. Real geometry matters in integrated fixtures: teleporter samples belong to innerfrustum coordinates, and the HUD LIGHT glyph legitimately changes content and warning color. Compare the surrounding UI pixels without suppressing the status behavior.

Implementation complete and final250tests/lint/types passed19:18:17; actual26browser scenes/98checks passed19:17:04. BuildPASS19:18:59; final product gates remain parent-owned. No source edits or checks during this retrospective. Future pack/mask classification and runtime truecolor loading remain separate scope.
