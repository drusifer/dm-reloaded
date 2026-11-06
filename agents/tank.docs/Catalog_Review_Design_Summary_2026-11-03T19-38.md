Tank mechanism design approval for catalog inspection UAT.

TLDR:
    Goal: Reuse existing automation with isolated honest catalog evidence.
    Status: Design approved conditionally; no implementation or execution yet.
    Action: Await Neo Phase1 public API and root implementation handoff/Make slot.

## Approved mechanism
Use existing bobp make visual-review ARGS=--catalog. Add only a dispatcher before existing lighting/legacy branches to a separate scripts/sprite-catalog-review.mjs helper; preserve those bodies and their evidence semantics. Existing pinned Playwright1.64.1 and strict loopback5197 are sufficient. No new dependency, target, environment variable, service or deployment.

Separate ignored build/catalog-review holds guarded direct-child screenshots/report. Initialize passed:false/status:running before source/server/browser work and preserve passed:false on failure; validate evidence directory and every destination against symlink/nonfile aliases. Capture actual browser/page errors and clean up owned browser/server on all paths. Do not reuse old lighting/interaction reports or claim their checks reran.

## Required actual evidence
- Before browser work, load original input using existing strict source loader, compare current producer manifestJson byte-for-byte with the existing exported manifest and verify its recorded source hash. Baseline provided by root: manifest SHA256 d4b9555ff40ed93be4dec34dc9c1af8b071cdbe489608acbce576c26a834d083. Read existing artifacts; never republish or repair them inside review. Missing/stale originals or mismatched bytes fail clearly with incomplete evidence, not a fallback-labelled original success.
- Actual G inspector UAT through keyboard/DOM: numeric/key search17; known/unknown filters, combined category/no-match/reset; stable selection/details/evidence;42atlas/cropped torch and85wall usage; opaque/raw0/verified usage labels and visible pixels; unknown raw-only policy. Exercise zoom, source-ramp reference, clipboard copy and Escape from search with focus restored. Editing filters must not trigger gameplay.
- Original decoded-map coverage must be exact535 for supplied source, while verified/unknown counts come from the actual catalog API (not hardcoded identities). CLEAN_ROOM empty data receives honest generated/empty-source treatment, never synthetic535success. Negative17/42provenance checks remain independent product QA fixtures.
- Report source availability, measured catalog/verified/unknown counts, named actual checks and screenshots. Full catalog UAT needs original source; empty fallback is a separately asserted supported state, not original substitute.
- Existing export-sprites-review later independently native-decodes all535actual PNGs and metadata after changed producer source; this helper does not replace it. Root serializes producer/byte comparison/browser/native review and bounded QA through shared build.out ownership.

## Limits and handoff
Design approval is not actual-run approval or SC1–5 completion. Public catalog API/selectors and verified counts await Neo; no global/source edits or Make/tests by Tank. Root owns board and implementation assignment. No source pin, CI/hooks or deploy changes.
