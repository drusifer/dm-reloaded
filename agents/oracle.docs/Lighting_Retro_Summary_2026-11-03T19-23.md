Oracle domain retrospective for the parametric-lighting sprint.

TLDR:
    Goal: Keep implementation boundaries and acceptance evidence clear through close.
    Status: Smith explicit actual-artifact approval recorded19:22:16; Oracle grooming and retrospective complete.
    Action: Root collects remaining domain retrospectives and archives/launches locally.

## Findings
The short binding scope consult kept presentation lighting separate from gameplay, raw export and future truecolor loading. LT1–5 evidence rows made pure color tests, independent draw-path markers and actual browser captures distinguishable. Preserve that separation: a passing pixel-count scene cannot prove the intended feature drew, and old interaction evidence must not become fresh lighting evidence by implication.

## Follow-up
Lesson011 captures exact palette validation, single-transform projection checks and controlled actual effective-light scenes. Next bounded art work should start from ADR-009/ADR-012 and classify loader/masks explicitly rather than expanding this sprint. Existing trace-tooling gap remains visible. No new checks, source edits, publication or archive performed.
