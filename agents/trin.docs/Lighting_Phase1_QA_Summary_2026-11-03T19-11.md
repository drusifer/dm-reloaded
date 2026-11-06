# Lighting Phase 1 Independent QA

## Verdict
PASS for Phase1 pure profile/RGB/palette/RGBA and brightest-source adapter scope after one narrow correction. Phase2 procedural integration and actual visual acceptance remain required.

## Independent checks
Added tests/render/lightingIndependent.test.ts with six bounded acceptance cases:
- Literal24-cell neutral RGB table at lights0–5/depths0–3 plus finite-range clamping, independent of the implementation's multiplier loop.
- Combined exponent2/tint[0.2,0.6,1]/strength0.5/desaturation0.25 at light2.5/depth2 gives RGB[13,13,10] for[120,80,40]. Indexed/RGBA outputs match this known vector; hiddenRGB is transformed and alpha0/128/255 stays exact. Input buffers unchanged.
- Source index0/index10 masks resolve before colors collapse to black; opaque black still paints. Scaling/flip/clipping preserve masked background pixels using a distinct sentinel color.
- Sparse RGB/tint/depth/palette arrays, nonfinite light and invalid depths rejected at documented boundaries. RGBA length must be divisible by4.
- Validated profile copies/freeze prevent later input-setting mutations from changing output.
- Viewport adapter requires exactly16 dense source colors, while generic palette helper intentionally supports arbitrary lengths.

Existing six implementation tests cover documented neutral/desaturation/tint vectors, monotonic24light/depth behavior, brightest-only historical ramp independence, no-bundle fallback, input immutability and profile validation.

## Finding and correction
Initial independent run19:10:01 passed5/6; source palettes of lengths0/15/17 were accepted by the adapter, invalidating the upcoming dense16 painter assumption. Parent confirmed the bounded defect. Neo added an explicit adapter-only length16 guard; generic helper contract unchanged. Reviewed final diff; no unrelated source edits.

Final BOTH lighting files passed12/12 at19:10:32; ESLint/strictTypeScript passed19:10:41. QA reused those unchanged final results instead of rerunning. No full aggregate/baseline or browser run in Phase1; Phase2 introduces the integrated/visual coverage. No malformed typed-context fuzzing outside the validated public-boundary contract.

## Next
Morpheus phase review before NeoPhase2. Verify all direct procedural/side paths use derived palette colors once, source masks remain raw, UI art stays fullbright, lower ramps do not affect actual frames, and original/fallback zero/low/full+depth scenes receive Smith approval. No new emissive or PNG-loader scope.
