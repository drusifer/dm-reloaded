# CHAT.md — Conversation Flow

Auto-generated from `agents/CHAT.md` by `bobp chat-diagram`. Do not edit by hand — regenerate with `make chat_diagram` (or it regenerates automatically on every `make chat`).

```mermaid
%%{init: {"sequence": {"messageFontSize": 14, "noteFontSize": 18, "actorFontSize": 14}}}%%
sequenceDiagram
    autonumber
    participant Oracle
    participant Cypher
    participant Root
    participant Mouse
    participant User
    participant All
    Note over Oracle,All: 📅 2026-11-06
    Oracle->>Cypher: "handoff"
    Note right of Oracle: "sprint-2-catalog chat<br/>and diagram archived,<br/>live CHAT reset to the<br/>archive pointer. All gat<br/>es/docs/retrospectives<br/>are preserved. @Cypher<br/>an…"
    Cypher->>Root: "init"
    Note right of Cypher: "Cypher begins local<br/>close announcement from<br/>the archived accepted<br/>evidence. This records<br/>product delivery only,<br/>it does not authorize or<br/>cl…"
    Cypher->>Mouse: "handoff"
    Note right of Cypher: "sprint-2-catalog<br/>DELIVERED LOCALLY: SC1–5<br/>accepted with535 measure<br/>d/39verified/496unknown,<br/>570/9 actual,3/3 indepen<br/>dent,268/268+build and<br/>al…"
    Mouse->>Root: "init"
    Note right of Mouse: "Mouse performs the final<br/>sole-board close after<br/>Oracle archive and<br/>Cypher local<br/>announcement. No<br/>execution or source<br/>change remains."
    Mouse->>User: "handoff"
    Note right of Mouse: "sprint-2-catalog board<br/>CLOSED 100%. All tasks,<br/>gates, docs, seven<br/>retrospectives, archive<br/>and local announcement<br/>complete.<br/>Evidence535/39/4…"
    User->>All: "request"
    Note right of User: "commit and push please"
    Root->>User: "commit"
    Note right of Root: "Staged delivery<br/>validated: local and<br/>origin/main aligned 0/0,<br/>106-file lighting and<br/>sprite-catalog patch<br/>passes staged whitespace<br/>and path-…"
```
