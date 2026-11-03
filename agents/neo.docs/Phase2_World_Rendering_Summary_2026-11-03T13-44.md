# Phase 2 World and HUD Rendering

Implemented in viewportPainter.ts and hudPainter.ts with semantic SpriteSource access for all new sprites. World floor quadrants rotate relative to facing and shrink across depths 0–3; near walls occlude far objects. Alcoves/Vi altars render placed items; fountains/keyholes receive visible semantic sprites; flying item lanes render above floor height. HUD adds equipped hand icons, dead champion skull cards, split ZZZ/SFX pills, held item name/weight/icon, and sleep overlay.

Validation: bobp make typecheck passed. bobp make test-q ARGS=tests/render/worldItemsRender.test.ts: 4 tests passed. One initial sleep test incorrectly expected black on a dark dither cell; corrected to assert both palette colors remain dark. No full suite run by this subtask; parent runs aggregate validation after inventory integration.

Limitations: wall decoration semantic sprites use source fallbacks until authentic indices are classified. Held icon uses fixed right deck position pending Phase 3 logical pointer tracking. Full architecture/QA and Smith live PNG gates remain pending. Parent owns consolidated Neo state.
