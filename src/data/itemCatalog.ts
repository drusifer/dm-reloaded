/**
 * Normalized 180-entry FTL ItemDef catalog and Amiga graphics.dat item[556]/item[559] parsers.
 *
 * TLDR:
 *   Provides the canonical 199 item names (item[556]) and 180 ItemDef descriptors
 *   (DB7 Scroll, DB9 Chest, DB8 Potions, DB5 Weapons, DB6 Clothes, DB10 Misc) with
 *   authentic weights, armor ratings, equip bitmasks, nutrition, and Dual-Mode parsers.
 */

import type { ItemCategory, ItemDef, ItemInstance } from '../engine/types';

export const EQUIP_MASK = {
  MOUTH: 0x0001,
  HEAD: 0x0002,
  NECK: 0x0004,
  TORSO: 0x0008,
  LEGS: 0x0010,
  FEET: 0x0020,
  QUIVER_WEAPON: 0x0040,
  QUIVER_AMMO: 0x0080,
  POUCH: 0x0100,
  CHEST_FIT: 0x0400
} as const;

export const ITEM_NAMES_199: readonly string[] = [
  'COMPASS',
  'COMPASS',
  'COMPASS',
  'COMPASS',
  'TORCH',
  'TORCH',
  'TORCH',
  'TORCH',
  'WATERSKIN',
  'WATER',
  'JEWEL SYMAL',
  'JEWEL SYMAL',
  'ILLUMULET',
  'ILLUMULET',
  'FLAMITT',
  'FLAMITT',
  'EYE OF TIME',
  'EYE OF TIME',
  'STORMRING',
  'STORMRING',
  'STAFF OF CLAWS',
  'STAFF OF CLAWS',
  'STAFF OF CLAWS',
  'BOLT BLADE',
  'BOLT BLADE',
  'FURY',
  'FURY',
  'THE FIRESTAFF',
  'THE FIRESTAFF',
  'THE FIRESTAFF',
  'OPEN SCROLL',
  'SCROLL',
  'DAGGER',
  'FALCHION',
  'SWORD',
  'RAPIER',
  'SABRE',
  'SAMURAI SWORD',
  'DELTA',
  'DIAMOND EDGE',
  'VORPAL BLADE',
  'THE INQUISITOR',
  'AXE',
  'HARDCLEAVE',
  'MACE',
  'MACE OF ORDER',
  'MORNINGSTAR',
  'CLUB',
  'STONE CLUB',
  'BOW',
  'CROSSBOW',
  'ARROW',
  'SLAYER',
  'SLING',
  'ROCK',
  'POISON DART',
  'THROWING STAR',
  'STICK',
  'STAFF',
  'WAND',
  'TEOWAND',
  'YEW STAFF',
  'STAFF OF MANAR',
  'SNAKE STAFF',
  'THE CONDUIT',
  'DRAGON SPIT',
  'SCEPTRE OF LYF',
  'ROBE',
  'FINE ROBE',
  'KIRTLE',
  'SILK SHIRT',
  'ELVEN DOUBLET',
  'LEATHER JERKIN',
  'TUNIC',
  'GHI',
  'MAIL AKETON',
  'MITHRAL AKETON',
  'TORSO PLATE',
  'PLATE OF LYTE',
  'PLATE OF DARC',
  'CAPE',
  'CLOAK OF NIGHT',
  'BARBARIAN HIDE',
  'ROBE',
  'FINE ROBE',
  'TABARD',
  'GUNNA',
  'ELVEN HUKE',
  'LEATHER PANTS',
  'BLUE PANTS',
  'GHI TROUSERS',
  'LEG MAIL',
  'MITHRAL MAIL',
  'LEG PLATE',
  'POLEYN OF LYTE',
  'POLEYN OF DARC',
  'BEZERKER HELM',
  'HELMET',
  'BASINET',
  "CASQUE 'N COIF",
  'ARMET',
  'HELM OF LYTE',
  'HELM OF DARC',
  'CALISTA',
  'CROWN OF NERRA',
  'BUCKLER',
  'HIDE SHIELD',
  'SMALL SHIELD',
  'WOODEN SHIELD',
  'LARGE SHIELD',
  'SHIELD OF LYTE',
  'SHIELD OF DARC',
  'SANDALS',
  'SUEDE BOOTS',
  'LEATHER BOOTS',
  'HOSEN',
  'FOOT PLATE',
  'GREAVE OF LYTE',
  'GREAVE OF DARC',
  'ELVEN BOOTS',
  'GEM OF AGES',
  'EKKHARD CROSS',
  'MOONSTONE',
  'THE HELLION',
  'PENDANT FERAL',
  'COPPER COIN',
  'SILVER COIN',
  'GOLD COIN',
  'BOULDER',
  'BLUE GEM',
  'ORANGE GEM',
  'GREEN GEM',
  'MAGICAL BOX',
  'MAGICAL BOX',
  'MIRROR OF DAWN',
  'HORN OF FEAR',
  'ROPE',
  "RABBIT'S FOOT",
  'CORBAMITE',
  'CHOKER',
  'DEXHELM',
  'FLAMEBAIN',
  'POWERTOWERS',
  'SPEEDBOW',
  'CHEST',
  'OPEN CHEST',
  'ASHES',
  'BONES',
  'MON POTION',
  'UM POTION',
  'DES POTION',
  'VEN POTION',
  'SAR POTION',
  'ZO POTION',
  'ROS POTION',
  'KU POTION',
  'DANE POTION',
  'NETA POTION',
  'BRO POTION',
  'MA POTION',
  'YA POTION',
  'EE POTION',
  'VI POTION',
  'WATER FLASK',
  'KATH BOMB',
  'PEW BOMB',
  'RA BOMB',
  'FUL BOMB',
  'APPLE',
  'CORN',
  'BREAD',
  'CHEESE',
  'SCREAMER SLICE',
  'WORM ROUND',
  'DRUMSTICK',
  'DRAGON STEAK',
  'IRON KEY',
  'KEY OF B',
  'SOLID KEY',
  'SQUARE KEY',
  'TOURQUOISE KEY',
  'CROSS KEY',
  'ONYX KEY',
  'SKELETON KEY',
  'GOLD KEY',
  'WINGED KEY',
  'TOPAZ KEY',
  'SAPPHIRE KEY',
  'EMERALD KEY',
  'RUBY KEY',
  'RA KEY',
  'MASTER KEY',
  'LOCK PICKS',
  'MAGNIFIER',
  'BOOTS OF SPEED',
  'EMPTY FLASK',
  'HALTER',
  'ZOKATHRA SPELL',
  'BONES'
];

