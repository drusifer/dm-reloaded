# Sprint 2 Gate 1 UX Review (`*user review`)

- **Persona**: Smith (`*user`)
- **Target**: `docs/USER_STORIES.md` (Stories 2.1–2.3)
- **Verdict**: **APPROVED (`*user approve`)** with 4 HCI safeguards co-authored into Story 2.1

## HCI Heuristic Audit
1. **Heuristic #5 (Error Prevention) & #7 (Flexibility — Laptop Trackpads)**: Suppress OS `contextmenu` on canvas right-click and ensure left-clicking a champion's portrait/name header also toggles/switches their inventory sheet so single-button/trackpad users are never blocked.
2. **Heuristic #3 (User Control & Freedom — Cross-View `handItem`)**: Explicitly require `handItem` to persist across opening/closing/switching champion inventory panels and moving through the 3D corridor (essential for picking up floor gear and placing it into backpacks or Vi Altars).
3. **Heuristic #9 (Error Recognition & Recovery)**: Invalid equipment drops (e.g., boots on Head, Chest inside Chest) must retain the item in `handItem` and emit `"CANNOT EQUIP THERE"` in the message strip rather than failing silently.
4. **Iterative Live Visual Gate**: Mandated live PNG frame inspection (`@Smith *user test`) on Paperdoll (`item[17]`), Item Icon Sheets (`items 42..48`), and 3D floor/alcove items per Sprint 1 retro.
