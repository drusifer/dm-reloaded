# Catalog Torch UAT Correction Summary

## Outcome

The first catalog UAT failure was corrected in the browser harness only. The item-icon pixel check no longer assumes that torch icon 7 contains a palette-index-0 pixel.

## Correction

- Every nonzero source pixel must still match the selected source palette RGB and remain opaque.
- Every actual index-0 source pixel, if present, must render as transparent RGBA zero.
- All 256 pixels in the 16×16 crop must be accounted for, with at least one colored pixel.

This preserves independent source-coordinate validation and strengthens the transparency check while accepting the observed fully opaque icon 7. No application source, catalog metadata, export artifact, Makefile, commit, push, or deployment changed. No Make target was run during the correction.

## Next

Root owns the Make slot and may perform the single materially different catalog UAT retry. A further failure must stop for user guidance under the anti-loop guard.