type CompactRow = readonly [
  number, // defId
  ItemCategory,
  number, // subtype
  number, // iconIndex
  number, // equipMask
  number, // floorSpriteIndex
  number, // weightTenthsKg
  number, // armorStrength
  number, // nutritionValue
  number, // waterValue
  boolean, // passThroughGrate
  number // lightBonus
];

const COMPACT_CATALOG_180: readonly CompactRow[] = [
  [0, 'SCROLL', 0, 30, 0x0500, 1, 1, 0, 0, 0, true, 0],
  [1, 'CHEST', 0, 144, 0x0200, 0, 50, 0, 0, 0, false, 0],
  [2, 'POTION', 0, 148, 0x0500, 67, 3, 0, 0, 150, true, 0],
  [3, 'POTION', 1, 149, 0x0500, 67, 3, 0, 0, 150, true, 0],
  [4, 'POTION', 2, 150, 0x0500, 67, 3, 0, 0, 150, true, 0],
  [5, 'POTION', 3, 151, 0x0500, 67, 3, 0, 0, 150, true, 0],
  [6, 'POTION', 4, 152, 0x0500, 67, 3, 0, 0, 150, true, 0],
  [7, 'POTION', 5, 153, 0x0500, 67, 3, 0, 0, 150, true, 0],
  [8, 'POTION', 6, 154, 0x0501, 2, 3, 0, 0, 150, true, 0],
  [9, 'POTION', 7, 155, 0x0501, 2, 3, 0, 0, 150, true, 0],
  [10, 'POTION', 8, 156, 0x0501, 2, 3, 0, 0, 150, true, 0],
  [11, 'POTION', 9, 157, 0x0501, 2, 3, 0, 0, 150, true, 0],
  [12, 'POTION', 10, 158, 0x0501, 2, 3, 0, 0, 150, true, 0],
  [13, 'POTION', 11, 159, 0x0501, 2, 3, 0, 0, 150, true, 0],
  [14, 'POTION', 12, 160, 0x0501, 2, 3, 0, 0, 150, true, 0],
  [15, 'POTION', 13, 161, 0x0501, 2, 3, 0, 0, 150, true, 0],
  [16, 'POTION', 14, 162, 0x0501, 2, 3, 0, 0, 150, true, 0],
  [17, 'POTION', 15, 163, 0x0501, 2, 3, 0, 0, 450, true, 0],
  [18, 'POTION', 16, 164, 0x0500, 68, 3, 0, 0, 0, true, 0],
  [19, 'POTION', 17, 165, 0x0500, 68, 3, 0, 0, 0, true, 0],
  [20, 'POTION', 18, 166, 0x0500, 68, 3, 0, 0, 0, true, 0],
  [21, 'POTION', 19, 167, 0x0500, 68, 3, 0, 0, 0, true, 0],
  [22, 'POTION', 20, 195, 0x0500, 80, 1, 0, 0, 0, true, 0],
  [23, 'WEAPON', 0, 16, 0x0500, 38, 1, 0, 0, 0, true, 0],
  [24, 'WEAPON', 1, 18, 0x0500, 38, 1, 0, 0, 0, true, 0],
  [25, 'WEAPON', 2, 4, 0x0400, 35, 11, 0, 0, 0, false, 3],
  [26, 'WEAPON', 3, 14, 0x0400, 37, 12, 0, 0, 0, false, 0],
  [27, 'WEAPON', 4, 20, 0x0040, 11, 9, 0, 0, 0, false, 0],
  [28, 'WEAPON', 5, 23, 0x0040, 12, 30, 0, 0, 0, false, 0],
  [29, 'WEAPON', 6, 25, 0x0040, 12, 47, 0, 0, 0, false, 0],
  [30, 'WEAPON', 7, 27, 0x0040, 39, 24, 0, 0, 0, false, 0],
  [31, 'WEAPON', 8, 32, 0x05c0, 17, 5, 0, 0, 0, true, 0],
  [32, 'WEAPON', 9, 33, 0x0040, 12, 33, 0, 0, 0, false, 0],
  [33, 'WEAPON', 10, 34, 0x0040, 12, 32, 0, 0, 0, false, 0],
  [34, 'WEAPON', 11, 35, 0x0040, 12, 26, 0, 0, 0, false, 0],
  [35, 'WEAPON', 12, 36, 0x0040, 12, 35, 0, 0, 0, false, 0],
  [36, 'WEAPON', 13, 37, 0x0040, 12, 36, 0, 0, 0, false, 0],
  [37, 'WEAPON', 14, 38, 0x0040, 12, 33, 0, 0, 0, false, 0],
  [38, 'WEAPON', 15, 39, 0x0040, 12, 37, 0, 0, 0, false, 0],
  [39, 'WEAPON', 16, 40, 0x0040, 42, 30, 0, 0, 0, false, 0],
  [40, 'WEAPON', 17, 41, 0x0040, 12, 39, 0, 0, 0, false, 0],
  [41, 'WEAPON', 18, 42, 0x0040, 13, 43, 0, 0, 0, false, 0],
  [42, 'WEAPON', 19, 43, 0x0040, 13, 65, 0, 0, 0, false, 0],
  [43, 'WEAPON', 20, 44, 0x0040, 21, 31, 0, 0, 0, false, 0],
  [44, 'WEAPON', 21, 45, 0x0040, 21, 41, 0, 0, 0, false, 0],
  [45, 'WEAPON', 22, 46, 0x0440, 33, 50, 0, 0, 0, false, 0],
  [46, 'WEAPON', 23, 47, 0x0040, 43, 36, 0, 0, 0, false, 0],
  [47, 'WEAPON', 24, 48, 0x0040, 44, 110, 0, 0, 0, false, 0],
  [48, 'WEAPON', 25, 49, 0x0040, 14, 10, 0, 0, 0, false, 0],
  [49, 'WEAPON', 26, 50, 0x0040, 45, 28, 0, 0, 0, false, 0],
  [50, 'WEAPON', 27, 51, 0x05c0, 16, 2, 0, 0, 0, true, 0],
  [51, 'WEAPON', 28, 52, 0x05c0, 46, 2, 0, 0, 0, true, 0],
  [52, 'WEAPON', 29, 53, 0x0440, 11, 19, 0, 0, 0, false, 0],
  [53, 'WEAPON', 30, 54, 0x05c0, 47, 10, 0, 0, 0, true, 0],
  [54, 'WEAPON', 31, 55, 0x05c0, 48, 3, 0, 0, 0, true, 0],
  [55, 'WEAPON', 32, 56, 0x05c0, 49, 1, 0, 0, 0, true, 0],
  [56, 'WEAPON', 33, 57, 0x0040, 50, 8, 0, 0, 0, false, 0],
  [57, 'WEAPON', 34, 58, 0x0040, 11, 26, 0, 0, 0, false, 0],
  [58, 'WEAPON', 35, 59, 0x0540, 31, 1, 0, 0, 0, true, 0],
  [59, 'WEAPON', 36, 60, 0x0540, 31, 2, 0, 0, 0, true, 0],
  [60, 'WEAPON', 37, 61, 0x0040, 11, 35, 0, 0, 0, false, 0],
  [61, 'WEAPON', 38, 62, 0x0040, 11, 29, 0, 0, 0, false, 0],
  [62, 'WEAPON', 39, 63, 0x0040, 11, 21, 0, 0, 0, false, 0],
  [63, 'WEAPON', 40, 64, 0x0040, 51, 33, 0, 0, 0, false, 0],
  [64, 'WEAPON', 41, 65, 0x0440, 32, 8, 0, 0, 0, false, 0],
  [65, 'WEAPON', 42, 66, 0x0040, 30, 18, 0, 0, 0, false, 0],
  [66, 'WEAPON', 43, 135, 0x0440, 65, 8, 0, 0, 0, false, 0],
  [67, 'WEAPON', 44, 143, 0x0040, 45, 30, 0, 0, 0, false, 0],
  [68, 'WEAPON', 45, 28, 0x0040, 82, 36, 0, 0, 0, false, 0],
  [69, 'CLOTHES', 0, 80, 0x040c, 23, 3, 5, 0, 0, true, 0],
  [70, 'CLOTHES', 1, 81, 0x040c, 23, 4, 10, 0, 0, true, 0],
  [71, 'CLOTHES', 2, 82, 0x0410, 23, 3, 4, 0, 0, true, 0],
  [72, 'CLOTHES', 3, 112, 0x0420, 55, 6, 5, 0, 0, false, 0],
  [73, 'CLOTHES', 4, 114, 0x0420, 8, 16, 25, 0, 0, false, 0],
  [74, 'CLOTHES', 5, 67, 0x0408, 24, 4, 5, 0, 0, true, 0],
  [75, 'CLOTHES', 6, 83, 0x0410, 24, 4, 5, 0, 0, true, 0],
  [76, 'CLOTHES', 7, 68, 0x0408, 24, 3, 7, 0, 0, true, 0],
  [77, 'CLOTHES', 8, 84, 0x0410, 24, 3, 7, 0, 0, true, 0],
  [78, 'CLOTHES', 9, 69, 0x0408, 69, 4, 6, 0, 0, true, 0],
  [79, 'CLOTHES', 10, 70, 0x0408, 24, 2, 4, 0, 0, true, 0],
  [80, 'CLOTHES', 11, 85, 0x0410, 24, 4, 5, 0, 0, true, 0],
  [81, 'CLOTHES', 12, 86, 0x0410, 69, 5, 7, 0, 0, true, 0],
  [82, 'CLOTHES', 13, 71, 0x0408, 7, 3, 11, 0, 0, true, 0],
  [83, 'CLOTHES', 14, 87, 0x0410, 7, 3, 13, 0, 0, true, 0],
  [84, 'CLOTHES', 15, 119, 0x0420, 57, 4, 13, 0, 0, true, 0],
  [85, 'CLOTHES', 16, 72, 0x0408, 23, 6, 17, 0, 0, false, 0],
  [86, 'CLOTHES', 17, 88, 0x0410, 23, 8, 20, 0, 0, false, 0],
  [87, 'CLOTHES', 18, 113, 0x0420, 29, 14, 20, 0, 0, false, 0],
  [88, 'CLOTHES', 19, 89, 0x0410, 69, 6, 12, 0, 0, false, 0],
  [89, 'CLOTHES', 20, 73, 0x0408, 69, 5, 9, 0, 0, true, 0],
  [90, 'CLOTHES', 21, 74, 0x0408, 24, 5, 8, 0, 0, true, 0],
  [91, 'CLOTHES', 22, 90, 0x0410, 24, 5, 9, 0, 0, true, 0],
  [92, 'CLOTHES', 23, 103, 0x0402, 53, 4, 1, 0, 0, true, 0],
  [93, 'CLOTHES', 24, 104, 0x0402, 53, 6, 5, 0, 0, false, 0],
  [94, 'CLOTHES', 25, 96, 0x0402, 9, 11, 12, 0, 0, false, 0],
  [95, 'CLOTHES', 26, 97, 0x0402, 9, 14, 17, 0, 0, false, 0],
  [96, 'CLOTHES', 27, 98, 0x0402, 9, 15, 20, 0, 0, false, 0],
  [97, 'CLOTHES', 28, 105, 0x0400, 54, 11, 22, 0, 0, false, 0],
  [98, 'CLOTHES', 29, 106, 0x0200, 54, 10, 16, 0, 0, false, 0],
  [99, 'CLOTHES', 30, 108, 0x0200, 10, 14, 20, 0, 0, false, 0],
  [100, 'CLOTHES', 31, 107, 0x0200, 54, 21, 35, 0, 0, false, 0],
  [101, 'CLOTHES', 32, 75, 0x0408, 19, 65, 35, 0, 0, false, 0],
  [102, 'CLOTHES', 33, 91, 0x0410, 19, 53, 35, 0, 0, false, 0],
  [103, 'CLOTHES', 34, 76, 0x0408, 19, 52, 70, 0, 0, false, 0],
  [104, 'CLOTHES', 35, 92, 0x0410, 19, 41, 55, 0, 0, false, 0],
  [105, 'CLOTHES', 36, 99, 0x0402, 9, 16, 25, 0, 0, false, 0],
  [106, 'CLOTHES', 37, 115, 0x0420, 19, 16, 30, 0, 0, false, 0],
  [107, 'CLOTHES', 38, 100, 0x0402, 52, 19, 40, 0, 0, false, 0],
  [108, 'CLOTHES', 39, 77, 0x0008, 20, 120, 65, 0, 0, false, 0],
  [109, 'CLOTHES', 40, 93, 0x0010, 22, 80, 56, 0, 0, false, 0],
  [110, 'CLOTHES', 41, 116, 0x0420, 56, 28, 37, 0, 0, false, 0],
  [111, 'CLOTHES', 42, 109, 0x0200, 10, 34, 56, 0, 0, false, 0],
  [112, 'CLOTHES', 43, 101, 0x0402, 52, 17, 62, 0, 0, false, 0],
  [113, 'CLOTHES', 44, 78, 0x0008, 20, 108, 125, 0, 0, false, 0],
  [114, 'CLOTHES', 45, 94, 0x0010, 22, 72, 90, 0, 0, false, 0],
  [115, 'CLOTHES', 46, 117, 0x0420, 56, 24, 50, 0, 0, false, 0],
  [116, 'CLOTHES', 47, 110, 0x0200, 10, 30, 85, 0, 0, false, 0],
  [117, 'CLOTHES', 48, 102, 0x0402, 52, 35, 76, 0, 0, false, 0],
  [118, 'CLOTHES', 49, 79, 0x0008, 20, 141, 160, 0, 0, false, 0],
  [119, 'CLOTHES', 50, 95, 0x0010, 22, 90, 101, 0, 0, false, 0],
  [120, 'CLOTHES', 51, 118, 0x0420, 56, 31, 60, 0, 0, false, 0],
  [121, 'CLOTHES', 52, 111, 0x0200, 10, 40, 100, 0, 0, false, 0],
  [122, 'CLOTHES', 53, 140, 0x0402, 52, 14, 54, 0, 0, false, 0],
  [123, 'CLOTHES', 54, 141, 0x0408, 19, 57, 60, 0, 0, false, 0],
  [124, 'CLOTHES', 55, 142, 0x0010, 22, 81, 88, 0, 0, false, 0],
  [125, 'CLOTHES', 56, 194, 0x0420, 81, 3, 16, 0, 0, true, 0],
  [126, 'CLOTHES', 57, 196, 0x0408, 84, 2, 3, 0, 0, true, 0],
  [127, 'MISC', 0, 0, 0x0500, 34, 1, 0, 0, 0, true, 0],
  [128, 'MISC', 1, 8, 0x0501, 6, 3, 0, 0, 450, true, 0],
  [129, 'MISC', 2, 10, 0x0504, 15, 2, 0, 0, 0, true, 0],
  [130, 'MISC', 3, 12, 0x0504, 15, 2, 0, 0, 0, true, 2],
  [131, 'MISC', 4, 146, 0x0500, 40, 4, 0, 0, 0, true, 0],
  [132, 'MISC', 5, 147, 0x0400, 41, 15, 0, 0, 0, false, 0],
  [133, 'MISC', 6, 125, 0x0500, 4, 1, 0, 0, 0, true, 0],
  [134, 'MISC', 7, 126, 0x0500, 83, 1, 0, 0, 0, true, 0],
  [135, 'MISC', 8, 127, 0x0500, 4, 1, 0, 0, 0, true, 0],
  [136, 'MISC', 9, 176, 0x0500, 18, 2, 0, 0, 0, true, 0],
  [137, 'MISC', 10, 177, 0x0500, 18, 1, 0, 0, 0, true, 0],
  [138, 'MISC', 11, 178, 0x0500, 18, 1, 0, 0, 0, true, 0],
  [139, 'MISC', 12, 179, 0x0500, 18, 1, 0, 0, 0, true, 0],
  [140, 'MISC', 13, 180, 0x0500, 18, 1, 0, 0, 0, true, 0],
  [141, 'MISC', 14, 181, 0x0500, 18, 1, 0, 0, 0, true, 0],
  [142, 'MISC', 15, 182, 0x0500, 18, 1, 0, 0, 0, true, 0],
  [143, 'MISC', 16, 183, 0x0500, 18, 1, 0, 0, 0, true, 0],
  [144, 'MISC', 17, 184, 0x0500, 62, 1, 0, 0, 0, true, 0],
  [145, 'MISC', 18, 185, 0x0500, 62, 1, 0, 0, 0, true, 0],
  [146, 'MISC', 19, 186, 0x0500, 62, 1, 0, 0, 0, true, 0],
  [147, 'MISC', 20, 187, 0x0500, 62, 1, 0, 0, 0, true, 0],
  [148, 'MISC', 21, 188, 0x0500, 62, 1, 0, 0, 0, true, 0],
  [149, 'MISC', 22, 189, 0x0500, 62, 1, 0, 0, 0, true, 0],
  [150, 'MISC', 23, 190, 0x0500, 62, 1, 0, 0, 0, true, 0],
  [151, 'MISC', 24, 191, 0x0500, 62, 1, 0, 0, 0, true, 0],
  [152, 'MISC', 25, 128, 0x0200, 76, 81, 0, 0, 0, true, 0],
  [153, 'MISC', 26, 129, 0x0500, 3, 2, 0, 0, 0, true, 0],
  [154, 'MISC', 27, 130, 0x0500, 60, 3, 0, 0, 0, true, 0],
  [155, 'MISC', 28, 131, 0x0500, 61, 2, 0, 0, 0, true, 0],
  [156, 'MISC', 29, 168, 0x0501, 27, 4, 0, 600, 0, true, 0],
  [157, 'MISC', 30, 169, 0x0501, 28, 4, 0, 650, 0, true, 0],
  [158, 'MISC', 31, 170, 0x0501, 25, 3, 0, 820, 0, true, 0],
  [159, 'MISC', 32, 171, 0x0501, 26, 8, 0, 550, 0, false, 0],
  [160, 'MISC', 33, 172, 0x0401, 71, 5, 0, 350, 0, true, 0],
  [161, 'MISC', 34, 173, 0x0401, 70, 11, 0, 990, 0, false, 0],
  [162, 'MISC', 35, 174, 0x0501, 5, 4, 0, 1400, 0, true, 0],
  [163, 'MISC', 36, 175, 0x0501, 66, 6, 0, 1400, 0, false, 0],
  [164, 'MISC', 37, 120, 0x0504, 15, 2, 0, 0, 0, true, 0],
  [165, 'MISC', 38, 121, 0x0504, 15, 3, 0, 0, 0, true, 0],
  [166, 'MISC', 39, 122, 0x0504, 58, 2, 0, 0, 0, true, 0],
  [167, 'MISC', 40, 123, 0x0504, 59, 2, 0, 0, 0, true, 0],
  [168, 'MISC', 41, 124, 0x0504, 59, 2, 0, 0, 0, true, 0],
  [169, 'MISC', 42, 132, 0x0500, 79, 6, 0, 0, 0, false, 0],
  [170, 'MISC', 43, 133, 0x0500, 63, 9, 0, 0, 0, false, 0],
  [171, 'MISC', 44, 134, 0x0500, 64, 3, 0, 0, 0, true, 0],
  [172, 'MISC', 45, 136, 0x0400, 72, 10, 0, 0, 0, false, 0],
  [173, 'MISC', 46, 137, 0x0500, 73, 1, 0, 0, 0, true, 0],
  [174, 'MISC', 47, 138, 0x0500, 74, 1, 0, 0, 0, true, 0],
  [175, 'MISC', 48, 139, 0x0504, 75, 1, 0, 0, 0, true, 0],
  [176, 'MISC', 49, 192, 0x0500, 77, 1, 0, 0, 0, true, 0],
  [177, 'MISC', 50, 193, 0x0500, 78, 2, 0, 0, 0, true, 0],
  [178, 'MISC', 51, 197, 0x0000, 74, 1, 0, 0, 0, true, 0],
  [179, 'MISC', 52, 198, 0x0400, 41, 8, 0, 0, 0, false, 0]
];

