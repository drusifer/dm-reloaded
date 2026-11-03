# Held Torch and Cursor Fix

Centered the complete held sprite on the logical pointer instead of anchoring its top-left at the arrow tip. Removed edge clamping that shifted the hotspot; framebuffer clipping handles screen edges. Native cursor hides while carrying an item over the canvas and restores on leave/drop/sleep/gameover/destroy.

Original icon-sheet capture proved torch icons were reversed:4unlit,5small flame,6medium,7full flame. Shared charge-aware itemIconIndex now selects correct art for equipped/inventory/world/side/cursor items, including existing states with stale iconIndex. Starting gear and torch burnout store correct icon indices. Generated fallback torches now have a joined wooden handle/flame instead of generic patterns.

Verification:183full tests+lint/strict TypeScript passed;29live browser checks/23scenes/errors[] passed. Inspected actual original-art torch pickup and icon-stage PNGs in build/visual-review. New cursor centering/edge clipping/pickup/flame tests; updated old reversed-stage assertions. No commit/deploy. Filenames use portableHH-MM timestamps.
