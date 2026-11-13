# CHAT_sprint-9 — Sprint Archive

## Summary

Sprint 9 replaced placeholder monsters with original DM1 art on the original-data source. Index-labelled review sheets showed creature sprites at atlas 446-532 in monster-type order with up to four views; the real Dungeon.dat agreed with the type order (screamers on levels 1-4, dragon on level 13). A confidence-gated map draws 25 of 27 types (front view, depth scale, depth lighting, border-derived transparency); Materializer and Water Elemental stay placeholders. Evidence tests pin indices, contiguity, border dominance and depth order. Browser checks confirm real Screamer art and label logic for both sources. The Sprint 3 gate flaked once on live mana regen and was corrected to assert mana is never spent. Serial 435/435, lint/types/build green; judge trace ran with process flags. Seven retros. No commit/push.

---
[<small>2026-11-11 03:33:48</small>] [**Mouse**]->[**all**] *close*:
 Sprint8 CLOSED locally: board 9/9, archived to agents/chat_archive/CHAT_sprint-8.md. Awaiting direction.

---
[<small>2026-11-12 10:23:42</small>] [**make**]->[**all**] *build*:
 Build PASSED | make dm1-sheet | /var/home/drusifer/Projects/dungeon-master/build/build.out
npx vite-node scripts/dm1-sheet.ts 446 575
DM1 sheets: 89 sprites (446..575) in 4 sheets at /var/home/drusifer/Projects/dungeon-master/build/dm1-sheets

---
[<small>2026-11-12 10:25:03</small>] [**Cypher**]->[**Smith**] *pm handoff*:
 Sprint9 Gate1+2 package docs/SPRINT9.md: replace placeholder monsters with original DM1 art (Amiga source only). Evidence: labelled sheets show creature art at 446-532 in type order (4 views each); real Dungeon.dat depths agree with type ids (dragon L13, screamers L1-4). Types 19/20 unclear -> stay placeholder; confidence field gates rendering. @Smith *user review SPRINT9.md

---
[<small>2026-11-12 10:25:03</small>] [**Smith**]->[**Morpheus**] *user approve*:
 *user approve Gate1+2. Binding notes: clean-room and unverified monsters must keep the labelled placeholder; label only when a placeholder is drawn; real art must not exceed the viewport or draw through walls. @Morpheus *lead review sprint plan

---
[<small>2026-11-12 10:25:03</small>] [**Morpheus**]->[**Neo**] *lead handoff*:
 Sprint plan approved: 3 phases, follows A1-A4. @Neo *swe impl S9-P1.1

---
[<small>2026-11-12 10:29:25</small>] [**make**]->[**all**] *build*:
 Build PASSED | make judge-trace | /var/home/drusifer/Projects/dungeon-master/build/build.out
bobp trace-annotate --date 2026-11-12 || true
Written: agents/trin.docs/judge_tool_trace.html
245 tool calls · 29 flags · 1 sessions

---
[<small>2026-11-12 10:29:42</small>] [**Smith**]->[**all**] *user approve*:
 *user approve Sprint9 e2e: fresh Amiga run shows original Screamer art lit by depth, pips/injury flash/messages intact, no placeholder label; clean-room unchanged. Notes: front view only (monsters never turn or animate), art overlaps when two share a row, medium-confidence groups need independent eyes. @all *sprint retro

---
[<small>2026-11-12 10:29:42</small>] [**Neo**]->[**Cypher**] *retro*:
 Neo retro: Data-driven map with a confidence field made the renderer branch trivial; debt: scaling table is hand-tuned and views other than front are unused. Backlog: facing/attack views, exact sizes.

---
[<small>2026-11-12 10:29:42</small>] [**Trin**]->[**Cypher**] *retro*:
 Trin retro: Border-dominance and depth-order tests are real evidence, not vibes. The Sprint 3 gate flaked once on live mana regen; five clean reruns showed it was a race, and tightening the check to its intent was right. Own flags: piped bobp make, bare npx vitest. Backlog: pause the loop for snapshots in all gates.

---
[<small>2026-11-12 10:29:42</small>] [**Morpheus**]->[**Cypher**] *retro*:
 Morpheus retro: ADR-020 held: confidence gating prevents silent wrong art. Revisit: the map lives in data layer but the painter owns scaling policy; unify with an asset-source abstraction before DM2 art. Backlog: SpriteSource for monsters.

---
[<small>2026-11-12 10:29:42</small>] [**Oracle**]->[**Cypher**] *retro*:
 Oracle retro: Docs groomed (SPRINT9, ADR-020, ARCH 17, CHANGELOG, README, board). Gap: SDLC section still stops at sprint 3. Backlog: SDLC refresh.

---
[<small>2026-11-12 10:29:42</small>] [**Mouse**]->[**Cypher**] *retro*:
 Mouse retro: 3 phases/7 tasks, smallest sprint yet and the most visible; the research (review sheets) was again the long pole. Backlog: keep a visual-review step in sprint plans for art work.

---
[<small>2026-11-12 10:29:42</small>] [**Smith**]->[**Cypher**] *retro*:
 Smith retro: Seeing the real Screamer was the first time the game felt like DM1. Concerns: no turning/animation, overlapping group art, and two groups still placeholder. Backlog: attack animation, facing views.

---
[<small>2026-11-12 10:29:42</small>] [**Cypher**]->[**Cypher**] *retro*:
 Cypher retro: Evidence-gated scope (25/27 drawn, 2 honest placeholders) beat an all-or-nothing promise; stories stayed testable. Backlog: remaining two types, views, sizes.

---
[<small>2026-11-12 10:29:42</small>] [**Cypher**]->[**all**] *pm launch*:
 *pm launch sprint-9: original monster art delivered locally (serial 435/435, browser gates 3-8, Smith approved). 25/27 types on the Amiga source; placeholders kept elsewhere. No commit/push. Sprint complete.

