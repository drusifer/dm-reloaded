# Catalog and Mask QA Planning

VIA review covered current SpriteSource, portrait extraction, raw contact-sheet rendering/UI, source-index blitter and raw exporter; Oracle consult confirms evidence/usage boundaries.

Raw sprite coverage is not complete semantic identity. Clean-room numeric indices cannot prove DM1 identities. SpriteSource item.icon.N returns a derived16x16crop with indexN, which can collide with unrelated raw indices; retain rawsheet42+floor(N/32), crop bounds and usage. Portrait derived2600+N similarly points back to raw26 plus crop. Generated wall.*art is not an original-source mapping.

Masks attach to usage: opaque panel/portrait vs index0itemicon, opaque floor/ceiling vs index10wall/door; bashedmask301 remains special caller-owned logic. Existing raw contact-sheet index0checkerboard is inspection policy, not runtime evidence. Preserve source masks before lighting and all live output semantics.

Exporter schema1, existing4aliases/categories/filenames and PNG/manifestbytes stay unchanged for the same source. New catalog is a separate overlay; no additive manifest fields. Catalog search/selection needs labelled keyboard behavior, oneEscapeclose even from search and focus restore. Smith will review combined plan before implementation. No tests/Make/source mutations during preparation.