/**
 * Display name for a descriptor: the icon's item[556] name, except Scrolls whose icon (30) is
 * labelled "OPEN SCROLL" in the table but which are always presented as "SCROLL" in the world.
 */
function displayName(category: ItemCategory, iconIndex: number, names: readonly string[], fallback: string): string {
  if (category === 'SCROLL') {
    return 'SCROLL';
  }
  return names[iconIndex] ?? fallback;
}

export const ITEM_CATALOG_180: readonly ItemDef[] = COMPACT_CATALOG_180.map((r) => ({
  defId: r[0],
  category: r[1],
  subtype: r[2],
  iconIndex: r[3],
  name: displayName(r[1], r[3], ITEM_NAMES_199, `ITEM_${r[0]}`),
  equipMask: r[4],
  floorSpriteIndex: r[5],
  weightTenthsKg: r[6],
  armorStrength: r[7],
  nutritionValue: r[8],
  waterValue: r[9],
  passThroughGrate: r[10],
  lightBonus: r[11]
}));

const BY_CAT_SUB = new Map<string, ItemDef>();
for (const def of ITEM_CATALOG_180) {
  BY_CAT_SUB.set(`${def.category}:${def.subtype}`, def);
}

/**
 * Looks up an ItemDef by its global 0..179 ObjectDescriptor ID.
 */
