# Lighting QA Retrospective

Independent literal RGB, combined-profile, alpha and source-mask tests supplied an oracle separate from implementation helpers. They caught the viewport adapter's missing exactly16source-color invariant before Phase2 relied on dense palettes; the narrow guard preserved generic helper flexibility.

Audit the actual color flow before adding transformations. Procedural fills, text and side projection already consume derived depth palettes; another filter would dim them twice. Distinct LEFT/RIGHT feature and item markers proved actual side-projector participation and exact once-lit colors, improving on a broad nonblack-pixel count that could pass from other geometry.

Keep stable UI artwork comparisons separate from intentional LIGHT status changes. Dedicated build/lighting-review/report.json carries the new26case/98check evidence; old29interaction output is unchanged and must not be relabeled as new evidence.

Final single stable aggregate250tests+ESLint/strictTypeScript and sequential build passed; original535sprites and clean-room sources were available for actual Chromium review with no errors. Preserve serial Make slots and bounded checks. No additional validation was run for retrospective documentation.

Oracle grooming and explicit Smith final approval/retro completed before this QA retrospective. Parent owns the complete seven-domain archive and local close. Trace tooling remains separately unavailable; no clean-audit claim.
