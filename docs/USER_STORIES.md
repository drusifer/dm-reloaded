User stories and testable acceptance criteria for Dungeon Master: delivered Sprint 2 gameplay and the bounded asset-export and parametric-lighting follow-ups.

TLDR:
    Goal: Deliver authentic 1988 Amiga paperdoll inventory (item[17] + items 42..48 icons), DB5..DB10 world items on floor sub-tiles & alcoves, cursor-hand drag/throw physics, survival vitals (Food/Water/Stamina/Sleep/Torches), and Vi Altar bones revival.
    Status: Sprint 2 gameplay and asset export delivered; parametric lighting implemented with QA/architecture/mechanism approval. Final artifact/close status lives in task.md.
    Action: See docs/SPRINT_LIGHTING.md for LT-1–LT-5 and docs/SPRINT_ASSET_EXPORT.md for AE-1–AE-8 actual evidence; keep task.md as the sole task board. Prior gameplay evidence remains in agents/chat_archive/CHAT_sprint-2-acceptance.md.

## Parametric Lighting Follow-Up — `sprint-2-lighting`

[Accepted stories LT-1–LT-5 and actual evidence](SPRINT_LIGHTING.md) implement ADR-012: one validated local RGB transform for indexed, pure RGBA and procedural dungeon colors. Source masks/alpha, fullbright UI and carried cursor, immutable assets and gameplay light/torch rules remain intact. Raw export stays independent; no runtime truecolor loader or emissive classification ships.

Final evidence:250tests/37files plus lint/types and build; actual original/fallback Chromium26scenes/98checks with no browser errors. QA, architecture and Tank mechanism approval are recorded; Smith final actual-artifact approval/local close remain in shared chat and root task.md. Combat remains Sprint3.

## Asset Export Follow-Up — `sprint-2-assets`

This delivered bounded follow-up provides inspectable original sprites and a repeatable local export/review workflow before later lighting/campaign-pack work. [Combined product/architecture scope](SPRINT_ASSET_EXPORT.md) contains Story A (individual PNGs/manifest for artwork maintenance), Story B (actionable, safe, repeatable contributor automation), and accepted criteria AE-1–AE-8.

Implementation exports one indexed PNG per raw sprite with original palette data, index0 transparency, deterministic portable manifest metadata and sparse verified labels. Real CLI inputs without full source palette562 fail rather than substitute fallback colors. Independent native PNG review and safe ignored output cover the tool/artifact UX boundary; unchanged game-input scenarios do not need to be replayed for this offline tool. Combat/progression retains roadmap **Sprint 3** and is not included in this follow-up.

Final post-guard evidence is31affected tests, lint/types and native535sprite/1,690,768pixel verification. Earlier226aggregate/build evidence is separate. Required final approvals/local close remain in shared chat and root `task.md`; no remote publication or runtime pack migration is implied.

---

# Sprint 2 User Stories: Champions, Physical Inventory & Survival

**Sprint Goal**: Bring *Dungeon Master*'s physical object world and party survival mechanics to life using genuine 1988 Amiga `Dungeon.dat` (`DB5..DB10` item records, keyholes, fountains, alcoves, Vi Altars) and `graphics.dat` (`item[17]` paperdoll panel, `items 42..48` item icon sheets, 3D floor/alcove object sprites, cursor-hand icon) with full `CleanRoomProvider` fallback, deterministic 6 Hz throw/encumbrance/survival simulation, and mandatory live PNG UX verification.

---

## Story 2.1: Authentic Paperdoll Inventory, Chests, Scrolls & Encumbrance
**As a** *Dungeon Master* player managing a 4-hero party,
**I want** to open any living champion's inventory sheet (`item[17]`) to equip armor/weapons onto body slots, store gear in the 17-slot backpack, pouch, quiver, or nested chests, read open scrolls, and monitor carry weight (`kg`) and encumbrance,
**So that** outfitting champions and managing party gear feels tactile, strategic, and faithful to the 1988 Amiga classic.

