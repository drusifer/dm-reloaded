# CHAT_sprint-9 — Sprint Archive

## Summary

Sprint 9 replaced placeholder monsters with original DM1 art on the original-data source. Index-labelled review sheets showed creature sprites at atlas 446-532 in monster-type order with up to four views; the real Dungeon.dat agreed with the type order (screamers on levels 1-4, dragon on level 13). A confidence-gated map draws 25 of 27 types (front view, depth scale, depth lighting, border-derived transparency); Materializer and Water Elemental stay placeholders. Evidence tests pin indices, contiguity, border dominance and depth order. Browser checks confirm real Screamer art and label logic for both sources. The Sprint 3 gate flaked once on live mana regen and was corrected to assert mana is never spent. Serial 435/435, lint/types/build green; judge trace ran with process flags. Seven retros. No commit/push.

```mermaid
%%{init: {"sequence": {"messageFontSize": 14, "noteFontSize": 18, "actorFontSize": 14}}}%%
sequenceDiagram
    autonumber
    participant Mouse
    participant All
    participant Cypher
    participant Smith
    participant Morpheus
    participant Neo
    participant Trin
    participant Oracle
    Note over Mouse,Oracle: 📅 2026-11-11
    Mouse->>All: "close"
    Note right of Mouse: "Sprint8 CLOSED locally:<br/>board 9/9, archived to a<br/>gents/chat_archive/CHAT_<br/>sprint-8.md. Awaiting<br/>direction."
    Note over Mouse,Oracle: 📅 2026-11-12
    Cypher->>Smith: "pm handoff"
    Note right of Cypher: "Sprint9 Gate1+2 package<br/>docs/SPRINT9.md: replace<br/>placeholder monsters<br/>with original DM1 art<br/>(Amiga source only).<br/>Evidence: labelled<br/>sheets…"
    Smith->>Morpheus: "user approve"
    Note right of Smith: "*user approve Gate1+2.<br/>Binding notes: clean-<br/>room and unverified<br/>monsters must keep the<br/>labelled placeholder,<br/>label only when a<br/>placeholder…"
    Morpheus->>Neo: "lead handoff"
    Note right of Morpheus: "Sprint plan approved: 3<br/>phases, follows A1-A4.<br/>@Neo *swe impl S9-P1.1"
    Smith->>All: "user approve"
    Note right of Smith: "*user approve Sprint9<br/>e2e: fresh Amiga run<br/>shows original Screamer<br/>art lit by depth,<br/>pips/injury<br/>flash/messages intact,<br/>no placeholder labe…"
    Neo->>Cypher: "retro"
    Note right of Neo: "Neo retro: Data-driven<br/>map with a confidence<br/>field made the renderer<br/>branch trivial, debt:<br/>scaling table is hand-<br/>tuned and views other<br/>than…"
    Trin->>Cypher: "retro"
    Note right of Trin: "Trin retro: Border-<br/>dominance and depth-<br/>order tests are real<br/>evidence, not vibes. The<br/>Sprint 3 gate flaked<br/>once on live mana regen,<br/>five cle…"
    Morpheus->>Cypher: "retro"
    Note right of Morpheus: "Morpheus retro: ADR-020<br/>held: confidence gating<br/>prevents silent wrong<br/>art. Revisit: the map<br/>lives in data layer but<br/>the painter owns scalin…"
    Oracle->>Cypher: "retro"
    Note right of Oracle: "Oracle retro: Docs<br/>groomed (SPRINT9,<br/>ADR-020, ARCH 17,<br/>CHANGELOG, README,<br/>board). Gap: SDLC<br/>section still stops at<br/>sprint 3. Backlog: SDLC…"
    Mouse->>Cypher: "retro"
    Note right of Mouse: "Mouse retro: 3 phases/7<br/>tasks, smallest sprint<br/>yet and the most<br/>visible, the research<br/>(review sheets) was<br/>again the long pole.<br/>Backlog: kee…"
    Smith->>Cypher: "retro"
    Note right of Smith: "Smith retro: Seeing the<br/>real Screamer was the<br/>first time the game felt<br/>like DM1. Concerns: no<br/>turning/animation,<br/>overlapping group art,<br/>and…"
    Cypher->>Cypher: "retro"
    Note right of Cypher: "Cypher retro: Evidence-<br/>gated scope (25/27<br/>drawn, 2 honest<br/>placeholders) beat an<br/>all-or-nothing promise,<br/>stories stayed testable.<br/>Backlog: r…"
    Cypher->>All: "pm launch"
    Note right of Cypher: "*pm launch sprint-9:<br/>original monster art<br/>delivered locally<br/>(serial 435/435, browser<br/>gates 3-8, Smith<br/>approved). 25/27 types<br/>on the Amiga s…"
```
