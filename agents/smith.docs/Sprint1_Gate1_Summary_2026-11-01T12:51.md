Smith Gate 1 HCI review summary for Sprint 1 user stories.

TLDR:
    Goal: Validate Sprint 1 user stories in docs/USER_STORIES.md against Nielsen's 10 usability heuristics.
    Status: Approved (*user approve) after co-authoring 3 HCI refinements into Story 1.4.
    Action: Proceed to Morpheus (*lead arch sprint) and re-engage Smith at Gate 2 (*user feedback) and post-implementation (*user test).

# Sprint 1 Gate 1 Review — Smith (`*user review`)

## Heuristic Evaluation Summary
1. **Heuristic #5 (Error Prevention)** — Amended `AC 1.4.1` to require ambient Hall lighting / a starter lit Torch in the Hall of Champions so new players are never stranded in total blackness upon descending to Level 1.
2. **Heuristic #3 (User Control & Freedom)** — Amended `AC 1.4.1` so Champion Mirror inspection explicitly provides **Resurrect**, **Reincarnate**, and **Cancel** buttons, preventing accidental party lock-in.
3. **Heuristic #1 (Visibility of System Status)** — Amended `AC 1.4.2` to handle browser `AudioContext` autoplay suspension automatically on first user gesture and display a visible mute/audio status indicator.
4. **Heuristic #6 & #7 (Recognition & Efficiency)** — Specified exact `QWEASD` (`W/S` step, `A/D` strafe, `Q/E` 90° turn, `M` automap) bindings with a visible control legend when QoL mode is active, while keeping 1988 Purist Mode completely clean.

## Verdict
**APPROVED (`*user approve`)** — Ready for `@Morpheus *lead arch sprint`.
Note: Smith **must** re-engage at Gate 2 (`*user feedback docs/ARCH.md`) and during Phase implementation (`*user test`) against the live running build.
