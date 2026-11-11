# Sprint 3 Oracle Retrospective

## Outcome

Sprint 3 documentation is ready for local close after the remaining retrospectives and Cypher's local-launch record. The product contract, A1–A12 architecture, ADR-014 outcome, README, SDLC and Oracle memory agree on delivered scope, regression boundaries, final evidence and the absence of any commit, push, release or deployment claim.

## What Worked

- The team preserved the real chronology rather than rewriting it as a clean first pass: Phase 2 explosion correction, Phase 3 party Shield correction, two ordinary Phase 4 fix cycles, the explicitly authorized presentation-only third cycle, final inventory/projection stabilization, the parallel aggregate timeout, and the separately authorized serial recovery.
- Evidence types remained distinct. `38/38` criteria, `35/35` focused tests, `72/72` serialized diagnostic, `339/339` aggregate, static/build gates and actual-browser evidence were not collapsed into one ambiguous pass.
- The serial recovery retained the 5-second timeout, so documentation can identify scheduling/resource contention without implying that assertion deadlines were relaxed.
- The unavailable judge trace was never counted as a product pass. Original and clean-room browser provenance and the no-deployment boundary remained explicit.
- Decisions and reusable lessons were captured at the right levels: ADR-014 owns the durable boundary; Oracle lessons own identity, travel-relative projection, state-to-pixel evidence and aggregate-contention recovery.

## What Could Improve

- Final evidence totals now appear in multiple authoritative narratives. They agree today, but repeated literals invite future drift. A single sprint-close evidence index should own report links, timestamps, totals, source coverage and unavailable checks; README, architecture and contracts should summarize and link to it.
- Trace-tool history is semantically muddy: earlier records mention missing `jinja2`, while the final invocation failed because no Claude project directory existed. Both may be true at different times, but the tooling needs structured `passed` / `failed` / `unavailable` status plus the exact current prerequisite failure.
- The close chain was briefly ambiguous: Mouse's handoff said groom/report before retros, while the controlling instruction required retros and local launch before the report/reset. The final ordering is now explicit, but future sprint templates should encode one canonical close sequence.
- Authoritative Sprint 3 contract/architecture and several evidence summaries remain untracked in the working tree. This is not a delivery failure or permission to commit, but their ownership and eventual authorized integration must be explicit before repository publication.
- Browser evidence is strong but distributed across chat, persona summaries and generated build artifacts. Stable report paths and a compact artifact manifest would make later audits easier without committing generated evidence.

## Documentation Backlog for Cypher

1. Add a bounded sprint-close evidence-index story: one durable record linking Trin, Morpheus, Smith, Tank and Oracle summaries; exact gate totals; browser source matrix; artifact paths; chronology; unavailable checks; and release boundary.
2. Add a trace-observability story: make judge trace return an explicit machine-readable status and distinguish missing project discovery, missing Python dependencies and audit findings. A masked successful wrapper exit must never mean pass.
3. Add a close-order template story: encode `final QA → architecture → Smith journey → grooming → seven retros → Cypher local launch → Mouse close → Oracle chat report/reset` in one authority.
4. Add an evidence-deduplication maintenance task: keep detailed numbers in the evidence index and replace repeated totals elsewhere with short summaries and links when those docs are next revised.
5. Add an artifact-discoverability task: define stable ignored paths and a manifest for actual-browser reports/screenshots, including original/clean-room provenance and failure invalidation rules.
6. Before any authorized commit, review untracked Sprint 3 authoritative records and portable summaries for intended inclusion, links and portable filenames; do not infer commit/push authorization from local acceptance.

## Archive Readiness

CHAT contains the required request, exception authorization, blocker diagnoses, final evidence, approvals and early retrospective handoffs. It is not yet ready to reset because all seven retrospectives and Cypher's local-launch record must appear first. After those entries and Mouse's close checkpoint, Oracle may run the sprint chat-report workflow; no manual archive edit is needed.