export function getItemDef(defId: number): ItemDef {
  return ITEM_CATALOG_180[defId] ?? ITEM_CATALOG_180[127]!;
}

/**
 * Looks up an ItemDef by Dungeon.dat category and 0-based subtype index.
 */
export function findItemDef(category: ItemCategory, subtype: number): ItemDef {
  const found = BY_CAT_SUB.get(`${category}:${subtype}`);
  if (found) {
    return found;
  }
  const fallbackId =
    category === 'SCROLL'
      ? 0
      : category === 'CHEST'
        ? 1
        : category === 'POTION'
          ? 2
          : category === 'WEAPON'
            ? 31
            : category === 'CLOTHES'
              ? 74
              : 127;
  return ITEM_CATALOG_180[fallbackId]!;
}

/**
 * Resolves a human-readable or legacy Sprint 1 item identifier (e.g. 'SAMURAI_SWORD', 'GI', 'TORCH') to an ItemDef.
 */
export function findItemDefByLegacyName(rawName: string): ItemDef {
  const normalized = rawName.trim().toUpperCase().replace(/_/g, ' ');
  if (normalized === 'OPEN SCROLL') {
    return ITEM_CATALOG_180[0]!;
  }
  if (normalized === 'GI') {
    return ITEM_CATALOG_180.find((d) => d.name === 'GHI') ?? ITEM_CATALOG_180[74]!;
  }
  const exact = ITEM_CATALOG_180.find((d) => d.name === normalized);
  if (exact) {
    return exact;
  }
  if (normalized.startsWith('WEAPON ')) {
    const sub = Number.parseInt(normalized.slice(7), 10);
    if (!Number.isNaN(sub)) return findItemDef('WEAPON', sub);
  }
  if (normalized.startsWith('ARMOR ')) {
    const sub = Number.parseInt(normalized.slice(6), 10);
    if (!Number.isNaN(sub)) return findItemDef('CLOTHES', sub);
  }
  return ITEM_CATALOG_180[25]!; // TORCH fallback
}

