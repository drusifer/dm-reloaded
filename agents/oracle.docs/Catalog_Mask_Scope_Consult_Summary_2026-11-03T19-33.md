Oracle binding scope consultation for the bounded catalog and runtime-mask sprint.

TLDR:
    Goal: Separate complete raw coverage from proven semantics and usage-specific masks.
    Status: Current adapters/contact-sheet/export and ADR009/011/012 reviewed; planning policy ready.
    Action: Morpheus/Cypher use these boundaries before Smith planning gates; Tank reviews any new mechanism.

## Evidence reviewed
VIA located SpriteSource/createSpriteSource, PANELS, framebuffer.blitSprite and contact-sheet structures/layout. Current semantic source maps inventory panels17/25/23/27 and crops item.icon.0–223 from sheets42–48; procedural fallbacks remain for unclassified keys. Contact-sheet cells record raw index and dimensions; sorted complete layout is identification support, not semantic proof. ADR011 fixes original raw export palette/index0 policy; ADR012 retains source-space runtime masks before RGB lookup.

## Binding planning policy
1. A catalog may cover all535decoded raw sprites while explicitly marking semantic identity unknown. Report raw coverage, verified identities and unknowns separately; do not rename a complete index inventory as full semantic classification or erase that backlog requirement.
2. Evidence attaches to each claimed mapping: inspected original art, verified source table/crop or audited current runtime call site. Dimensions/index ranges/contact-sheet proximity alone do not prove identity. Keep guesses separate from active verified bindings; reject duplicate/conflicting keys and unsupported claims. Fallback art is never original identification evidence.
3. Mask policy belongs to a named usage/crop, not globally to a raw sprite. An atlas can be opaque in a UI/contact-sheet context while a cropped item icon uses source index0 transparency. Wall usage retains source index10; portrait/UI usage remains opaque where currently drawn opaque. Other keyed/cutout masks, including smashed-door behavior, retain audited caller-specific rules; do not infer them from RGB black or replace them with blanket index0.
4. Preserve source index decisions before palette/lighting. Opaque black remains drawable; zero-light color collapse cannot become transparency. UI stays fullbright; world lighting remains ADR012 exactly once. Introducing metadata must not silently migrate every painter or alter geometry/crop/flip/alpha/gameplay.
5. Raw export remains deterministic and unchanged: same one raw PNG per decoded sprite, original16colors and index0alpha policy, stable names/manifest/hashes. A usage catalog is a separate overlay, not a reason to rewrite raw PNGs, inject classifications into the existing manifest, or claim those PNGs are drop-in masked runtime art.
6. Bound this sprint to explicit catalog/schema, verified limited bindings and mask-policy seams plus meaningful evidence. No runtime PNG loader, campaign packs, exhaustive monster identity guessing, new art, combat, dependency/CI/deploy expansion. Existing full classification backlog stays visible until proven complete. Any CLI/profile/Make interface needs Tank review before execution.

## Handoff and limits
Read-only consultation only; no global docs/source edits or Make/tests. Lighting remains delivered locally and uncommitted. Root owns plan/task board and serialization. Summary and Oracle state saved with portable filenames.
