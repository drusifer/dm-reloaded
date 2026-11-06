# Lighting Sprint Final Functional QA

## Verdict
PASS for accepted behavior LT1–LT5. No functional blocker found. Final architecture, Tank automation review, Smith actual PNG approval and close remain parent-owned gates.

| Criterion | Independent/current evidence |
|---|---|
| LT1 shared parametric light/depth | Literal24-cell neutral RGB table, full-near identity, zero black, finite clamping and lower historical ramp independence. Existing integration samples cover procedural walls/doors/sconce/teleporters across depths; exact16dense source adapter prevents literal-color fallback. No second transform is added to already derived palette colors. |
| LT2 indexed/RGBA equivalence and masks | Independent combined tint/desaturation/exponent RGB golden; hiddenRGB/alpha0/128/255 unchanged; raw index0/10 masks checked while output colors collapse to black, preserving opaque black, flip/clip/scaling. Sparse boundary errors tested. RGBA helper only; no loader claim. |
| LT3 world consistency and bright UI | Added LEFT/RIGHT actual side-projector marker regressions: plainwall→alcove and empty→loaded item produce distinct known single-transform colors at light2/depth2. Existing integration checks stable UI, inventory/cursor/automap across light while excluding only legitimate dynamic LIGHT readout. Original/fallback browser matrix confirms worldtorch participates when lit and disappears at zero, while inventory/cursor stays bright. |
| LT4 local tuning, determinism, immutability | Validated immutable lighting.json profile with documented formula; finite/range/sparse errors and live-alias rejection. Source palette/RGBA and simulation-state immutability plus repeat-render equality covered. No parser/exporter/gameplay changes. |
| LT5 actual visible evidence | Correct dedicated artifact build/lighting-review/report.json: passed,26cases/98measured checks, originalavailable535sprites and fallbackavailable, browserErrors[]. Cases cover zero/low/full light and depths1–3, inventory and cursor; pure tests cover depth0. Parent inspected representative PNGs; mandatory Smith final actual scene approval remains separate. |

## Distinct side-projection verification
New tests/render/lightingSideProjection.test.ts passed2/2 at19:17:45. Feature palette13 RGB[200,100,50] must add[64,32,16]; independent item-sheet marker14 RGB[90,180,240] must add[29,58,77] at light2/5×depth2multiplier0.8. Changed pixels must appear on the correct side and at least one marker must be added. This fails if the projector does not draw, uses unlit/double-lit colors or flips side. It is stronger than a scene-wide nonblack count that can pass from floor/ceiling alone.

## Final checks
- Neo affected14suites99tests and lint passed before the independent side case.
- After all lighting source and tests were stable, a single full aggregate passed250/250 across37files, including ESLint/strictTypeScript at19:18:17.
- Sequential production build passed19:18:59:121.34kB bundle,41.66kB gzip.
- Dedicated actual Chromium lighting run passed19:17:04 with26cases/98checks and errors[]. No source changes followed it; added QA tests do not alter renderer behavior.
- No separately repeated lint/full baseline after those passing results. Make slot released to parent after final build.

## Boundaries
build/visual-review/report.json is the OLD29-interaction artifact, intentionally unchanged. It is not claimed as fresh lighting gameplay evidence. Current lighting report uses build/lighting-review and explicitly records original availability; absence cannot silently count as original coverage. Trace audit remains unavailable(missingjinja2 masked by||true); no clean trace claim. No new emissive classification, runtime truecolor loading, dependencies or publication.