### Acceptance Criteria
- **AC 2.1.1**: Right-clicking a living champion's top-bar portrait/status box with browser `contextmenu` suppressed (`preventDefault()`), left-clicking the champion's portrait/name header (trackpad-friendly affordance), or pressing `1–4` in QoL Mode (`ESC` / close-box exit — HCI #3 User Control & Freedom & #7 Flexibility) opens, switches, or closes that champion's Inventory Sheet inside the `224×136` viewport area using `graphics.dat` `item[17]` (with `CleanRoomProvider` fallback), while **preserving any held `handItem` seamlessly across viewport and inventory transitions**. Displays Str/Dex/Wis/Vit/AntiMagic/AntiFire stats, Health/Stamina/Mana numeric `cur / max`, Food & Water gauges, and all authentic slots: Head, Neck, Torso, Legs, Feet, Action Left Hand, Action Right Hand, Pouch (`2`), Quiver (`4`), and Backpack (`17`).
- **AC 2.1.2**: All item icons render from decoded Amiga `graphics.dat` icon sheets (`items 42..48`, with deterministic `CleanRoomProvider` icons when `.dat` files are absent) and are verified via live PNG frame capture (`@Smith *user test`). Equipping validates slot compatibility (e.g., helms on Head, mail/tunics on Torso, leg armor on Legs, footwear on Feet, necklaces/amulets on Neck, weapons/arrows/rocks in Quiver, Chests disallowed inside Chests — HCI #5 Error Prevention), keeping rejected items safely in `handItem` with a clear status message (e.g., `"CANNOT EQUIP THERE"` — HCI #9 Error Recovery), and updates champion Armor Rating, Stat bonuses, and top-bar hand icons immediately.
- **AC 2.1.3**: Placing or inspecting a **Chest** in the inspection/hand slot (or right-panel container view) exposes its 8 internal sub-slots so items can be packed/unpacked cleanly; inspecting a **Scroll** displays its decoded multi-line runic/English scroll text from `Dungeon.dat` `DB2`; total carried weight (`LOAD X.X / MAX Y.Y KG`, including chest contents) updates live, highlights in yellow/red whenencumbered/overloaded (HCI #1 Visibility of System Status), and applies authentic movement cooldown & stamina penalties.

---

## Story 2.2: `DB5..DB10` World Items, Alcoves, Keyholes & 3D Throw Physics
**As a** dungeon explorer solving physical spatial puzzles,
**I want** to see weapons, armor, food, potions, keys, chests, and scrolls lying on specific floor sub-tile quadrants or resting inside wall alcoves, pick them up onto my mouse cursor hand, insert keys/coins into wall locks, and throw items down 3D corridors to trigger distant pressure plates or fly through open grates,
**So that** objects behave as real physical entities in the 3D dungeon rather than abstract menu entries.

### Acceptance Criteria
- **AC 2.2.1**: `DungeonDatParser` decodes all `DB5` (Weapons), `DB6` (Clothes/Armor), `DB7` (Scrolls), `DB8` (Potions/Flasks), `DB9` (Chests + linked child item lists), and `DB10` (Misc, Food, Waterskins, Keys, Coins, Gems, Torches, Bones) across all 14 Amiga levels, preserving exact 2-bit tile quadrant/face (`0=NW/N, 1=NE/E, 2=SE/S, 3=SW/W`), linked item chains, charges, and cursed/poisoned flags (mirrored in `CleanRoomProvider` starter level).
- **AC 2.2.2**: `ViewportPainter` renders floor item stacks on their true perspective sub-tile quadrants (`depths 0..3`) and wall-alcove items on facing/side alcoves with 6-level torchlight shading. Clicking a reachable floor pile (`depth 0` front-left/front-right quadrants or `depth 1` facing alcove) when `handItem === null` picks up the top item into `handItem`, displays its name and weight (`X.X KG`) in the top/status area, and renders the held item cursor affordance; clicking the floor quadrant or alcove again drops/stacks `handItem` cleanly (HCI #1 Visibility & #3 Undo/Drop Freedom).
- **AC 2.2.3**: Clicking the upper-left or upper-right half of the `224×136` 3D viewport while holding `handItem` throws the item forward along the left or right sub-tile lane as a 6 Hz projectile (`kineticEnergy` based on champion Strength vs. item weight), advancing tile-by-tile through open corridors and open grates (if small), colliding with walls or closed doors, dropping onto the floor sub-tile when energy expires, and activating item-sensitive **floor pressure plates**, **wall alcoves**, and **teleporters**; clicking a **Keyhole / Coin Slot** while holding the matching `DB10` key/coin consumes/triggers the lock actuator with Paula click SFX.

---

## Story 2.3: Survival Vitals — Food, Water, Stamina, Sleep, Torch Burn & Vi Altars
**As a** party leader venturing deep underground,
**I want** champions to consume Food and Water over time, eat rations and drink/refill at dungeon fountains, rest (`Sleep`) to recover Health/Stamina/Mana, watch held Torches burn down, and revive fallen champions by placing their Bones into a *Vi Altar of Rebirth*,
**So that** resource tension, darkness management, and party survival match the authentic 1988 Amiga experience.

### Acceptance Criteria
- **AC 2.3.1**: On the 6 Hz simulation clock, living champions gradually consume Food, Water, and Stamina (faster when moving while encumbered); positive Food/Water regenerates Stamina & Health, whereas depleted Food/Water (`< 0` threshold) warns via yellow/red bar states and drains Stamina then Health. Dragging edible items (`Apple`, `Corn`, `Bread`, `Cheese`, `Screamer Slice`, `Worm Round`, `Drumstick`, `Dragon Steak`) or potable items (`Waterskin`, `Water Flask`) onto the **Mouth** icon consumes a ration/charge with authentic gulp SFX; clicking a facing **Wall Fountain** with an empty hand drinks directly, or with a `Waterskin` / `Empty Flask` refills it.
- **AC 2.3.2**: Held lit **Torches** in champion action hands decay across tick intervals through diminishing light charges down to a `Burned Out Torch`, dynamically recalculating party light radius (`0..5`). Clicking the HUD **Sleep (`Zzz`)** icon (or pressing `Z` in QoL Mode) enters Sleep state: darkens the viewport with a clear `"SLEEPING — CLICK OR PRESS ANY KEY TO WAKE"` prompt (HCI #1 & #3), accelerates Health/Stamina/Mana recovery while slowing Food/Water drain, and wakes immediately on any click, movement input, or party damage.
- **AC 2.3.3**: When a champion's Health drops to `0` (from pit fall damage, crushing doors, or starvation), their HUD slot displays a fallen/skull state, all carried items plus a champion-specific `<NAME> BONES` item drop onto the party's current floor sub-tile, and if all living champions die (`total party wipe`), a clear Game Over / Restart banner is shown. Placing `<NAME> BONES` into a facing **Vi Altar** wall niche triggers the rebirth sequence and restores that champion to life at the party's side.

---

# Archived: Sprint 1 User Stories (Delivered & Launched)

- **Story 1.1**: Repeatable Project Toolchain & Headless Engine Harness (*Delivered — 32/32 Vitest tests green*)
- **Story 1.2**: Authentic 320×200 Amiga Viewport & Classic HUD Layout (*Delivered — FTL `item[558]` perspective & `108..119` 3D doors verified*)
- **Story 1.3**: Real-Time Dungeon Grid Navigation & Interactive Mechanics (*Delivered — 14 Amiga levels, doors, plates, pits, stairs, teleporters*)
- **Story 1.4**: Hall of Champions, Paula Stereo Audio & QoL Controls (*Delivered — 24 Champions, `5500 Hz` `SND2` audio + `SFX BOARD [B]`, Purist/QoL*)
