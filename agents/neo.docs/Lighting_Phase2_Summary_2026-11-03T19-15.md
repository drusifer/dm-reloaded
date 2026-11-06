# Lighting Phase2 Painter Integration

Audit confirmed all visible viewport colors already consume depth-derived palettes, including side-projection direct setPixel, teleporter haze, bashed doors, sconce flames, inscriptions and fallback geometry. Removed42 unreachable literalRGB fallbacks and documented dense16/once-only invariant. No extra context/filter/framebuffer changes; no double transform. Input masks remain source indices0/10 before RGB.

New8 integration tests cover stone/door/teleporter/sconce/side-projected alcove at depths1–3, wholeviewport half/full color ratio plus independent destination/depth RGB, synthetic index10 transparency and opaque black, original/fallback black viewport, unchanged HUD/cursor/inventory/automap outside intentional dynamic light-status text, state/sprite immutability. Original archive present. New-test first red reflected teleporter fixture sampling ceiling and dynamic HUD light text; corrected with actual innerfrustum geometry and narrow glyph exclusion, no product behavior weakened. Existing heldCursor tests verify complete torch flame and hotspot.

New8 pass19:14:56. Affected render+integration14suites99tests pass19:15:14. ESLint/strictTS pass19:15:24. No fullaggregate run yet. Tank owns browser script; real scene gate still pending. Make slot released at Trin handoff.
