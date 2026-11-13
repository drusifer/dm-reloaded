# CHAT_sprint-8 — Sprint Archive

## Summary

Sprint 8 was research-first: online research found the public skproject sources describing DM2's GDAT GRAPHICS.DAT (unlicensed, so facts only). An independent TypeScript reader was written and verified: container arithmetic closes to the byte (3,493,879), 10,045 directory records, text decodes (THORN DEMON, VORTEX; every DUNGEON.DAT creature id named), 3,011 distinct images decode with the encoding's own self-check (2,060 primary + 951 overlay, 0 failures), reviewed visually in grayscale. A guessed palette was rejected, so no colour is claimed. Import now recognizes the DM2 graphics file honestly with generated art kept; bobp make dm2-sheet writes review sheets. Trin corrected an early overcount (records vs entries). Serial 424/424, lint/types/build, Sprint 3-8 browser checks green; judge trace ran with process flags. Seven retros. No DM2 gameplay; no commit/push.

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
    Note right of Mouse: "Sprint7 CLOSED locally:<br/>board 7/7, archived to a<br/>gents/chat_archive/CHAT_<br/>sprint-7.md. Awaiting<br/>direction."
    Cypher->>Smith: "pm handoff"
    Note right of Cypher: "Sprint8 Gate1+2 package<br/>docs/SPRINT8.md.<br/>Research-first: public<br/>skproject sources (no<br/>license -> facts only,<br/>independent reader)<br/>document D…"
    Smith->>Morpheus: "user approve"
    Note right of Smith: "*user approve Gate1+2.<br/>Binding notes: never<br/>show DM2 art as colour<br/>or as part of the<br/>playable game, import<br/>message must say art is<br/>not used…"
    Morpheus->>Neo: "lead handoff"
    Note right of Morpheus: "Sprint plan approved: 4<br/>phases, follows G1-G4.<br/>@Neo *swe impl S8-P1.1"
    Smith->>All: "user approve"
    Note right of Smith: "*user approve Sprint8<br/>e2e: DM2 import says<br/>UNRECOGNIZED/NO PARTY,<br/>3011 IMAGES 77<br/>CREATURES, ART NOT USED<br/>YET with generated art<br/>shown, line…"
    Neo->>Cypher: "retro"
    Note right of Neo: "Neo retro: Independent<br/>reader with synthetic<br/>fixtures plus real-file<br/>facts was fast to trust,<br/>debt: U4 image form and<br/>sounds unsupported, t…"
    Trin->>Cypher: "retro"
    Note right of Trin: "Trin retro: Exact-<br/>arithmetic and exact-<br/>consumption checks were<br/>ideal oracles, I<br/>overcounted images by<br/>confusing records with<br/>entries until…"
    Morpheus->>Cypher: "retro"
    Note right of Morpheus: "Morpheus retro: ADR-019<br/>held: indexed pixels<br/>decouple decoder from<br/>the open palette<br/>question. Revisit:<br/>reader lives in data<br/>layer but DM2 i…"
    Oracle->>Cypher: "retro"
    Note right of Oracle: "Oracle retro: Docs<br/>groomed (SPRINT8,<br/>DM2_DATA extended,<br/>ADR-019, ARCH 16,<br/>CHANGELOG, README,<br/>board) incl. the licence<br/>caveat and my correct…"
    Mouse->>Cypher: "retro"
    Note right of Mouse: "Mouse retro: 4 phases/9<br/>tasks, research was<br/>again the long pole,<br/>ahead of any code, gates<br/>held. Backlog: keep<br/>research-first phase<br/>when for…"
    Smith->>Cypher: "retro"
    Note right of Smith: "Smith retro: Honest<br/>messages and review-only<br/>sheets met the notes,<br/>but users cannot view<br/>DM2 art in-app and<br/>grayscale hides how it<br/>looks. B…"
    Cypher->>Cypher: "retro"
    Note right of Cypher: "Cypher retro: Research-<br/>first framing produced<br/>real, verifiable output<br/>instead of another<br/>blocked sprint, I must<br/>keep recording the<br/>licence…"
    Cypher->>All: "pm launch"
    Note right of Cypher: "*pm launch sprint-8: DM2<br/>GDAT reader delivered<br/>locally (serial 424/424,<br/>browser gates 3-8, Smith<br/>approved). No DM2<br/>gameplay/colour,<br/>facts-o…"
```
