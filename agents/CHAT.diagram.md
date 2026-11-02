# CHAT.md — Conversation Flow

Auto-generated from `agents/CHAT.md` by `bobp chat-diagram`. Do not edit by hand — regenerate with `make chat_diagram` (or it regenerates automatically on every `make chat`).

```mermaid
%%{init: {"sequence": {"messageFontSize": 14, "noteFontSize": 18, "actorFontSize": 14}}}%%
sequenceDiagram
    autonumber
    participant Oracle
    participant Smith
    participant All
    participant Neo
    participant Cypher
    participant Trin
    participant Morpheus
    participant Mouse
    participant User
    Note over Oracle,User: 📅 2026-11-02
    Oracle->>Smith: "ora handoff"
    Note right of Oracle: "Sprint 1 docs groomed<br/>(README.md, lessons.md,<br/>memory.md) and Sprint 1<br/>chat report archived in<br/>agents/chat_archive/CHAT<br/>_sprint-1.md. Why: kn…"
    Smith->>All: "user init"
    Note right of Smith: "Smith online for final<br/>Sprint 1 sign-off (*user<br/>test sprint-1). Why:<br/>verifying end-to-end<br/>user journey across<br/>Stories 1.1-1.4 (Hall of<br/>Cham…"
    Smith->>All: "user approve"
    Note right of Smith: "*user approve on Sprint<br/>1! End-to-end journey<br/>across Stories 1.1-1.4<br/>(Hall of Champions,<br/>Torch lighting,<br/>actuators, 320x200 HUD,<br/>Purist/QoL…"
    Neo->>Cypher: "retro"
    Note right of Neo: "Sprint 1 Retro (SWE):<br/>Pure Uint8ClampedArray<br/>Framebuffer + headless<br/>6Hz engine made TDD fast<br/>(29 tests in <800ms).<br/>First-principles<br/>inspect…"
    Trin->>Cypher: "retro"
    Note right of Trin: "Sprint 1 Retro (QA):<br/>Real binary UAT against<br/>extracted Dungeon.dat &<br/>graphics.dat caught<br/>corridor bend & stat-<br/>decoding nuances early.<br/>Bound…"
    Morpheus->>Cypher: "retro"
    Note right of Morpheus: "Sprint 1 Retro (Lead):<br/>Hexagonal separation<br/>(zero DOM in<br/>src/engine/) and shared<br/>LAYOUT_RECTS eliminated<br/>coordinate drift between<br/>painters…"
    Oracle->>Cypher: "retro"
    Note right of Oracle: "Sprint 1 Retro<br/>(Knowledge): Recorded<br/>Lessons 001-002 (FTL RLE<br/>opcodes, item[13] vs<br/>item[14], item[557]<br/>runes, Champion Mirror<br/>db2 linkage)…"
    Mouse->>Cypher: "retro"
    Note right of Mouse: "Sprint 1 Retro (SM):<br/>3-phase topological<br/>split (8 tasks total in<br/>root task.md) kept each<br/>Bloop small and focused,<br/>with only 1 fast UX fix<br/>c…"
    Smith->>Cypher: "retro"
    Note right of Smith: "Sprint 1 Retro (UX):<br/>Live PNG screenshot<br/>inspection at Phase 3<br/>caught the item[14]<br/>starburst vs item[13]<br/>arrow pad swap and<br/>lowercase rune…"
    Cypher->>Cypher: "retro"
    Note right of Cypher: "Sprint 1 Retro (PM):<br/>Extracting the user's<br/>real 1988 Amiga<br/>Dungeon.dat +<br/>graphics.dat alongside<br/>CleanRoomProvider<br/>delivered authentic<br/>art,…"
    Cypher->>All: "pm init"
    Note right of Cypher: "Cypher online to<br/>synthesize Sprint 1<br/>retrospectives, groom<br/>Sprint 2-3 backlog<br/>carry-forwards in<br/>task.md, and launch<br/>Sprint 1."
    Cypher->>All: "pm launch"
    Note right of Cypher: "*pm launch sprint-1.<br/>Sprint complete. All<br/>Stories 1.1-1.4, 8/8<br/>tasks, genuine 1988<br/>Amiga Dungeon.dat +<br/>graphics.dat decoders,<br/>320x200 Viewp…"
    User->>All: "feedback"
    Note right of User: "feedback: somethings up<br/>with the perspective on<br/>the walls. Looks<br/>reversed maybe. also it<br/>makes a weird sound when<br/>moving i think it's<br/>suppo…"
    Neo->>All: "swe init"
    Note right of Neo: "Neo online for *fix loop<br/>on user feedback. Why:<br/>inspecting graphics.dat<br/>wall sprites 75..89 +<br/>item[558..562] blitter<br/>rects to fix reversed…"
    Neo->>All: "swe note"
    Note right of Neo: "User requested an<br/>interactive soundboard<br/>to audition and label<br/>all graphics.dat sound<br/>effects alongside the<br/>wall perspective &<br/>movement sou…"
    Neo->>All: "swe note"
    Note right of Neo: "User provided GitHub<br/>repo git@github.com:drus<br/>ifer/dm-reloaded.git for<br/>publishing after wall<br/>perspective fix +<br/>Soundboard land (strict<br/>.giti…"
    Neo->>Trin: "swe handoff"
    Note right of Neo: "Fixed reversed<br/>ceiling/floor (76/75),<br/>D0L/D0R (85/84), and<br/>3-face wall cubes<br/>(86/87/88/89) via exact<br/>item[558] blitter rects,<br/>silenced open…"
    Trin->>All: "qa init"
    Note right of Trin: "Trin online for *qa uat<br/>fix-perspective-<br/>soundboard. Why:<br/>auditing Neo's item[558]<br/>wall/floor/ceiling<br/>perspective fix, 5500Hz<br/>PCM / silent s…"
    Trin->>Morpheus: "qa handoff"
    Note right of Trin: "UAT PASSED on fix-<br/>perspective-soundboard:<br/>item[558]<br/>wall/ceiling/floor<br/>perspective verified at<br/>(1,6) North, item[565]<br/>OOF! preserved with s…"
    Morpheus->>Smith: "lead handoff"
    Note right of Morpheus: "Morpheus architecture<br/>review APPROVED:<br/>src/ui/soundboard.ts<br/>isolates DOM cleanly<br/>while src/engine &<br/>src/render stay pure,<br/>item[558] wall bl…"
    Smith->>All: "user init"
    Note right of Smith: "Smith online for *user<br/>test fix-perspective-<br/>soundboard. Why:<br/>capturing and visually<br/>inspecting live PNG<br/>frames at LVL:0 (1,6)<br/>DIR:NORTH and…"
    Smith->>Oracle: "user approve"
    Note right of Smith: "*user approve on fix-<br/>perspective-soundboard!<br/>Live PNG inspection at<br/>LVL:0 (1,6) DIR:NORTH<br/>confirms 100% pixel-<br/>exact 1988 Amiga mortar<br/>seams…"
    Oracle->>All: "ora done"
    Note right of Oracle: "Recorded Lesson 003<br/>(item[558] viewport<br/>blitter coordinates,<br/>ceiling 76 vs floor 75,<br/>3-face wall cubes<br/>86..88, SND2 5500Hz<br/>layout) in lesso…"
    Neo->>All: "swe init"
    Note right of Neo: "Neo online for *swe fix<br/>door-orientation:<br/>investigating sideways<br/>door/stair rendering at<br/>LVL:0 (7,9) DIR:WEST."
    Oracle->>All: "ora done"
    Note right of Oracle: "Fixed sideways doors<br/>across all 14<br/>Dungeon.dat levels<br/>(lowFlags & 0x08 passage<br/>bit -> 158/158 doors<br/>match walls) + wired<br/>authentic FTL 3D s…"
```
