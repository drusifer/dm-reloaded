# Dungeon Master II (Skullkeep, Amiga AGA) — Data Findings

Evidence gathered in Sprint 7 from the user's own `Dungeon-Master-II-Skullkeep_Amiga_EN.zip` (never committed; extracted files are gitignored). Everything below is an **observation**, not a claim about game rules.

## Extraction
- The six install disks join into `DM2_archive.LZX` (4,310,121 bytes, Amiga LZX). `scripts/lzx_extract.py` (independent Python decoder written from the public libxmp `lzx.c`/`lzx_unpack.c` descriptions) extracts all **35 entries**; every header CRC and every data CRC32 stored in the archive matches. Run `bobp make extract-dm2`.
- Notable files (unpacked bytes): `DUNGEON.DAT` 39,411; `GRAPHICS.DAT` 3,493,879 (AGA); `TITL.DAT` 590,134; `ENDA.DAT` 650,116; `SKUL.FTL` 270,778; `LANG.FTL` 22,530; `MMUS.BIN` 6,092; ten `music/SK0n.MOD` modules; small `*.FTL`/`*.DAT` support files; `sample_palette.IFF`; `SkullKeep.info`.
- Merged entries (flag 1) share one compressed stream attached to the last entry of the group; the extractor handles this.

## DUNGEON.DAT
- The container header matches the DM1 `Dungeon.dat` layout: seed `0`, map data size `12,603`, **44 maps**, 28 text words, start word `257` (level 0, x=1, y=8, facing north), 2,353 object-list words, and the 16 record-count table (doors 53, teleporters 217, texts 576, actuators 1,020, creatures 299, weapons 173, clothes 202, scrolls 9, potions 83, chests 24, misc 256).
- The size arithmetic closes exactly: header + map descriptors + column index + object list + text + all DB records end at byte 26,806; plus 12,603 bytes of map data = 39,409 of 39,411 (2 bytes slack).
- The existing DM1 parser reads it without error into 44 levels (sizes from 5×5 to 30×17 and up), depth values 1–10, 675 items and 185 creature groups.
- **Semantics are NOT verified.** Parsed tile types: WALL 7,883, FLOOR 3,483, PIT 516, TELEPORTER 216, TRICK_WALL 87, DOOR 53, STAIRS 4. Only 4 stairs against 216 teleporters and 516 "pits" suggests DM2 moves between maps differently from DM1 and that some DM1 tile-type meanings do not carry over. Zero champion mirrors exist, so no party can be recruited from this file.
- Creature records use type ids up to 85 (DM1 uses 0–26); the 114 records whose ids exceed 26 are ignored by the DM1 monster catalog.

## GRAPHICS.DAT
- Header begins `80 05 12 16 …`. The DM1 `parseGraphicsDat` returns **0 sprites** for it, so the AGA graphics container is a different format. No DM2 art is usable yet.

## What this does and does not enable
- Enables: reproducible extraction and CRC-verified inventory of all DM2 files; importing the map container structurally.
- Does not enable: outdoor/weather, shops/coins/merchants, commandable minions, DM2 art or audio, a DM2 party. Their data formats and rules are not decoded; implementing them would be guesswork.

## Sprint 8 additions: GRAPHICS.DAT is a "GDAT" container (decoded)

Where this was learned: the public `gbsphenx/skproject` repository (SKWin / DM2GDED / DMDC2) describes the DM2 GDAT format. It has **no license file**, so only file-format *facts* were taken; the reader in `src/data/gdat.ts` was written independently and every claim below is verified against the user's own file.

- **Container** (verified): big-endian on Amiga; magic `0x8005`, entry count u16 (4,630), entry-0 size u32 (80,380), then 4,629 u16 entry sizes, then the entries. Header 9,266 bytes + entry sizes 3,404,233 = **3,493,879 = the file length exactly**.
- **Directory** (verified): entry 0 has a 0x14-byte header (u16 record count at +2, always big-endian) and 10,045 eight-byte records filling it exactly: a 6-byte key (category, id, class, …) and a u16 that is an entry index for binary classes (images 1, sounds 2, text 5, …) or an inline value otherwise. 3,653 records belong to category `0x0F` (creatures: 77 distinct ids, 0–87).
- **Text** (verified): `((byte + index) & 0xFF) ^ 0xFF`, stopping at 0. Creature names live at key `(0x0F, id, 5, 0, 0xF0, 0)`: id 0 `THORN DEMON`, 2 `VORTEX`, 4 `BUSH`, 5 `PILLAR`, 6 `STALAGMITE`. **Every creature id used by DM2's `DUNGEON.DAT` (up to 85) has a name.** Creature *stats* are not in the decoded data; only names, sounds, graphics and a few inline values.
- **Images** (verified): 4,758 class-1 records reference **3,011 distinct entries**. All decode with the encoding's own check (stream consumed exactly, image filled exactly): **2,060 primary + 951 overlay (secondary) planes, 0 failures**. Encoding: width/height u16 (low 10 bits), a nibble stream of 6 (primary) or 5 (overlay) local-palette nibbles then commands (colour 0–4/5, copy-above 6, explicit colour 7, bit 3 = duration with 1/2/3/5-nibble forms), and a 16-byte tail of palette indices. The `0x8000` flag (uncompressed 4-bit) does not occur in this file and is not supported.
- **Visual check**: decoded sheets show recognizable art (axemen, bats, wolves, barrels, skeletons, ladders, fireplaces, fountains, gears). Overlay planes appear as partial black-background pieces, as expected.
- **Palette is NOT identified.** Entry 244 (768 bytes of values 0–31) was tried as a 5-bit RGB palette indexed by the 16-byte tails and produced unnatural green/cyan images, so it is something else; 64-byte 16-colour scene palettes also exist. Renderers use grayscale indices.
- **Still unknown**: DM2 creature stats/AI, tile-type semantics, party/champion data, shop and weather data, sound/music container details, and how overlay planes composite with primary planes.
- Sprint 7 note corrected: image counts quoted during Sprint 8 research (4,758) were directory *records*; the distinct images are 3,011.
