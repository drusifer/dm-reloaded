# Side Alcove Acceptance Correction

Final sprint-story audit reopened AC2.2.2 after the earlier sprint chat archive because lateral wall features/items were never painted. Modified only src/render/viewportPainter.ts.

- Added side-plane sprite projection using existing FRUSTUMS, converging vertical edges and mirrored screen-x sampling for the right wall.
- Visible inward wall faces are facing+1 for left wall and facing+3 for right wall; all other faces remain hidden.
- Semantic Alcove/Vi Altar/Fountain/Keyhole art and shelf contents render at depths0..3, using normal depth lighting.
- Side features draw inside each far-to-near wall pass before center walls so nearer opaque walls occlude farther shelves.

Validation: independent34 side visibility/backface cases passed14:00:32; combined side+independent facing/occlusion/sleep regression cases targeted41/41 passed14:01:00. Parent owns live PNG review and final aggregate after other audit corrections; Neo state owner phase2 consolidates.
