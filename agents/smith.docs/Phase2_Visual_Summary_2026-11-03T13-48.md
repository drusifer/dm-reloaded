# Phase 2 Live Visual Gate

COMMAND: bobp make visual-review (Chromium, Vite, real TypeScript renderers).
EXPECTED: readable inventory/chest/scroll, visible world items, held-item status and sleep feedback with original and fallback art.
ACTUAL: inspected build/visual-review/amiga-inventory.png, amiga-chest.png, amiga-scroll.png, fallback-inventory.png, fallback-scroll.png, amiga-floor.png, amiga-alcove.png, amiga-sleep.png and runtime.png. Original panel17/25 PNGs confirm measured slot alignment. Initial scroll text was white and outside parchment: rejected under heuristics #1 visibility and #8 readable minimal presentation. First fix passed: dark wrapped text inside parchment in both art modes. Equipment and chest slots visible; name/weight held banner visible; sleep clearly marked; procedural special wall art recognizable. No browser exceptions.
VERDICT: APPROVE Phase2 visual rendering gate. Runtime inventory interactions and moving cursor remain Phase3 scope and are not claimed tested here. Long scrolls currently truncate with ellipsis at six rows; revisit pagination if required by real content in playable slice.

Evidence is local generated PNGs under build/visual-review; repeat with the Makefile target. Browser runner uses temporary npm Playwright installation without production dependency changes.
