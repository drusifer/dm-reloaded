# Cold-Start Resume Brief (written 2026-11-12, after Sprint 9)

## Where things stand
- Sprints 3-9 are delivered and closed LOCALLY. Last commits: `f2aaa71` Sprint 3, `a1a2efe` Sprint 4, `88b9c96` traces. **Sprints 5-9 (about 79 files) are uncommitted**; commit/push only when the user asks (include `agents/tools/` and `agents/trin.docs/judge_tool_trace.html`; never `*.zip`, `*.dat`, `public/assets/extracted/`).
- Sprint 10 (tech debt) closed too; serial 434/434. Board: root `task.md` (Sprint 9 board + Completed Milestones + Backlog After Sprint N sections). Each sprint has `docs/SPRINTn.md` (contract, architecture, outcome/deviations), ADRs in `docs/DECISIONS.md` (ADR-014..020), `docs/ARCH.md` sections 11-17, `docs/CHANGELOG.md`, `docs/DM2_DATA.md`.
- Chat archives: `agents/chat_archive/CHAT_sprint-3..9.md`; `agents/CHAT.md` is reset.

## How work is done here
- Protocol: `/sprint N go` runs Cypher -> Smith gate -> Morpheus -> Smith gate -> Mouse -> Morpheus review -> phases (Neo/Trin/Morpheus) -> Oracle groom -> Smith e2e -> retros -> Cypher launch -> `bobp chat-report --moniker sprint-N`. Persona states are `agents/<persona>.docs/state.md` (all current).
- Always `bobp make <target>` (never pipe its output, never bare `npx vitest`; the judge trace flags both). Key targets: `lint`, `test-serial` (use this for final gates, 5 s test timeout unchanged), `build`, `sprint3..8-visual-review` (Playwright via npm exec), `extract-dm2`, `dm2-sheet`, `dm1-sheet ARGS="FROM TO"`, `judge-trace`.
- Final gate for a sprint: lint, test-serial, build, all sprint browser gates, then inspect screenshots (they caught real bugs in Sprints 4-9). Latest: serial 435/435.

## Capabilities delivered (do not re-derive)
Deterministic 6 Hz engine; progression/combat/magic (S3); monsters with AI, groups, doors, generators engine (S4); saves, import of own Dungeon.dat/graphics.dat, Lord Chaos victory (S5); roster carry-over via Hall mirrors (S6); CRC-verified Amiga LZX extractor + DM2 findings + content-derived campaign ids (S7); DM2 GDAT reader (names, 3,011 indexed images; no colour) (S8); original DM1 monster art, 25/27 types, confidence-gated (S9).

## Hard-won rules
1. Research online before calling a data problem blocked; verify with the file's own checksums.
2. No fabricated original content: Chaos Strikes Back and DM2 gameplay are NOT built (no data/rules); DM2 palette unidentified; skproject repo is unlicensed (facts only).
3. Screenshot review beats unit tests for UI regressions; browser gates must not assume wall-clock stability (Sprint 3 mana-regen flake fixed).
4. Anti-loop: stop after two failed attempts at the same approach and escalate.

## Candidate next sprints
Monster side/back/attack views + facing; Firestaff ending; Amiga generator actuators; multi-slot saves; off-level monster simulation; DM2 palette/overlay research; identify types 19/20 sprites.
