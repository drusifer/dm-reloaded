# CHAT_sprint-7 — Sprint Archive

## Summary

Sprint 7 reframed from DM2 gameplay to DM2 data enablement because the only DM2 data was an undecoded Amiga LZX archive. Three from-memory decoder attempts failed CRC checks and stopped at the anti-loop rule; on the user's prompt to research online, the public libxmp LZX description produced an extractor that matches all 35 stored CRCs. Delivered: verified extractor and make target, DM2 findings doc (DM1-style Dungeon.dat container, 44 maps, size arithmetic closes, undecoded AGA graphics, creature ids to 85, no champions), content-derived campaign ids, unrecognized import message. Screenshot review caught a stale DM1 start message; fixed. Serial 412/412, lint/types/build, Sprint 3-7 browser checks green; judge trace ran with process flags. Seven retros. No DM2 gameplay; no commit/push.

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
    Note right of Mouse: "Sprint6 CLOSED locally:<br/>board 7/7, archived to a<br/>gents/chat_archive/CHAT_<br/>sprint-6.md. Awaiting<br/>direction."
    Cypher->>Smith: "pm handoff"
    Note right of Cypher: "Sprint7 Gate1+2 package<br/>docs/SPRINT7.md +<br/>docs/DM2_DATA.md.<br/>Research fixed the<br/>blocker: libxmp's public<br/>LZX description let me<br/>build a CRC-…"
    Smith->>Morpheus: "user approve"
    Note right of Smith: "*user approve Gate1+2.<br/>Binding notes: never<br/>present imported DM2<br/>maps as playable/DM2,<br/>message must say no<br/>party and unrecognized,<br/>DM1 save…"
    Morpheus->>Neo: "lead handoff"
    Note right of Morpheus: "Sprint plan approved: 4<br/>phases, small, follows<br/>L1-L4. @Neo *swe impl<br/>S7-P1.1"
    Trin->>Smith: "qa handoff"
    Note right of Trin: "P3/P4.1 evidence: serial<br/>412/412, lint, types,<br/>build, browser gates 3-7<br/>green, extractor passes<br/>all 35 archive CRCs,<br/>tamper/damage/path tes…"
    Smith->>All: "user approve"
    Note right of Smith: "*user approve Sprint7<br/>e2e: DM2 Dungeon.dat<br/>import says<br/>UNRECOGNIZED, NO PARTY,<br/>keeps its own campaign<br/>id, refuses the DM1<br/>save, no leaked D…"
    Neo->>Cypher: "retro"
    Note right of Neo: "Neo retro: Verification-<br/>first extractor gave<br/>certainty the decoder<br/>was right, debt: Python<br/>tool outside the TS<br/>toolchain, duplicate<br/>CRC/FNV…"
    Trin->>Cypher: "retro"
    Note right of Trin: "Trin retro: Three failed<br/>from-memory attempts<br/>cost time, the anti-loop<br/>stop plus the user's<br/>research nudge fixed it.<br/>Archive CRCs are an id…"
    Morpheus->>Cypher: "retro"
    Note right of Morpheus: "Morpheus retro: ADR-018<br/>held, content-derived<br/>ids are cheap and safe.<br/>Revisit: 14-map == DM1<br/>heuristic is thin.<br/>Backlog: stronger<br/>campaign…"
    Oracle->>Cypher: "retro"
    Note right of Oracle: "Oracle retro: Docs<br/>groomed (SPRINT7,<br/>DM2_DATA, ADR-018, ARCH<br/>15, CHANGELOG, README,<br/>board). Gap: SDLC still<br/>stops at sprint 3.<br/>Backlog: SDL…"
    Mouse->>Cypher: "retro"
    Note right of Mouse: "Mouse retro: 4 phases/7<br/>tasks, no anti-loop<br/>trigger in the sprint<br/>itself (it fired earlier<br/>at planning). Research<br/>was the long pole,<br/>scope…"
    Smith->>Cypher: "retro"
    Note right of Smith: "Smith retro: Honest<br/>labels held, but an<br/>imported map you cannot<br/>browse or play has<br/>little user value yet.<br/>Backlog: level browser<br/>for import…"
    Cypher->>Cypher: "retro"
    Note right of Cypher: "Cypher retro: Roadmap<br/>items were unbuildable<br/>without data, the data-<br/>first reframe was right<br/>and I should have<br/>researched online before<br/>decl…"
    Cypher->>All: "pm launch"
    Note right of Cypher: "*pm launch sprint-7: DM2<br/>data enablement<br/>delivered locally (35/35<br/>CRCs, serial 412/412,<br/>browser checks 3-7,<br/>Smith approved). No DM2<br/>gamepla…"
```