/**
 * Decodes the 199 high-bit-terminated ASCII item names from Amiga graphics.dat item[556].
 */
export function parseItemNamesFrom556(bytes: Uint8Array): readonly string[] {
  const result: string[] = [];
  let current = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i] ?? 0;
    if ((b & 0x80) !== 0) {
      current += String.fromCharCode(b & 0x7f);
      result.push(current);
      current = '';
    } else {
      current += String.fromCharCode(b);
    }
  }
  return result;
}

/**
 * Decodes the 180 6-byte ObjectDescriptor entries from Amiga graphics.dat item[559] (offsets 1959..3038).
 */
export function parseObjectDescriptorsFrom559(
  bytes559: Uint8Array,
  names: readonly string[] = ITEM_NAMES_199
): readonly ItemDef[] {
  if (bytes559.length < 3039) {
    return ITEM_CATALOG_180;
  }
  return ITEM_CATALOG_180.map((baseline, defId) => {
    const off = 1959 + defId * 6;
    const iconIndex = bytes559[off] ?? baseline.iconIndex;
    const floorSpriteIndex = bytes559[off + 1] ?? baseline.floorSpriteIndex;
    const equipMask = ((bytes559[off + 3] ?? 0) << 8) | (bytes559[off + 4] ?? 0);
    return {
      ...baseline,
      iconIndex,
      name: displayName(baseline.category, iconIndex, names, baseline.name),
      floorSpriteIndex,
      equipMask
    };
  });
}

/** Original icon sheet: 4 is unlit; 5–7 have progressively larger attached flames. */
export function torchIconForCharges(charges: number): number {
  return charges <= 0 ? 4 : charges <= 5 ? 5 : charges <= 10 ? 6 : 7;
}

/** Resolve charge-sensitive artwork consistently for slots, floor items and the cursor. */
export function itemIconIndex(item: ItemInstance): number {
  return item.name === 'TORCH' ? torchIconForCharges(item.charges) : item.iconIndex;
}
