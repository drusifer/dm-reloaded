# Sprint 2 Gate 2 Architecture UX Review (`*user feedback`)

- **Persona**: Smith (`*user`)
- **Target**: `docs/ARCH.md` (Sprint 2 Architecture)
- **Verdict**: **APPROVED (`*user approve`)** after pinning 3 UX safeguards in Section 5

## UX Safeguards Verified
1. **Strict Viewport Click Precedence (Heuristic #5 Error Prevention)**: Facing `depth 1` interactive wall features (`KEYHOLE`, `VI_ALTAR`, `FOUNTAIN`, `ALCOVE`, `BUTTON`) take strict priority over Upper-Left/Upper-Right Corridor Throw zones when `handItem !== null`, preventing accidental throws when inserting keys or reviving bones.
2. **Utility Bar Spacing (`x=272..319`)**: Split the bottom `y=19..27` (`9px`) utility row cleanly into `ZZZ (273,19,22,9)` and `SFX (296,19,23,9)` preserving 1px vertical gutters with `QOL` and `MAP`.
3. **Dual Held-Item Visibility (Heuristic #1)**: Paired the `16×16` logical cursor-hand sprite at `(mx, my)` with a deterministic `HELD: <NAME> (<X.X> KG)` banner so trackpad/keyboard users always see held item state.
