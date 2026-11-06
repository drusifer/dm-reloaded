# Catalog Torch UAT Consult Summary

## Finding

The first catalog browser UAT failure is a false harness assumption, not an application crop defect. The report recorded 256 colored pixels and zero palette-index-0 pixels for sprite 42, `item.icon.7`. Every colored preview pixel matched the independently decoded source coordinate and selected palette; the check failed solely because it required `holes > 0`.

## Evidence

- `agents/oracle.docs/lessons.md`, Lesson 005 fixes item icon 7 at sheet 42, crop `(112,0,16,16)`.
- Lesson 009 establishes icons 4–7 as torch stages, but does not require index-0 transparency in each stage.
- `build/catalog-review/report.json` records the failing result as `colored: 256`, `holes: 0`, with no browser errors.
- `renderSpritePreview` treats palette index 0 as transparent when present; a crop with no zero indices remains fully opaque by design.

## Required Correction

Keep the independent source-coordinate RGB comparison. When a source pixel is index 0, require the preview pixel to have zero alpha. Accept the crop when all 256 pixels are accounted for and at least one colored pixel exists; do not invent a requirement that this specific torch stage contain a transparent pixel.

This is one materially different harness correction under the anti-loop protocol. No application behavior, catalog metadata, or raw export policy should change.
