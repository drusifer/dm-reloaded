/**
 * Binary parser and 0x8104 bitstream decompressor for original Amiga Dungeon.dat files.
 *
 * TLDR:
 *   Decompresses FTL 0x8104 prefix-encoded Dungeon.dat (25,006B -> 33,444B) and parses
 *   all 14 original Dungeon Master levels, 5-bit packed text strings, all 24 Hall of
 *   Champions heroes (stats + 16 hidden skills), doors, teleporters, pits, stairs,
 *   trick walls, sconces, and wall/floor actuators into a normalized CampaignBundle.
 */

import {
  DIRECTION_DELTAS,
  type Actuator,
  type ActuatorAction,
  type CampaignBundle,
  type ChampionDefinition,
  type Direction,
  type DoorMaterial,
  type DoorProgress,
  type DungeonLevel,
  type Tile,
  type TileType,
  type WallFeature
} from '../engine/types';

const COMPRESSED_MAGIC = 0x8104;

const ESCAPE_30_TABLE: Readonly<Record<number, string>> = {
  0: 'AND ',
  1: '!',
  2: 'THE ',
  3: 'YOU ',
  4: '? ',
  5: '. '
};

const DB_RECORD_SIZES: readonly number[] = [
  4,  // 0: Doors
  6,  // 1: Teleporters
  4,  // 2: Wall Texts / Champion Texts
  8,  // 3: Actuators
  16, // 4: Monsters
  4,  // 5: Weapons
  4,  // 6: Clothes / Armor
  4,  // 7: Scrolls
  4,  // 8: Potions
  8,  // 9: Chests
  4,  // 10: Misc items
  0,
  0,
  0,
  0,
  0
];

function readU16BE(buf: Uint8Array, offset: number): number {
  return ((buf[offset] ?? 0) << 8) | (buf[offset + 1] ?? 0);
}

function readU32BE(buf: Uint8Array, offset: number): number {
  return (
    (((buf[offset] ?? 0) << 24) >>> 0) +
    (((buf[offset + 1] ?? 0) << 16) | ((buf[offset + 2] ?? 0) << 8) | (buf[offset + 3] ?? 0))
  );
}

/**
 * Decompresses an FTL 0x8104 prefix-coded Dungeon.dat buffer; returns input unchanged if already uncompressed.
 */
export function decompressDungeon8104(raw: Uint8Array): Uint8Array {
  if (raw.length < 28 || readU16BE(raw, 0) !== COMPRESSED_MAGIC) {
    return raw;
  }

  const uncompSize = readU32BE(raw, 2);
  const top4 = raw.subarray(8, 12);
  const next16 = raw.subarray(12, 28);
  const stream = raw.subarray(28);

  let bitPos = 0;
  const readBits = (count: number): number => {
    let val = 0;
    for (let i = 0; i < count; i++) {
      const byteVal = stream[bitPos >> 3] ?? 0;
      const bitShift = 7 - (bitPos & 7);
      val = (val << 1) | ((byteVal >> bitShift) & 1);
      bitPos++;
    }
    return val;
  };

  const out = new Uint8Array(uncompSize);
  let outIdx = 0;
  while (outIdx < uncompSize) {
    const firstBit = readBits(1);
    if (firstBit === 0) {
      out[outIdx++] = top4[readBits(2)] ?? 0;
    } else {
      const secondBit = readBits(1);
      if (secondBit === 0) {
        out[outIdx++] = next16[readBits(4)] ?? 0;
      } else {
        out[outIdx++] = readBits(8);
      }
    }
  }
  return out;
}

/**
 * Decodes a 5-bit packed FTL text entry starting at wordOffset in the text table.
 */
export function decodeDmText(textWords: readonly number[], wordOffset: number): string {
  const codes: number[] = [];
  for (let i = wordOffset; i < textWords.length; i++) {
    const w = textWords[i] ?? 0;
    const c0 = (w >> 10) & 31;
    const c1 = (w >> 5) & 31;
    const c2 = w & 31;
    codes.push(c0, c1, c2);
    if (c0 === 31 || c1 === 31 || c2 === 31) {
      break;
    }
  }

  let result = '';
  let idx = 0;
  while (idx < codes.length) {
    const code = codes[idx++] ?? 31;
    if (code === 31) {
      break;
    } else if (code < 26) {
      result += String.fromCharCode(65 + code);
    } else if (code === 26) {
      result += ' ';
    } else if (code === 27) {
      result += '.';
    } else if (code === 28) {
      result += '\n';
    } else if (code === 29) {
      const sub = codes[idx++] ?? 0;
      result += ESCAPE_30_TABLE[sub] ?? ' ';
    } else if (code === 30) {
      const sub = codes[idx++] ?? 0;
      result += ESCAPE_30_TABLE[sub] ?? ' ';
    }
  }
  return result;
}

function decodeLetterHex(str: string): number {
  let value = 0;
  for (let i = 0; i < str.length; i++) {
    const nibble = Math.max(0, Math.min(15, str.charCodeAt(i) - 65));
    value = (value << 4) | nibble;
  }
  return value;
}

/**
 * Parses a Hall of Champions 7-line encoded text block into a structured ChampionDefinition.
 */
export function parseChampionTextRecord(
  rawText: string,
  portraitIndex: number,
  startingItems: readonly string[]
): ChampionDefinition | null {
  const lines = rawText.split('\n');
  if (lines.length < 7) {
    return null;
  }
  const name = (lines[0] ?? '').trim();
  const title = (lines[1] ?? '').trim();
  const genderChar = (lines[3] ?? 'M').trim();
  const vitalsLine = (lines[4] ?? '').trim();
  const attrsLine = (lines[5] ?? '').trim();
  const skillsLine = (lines[6] ?? '').trim();

  if (!name || vitalsLine.length < 12 || attrsLine.length < 14 || skillsLine.length < 16) {
    return null;
  }

  const maxHealth = decodeLetterHex(vitalsLine.slice(0, 4));
  const rawStamina = decodeLetterHex(vitalsLine.slice(4, 8));
  const maxStamina = Math.max(1, Math.round(rawStamina / 10));
  const maxMana = decodeLetterHex(vitalsLine.slice(8, 12));

  const luck = decodeLetterHex(attrsLine.slice(0, 2));
  const strength = decodeLetterHex(attrsLine.slice(2, 4));
  const dexterity = decodeLetterHex(attrsLine.slice(4, 6));
  const wisdom = decodeLetterHex(attrsLine.slice(6, 8));
  const vitality = decodeLetterHex(attrsLine.slice(8, 10));
  const antiMagic = decodeLetterHex(attrsLine.slice(10, 12));
  const antiFire = decodeLetterHex(attrsLine.slice(12, 14));

  const skills: number[] = [];
  for (let i = 0; i < 16; i++) {
    skills.push(decodeLetterHex(skillsLine.slice(i, i + 1)));
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return {
    id,
    name,
    title,
    gender: genderChar === 'F' ? 'F' : 'M',
    portraitIndex,
    maxHealth,
    maxStamina,
    maxMana,
    attributes: {
      luck,
      strength,
      dexterity,
      wisdom,
      vitality,
      antiMagic,
      antiFire
    },
    skills,
    startingItems
  };
}

interface RawChainEntry {
  readonly pos: Direction;
  readonly category: number;
  readonly index: number;
}

const ACTION_MAP: readonly ActuatorAction[] = ['SET', 'CLEAR', 'TOGGLE', 'HOLD'];

const RAW_TILE_TYPES: readonly TileType[] = [
  'WALL',
  'FLOOR',
  'PIT',
  'STAIRS',
  'DOOR',
  'TELEPORTER',
  'TRICK_WALL',
  'WALL'
];

const WEAPON_NAMES_SAMPLE: Readonly<Record<number, string>> = {
  2: 'TORCH',
  8: 'DAGGER',
  9: 'FALCHION',
  10: 'SWORD',
  23: 'CLUB'
};

/**
 * Parses a compressed or uncompressed Amiga Dungeon.dat buffer into a CampaignBundle.
 */
export function parseDungeonDat(rawInput: Uint8Array): CampaignBundle {
  const buf = decompressDungeon8104(rawInput);

  const seed = readU16BE(buf, 0);
  const mapDataSize = readU16BE(buf, 2);
  const numMaps = buf[4] ?? 0;
  const textWordCount = readU16BE(buf, 6);
  const startPosWord = readU16BE(buf, 8);
  const objListWordCount = readU16BE(buf, 10);

  const startX = startPosWord & 0x1f;
  const startY = (startPosWord >> 5) & 0x1f;
  const startFacing = ((startPosWord >> 10) & 0x03) as Direction;

  const dbCounts: number[] = [];
  for (let i = 0; i < 16; i++) {
    dbCounts.push(readU16BE(buf, 12 + i * 2));
  }

  // Parse 16-byte level descriptors starting at byte 44
  interface MapDesc {
    readonly id: number;
    readonly mapOffset: number;
    readonly offsetX: number;
    readonly offsetY: number;
    readonly width: number;
    readonly height: number;
    readonly depth: number;
  }

  const mapDescs: MapDesc[] = [];
  let totalColumns = 0;
  for (let i = 0; i < numMaps; i++) {
    const off = 44 + i * 16;
    const mapOffset = readU16BE(buf, off);
    const offsetX = buf[off + 6] ?? 0;
    const offsetY = buf[off + 7] ?? 0;
    const w4 = readU16BE(buf, off + 8);
    const width = ((w4 >> 6) & 0x1f) + 1;
    const height = ((w4 >> 11) & 0x1f) + 1;
    const depth = w4 & 0x3f;
    totalColumns += width;
    mapDescs.push({ id: i, mapOffset, offsetX, offsetY, width, height, depth });
  }

  const colObjIndexOffset = 44 + numMaps * 16;
  const objListOffset = colObjIndexOffset + totalColumns * 2;
  const textDataOffset = objListOffset + objListWordCount * 2;
  const dbStartOffset = textDataOffset + textWordCount * 2;

  const dbOffsets: number[] = [];
  let runningDbOffset = dbStartOffset;
  for (let cat = 0; cat < 16; cat++) {
    dbOffsets.push(runningDbOffset);
    runningDbOffset += (dbCounts[cat] ?? 0) * (DB_RECORD_SIZES[cat] ?? 0);
  }

  const mapDataBase = runningDbOffset;
  if (mapDataBase + mapDataSize > buf.length) {
    throw new Error(
      `Corrupt Dungeon.dat: mapDataBase(${mapDataBase}) + mapDataSize(${mapDataSize}) > length(${buf.length})`
    );
  }

  const objList: number[] = [];
  for (let i = 0; i < objListWordCount; i++) {
    objList.push(readU16BE(buf, objListOffset + i * 2));
  }

  const textWords: number[] = [];
  for (let i = 0; i < textWordCount; i++) {
    textWords.push(readU16BE(buf, textDataOffset + i * 2));
  }

  const followObjectChain = (headObjId: number): RawChainEntry[] => {
    const entries: RawChainEntry[] = [];
    let cur = headObjId;
    let safety = 0;
    while (cur !== 0xfffe && cur !== 0xffff && safety++ < 64) {
      const pos = ((cur >> 14) & 0x03) as Direction;
      const category = (cur >> 10) & 0x0f;
      const index = cur & 0x03ff;
      const catCount = dbCounts[category] ?? 0;
      const recSize = DB_RECORD_SIZES[category] ?? 0;
      if (recSize === 0 || index >= catCount) {
        break;
      }
      entries.push({ pos, category, index });
      const recOff = (dbOffsets[category] ?? 0) + index * recSize;
      cur = readU16BE(buf, recOff);
    }
    return entries;
  };

  let objListCursor = 0;
  const champions: Record<string, ChampionDefinition> = {};
  const levels: DungeonLevel[] = [];

  for (const desc of mapDescs) {
    // Store raw chains per (x, y) first so Champion Mirrors can look up adjacent corridor Champion texts
    const rawTileBytes: number[][] = Array.from({ length: desc.height }, () =>
      new Array<number>(desc.width).fill(0)
    );
    const tileChains: RawChainEntry[][][] = Array.from({ length: desc.height }, () =>
      Array.from({ length: desc.width }, () => [])
    );

    for (let x = 0; x < desc.width; x++) {
      for (let y = 0; y < desc.height; y++) {
        const byteVal = buf[mapDataBase + desc.mapOffset + x * desc.height + y] ?? 0;
        rawTileBytes[y]![x] = byteVal;
        if ((byteVal & 0x10) !== 0 && objListCursor < objList.length) {
          const headId = objList[objListCursor++] ?? 0xfffe;
          tileChains[y]![x] = followObjectChain(headId);
        }
      }
    }

    const tiles: Tile[][] = Array.from({ length: desc.height }, () =>
      new Array<Tile>(desc.width)
    );

    for (let y = 0; y < desc.height; y++) {
      for (let x = 0; x < desc.width; x++) {
        const byteVal = rawTileBytes[y]![x] ?? 0;
        const typeCode = (byteVal >> 5) & 0x07;
        const lowFlags = byteVal & 0x0f;
        const tileType: TileType = RAW_TILE_TYPES[typeCode] ?? 'WALL';
        const chain = tileChains[y]![x] ?? [];

        const wallFeatures: WallFeature[] = [];
        const actuators: Actuator[] = [];
        const itemNames: string[] = [];

        let doorState: Tile['door'];
        if (tileType === 'DOOR') {
          const rawDoorState = lowFlags & 0x07;
          const progress: DoorProgress =
            rawDoorState <= 5 ? (rawDoorState as DoorProgress) : 4;
          const doorEntry = chain.find((e) => e.category === 0);
          let w1 = 0x20;
          if (doorEntry) {
            w1 = readU16BE(buf, (dbOffsets[0] ?? 0) + doorEntry.index * 4 + 2);
          }
          const rawMaterial = w1 & 0x03;
          const material: DoorMaterial =
            rawMaterial === 0
              ? 'IRON_GRATE'
              : rawMaterial === 1
                ? 'WOODEN'
                : rawMaterial === 2
                  ? 'METAL'
                  : 'RA_MAGIC';
          doorState = {
            // In FTL Dungeon.dat, bit 3 (0x08)=1 means North-South passage (West/East walls -> WEST_EAST door slab);
            // bit 3 (0x08)=0 means West-East passage (North/South walls -> NORTH_SOUTH door slab).
            orientation: (lowFlags & 0x08) !== 0 ? 'WEST_EAST' : 'NORTH_SOUTH',
            material,
            progress,
            targetProgress: progress === 0 ? 0 : 4,
            hasButton: (w1 & 0x40) !== 0,
            fireballDestructible: (w1 & 0x80) !== 0,
            bashable: (w1 & 0x100) !== 0,
            opensHorizontally: (w1 & 0x20) === 0
          };
        }

        let pitState: Tile['pit'];
        if (tileType === 'PIT') {
          pitState = {
            open: (lowFlags & 0x08) !== 0,
            illusionary: (lowFlags & 0x01) !== 0,
            hiddenOutline: (lowFlags & 0x04) !== 0
          };
        }

        let stairsState: Tile['stairs'];
        if (tileType === 'STAIRS') {
          stairsState = {
            direction: (lowFlags & 0x04) !== 0 ? 'UP' : 'DOWN',
            orientation: (lowFlags & 0x08) !== 0 ? 'WEST_EAST' : 'NORTH_SOUTH'
          };
        }

        let teleporterState: Tile['teleporter'];
        if (tileType === 'TELEPORTER') {
          const tpEntry = chain.find((e) => e.category === 1);
          let w1 = 0;
          let w2 = 0;
          if (tpEntry) {
            const tpOff = (dbOffsets[1] ?? 0) + tpEntry.index * 6;
            w1 = readU16BE(buf, tpOff + 2);
            w2 = readU16BE(buf, tpOff + 4);
          }
          const scopeCode = (w1 >> 13) & 0x03;
          const scopes = ['OBJECTS', 'MONSTERS', 'PARTY_AND_OBJECTS', 'ALL'] as const;
          teleporterState = {
            active: (lowFlags & 0x08) !== 0,
            visibleHaze: (lowFlags & 0x04) !== 0,
            destX: w1 & 0x1f,
            destY: (w1 >> 5) & 0x1f,
            rotation: ((w1 >> 10) & 0x03) as Direction,
            absoluteRotation: ((w1 >> 12) & 0x01) !== 0,
            scope: scopes[scopeCode] ?? 'ALL',
            playSound: ((w1 >> 15) & 0x01) !== 0,
            destLevel: (w2 >> 8) & 0xff
          };
        }

        let trickWallState: Tile['trickWall'];
        if (tileType === 'TRICK_WALL') {
          trickWallState = {
            open: (lowFlags & 0x04) !== 0,
            illusionary: (lowFlags & 0x01) !== 0
          };
        }

        for (const entry of chain) {
          if (entry.category === 2 && tileType === 'WALL') {
            const txtOff = (dbOffsets[2] ?? 0) + entry.index * 4;
            const w1 = readU16BE(buf, txtOff + 2);
            const visible = (w1 & 0x01) !== 0;
            const decoded = decodeDmText(textWords, w1 >> 3);
            if (visible && decoded) {
              wallFeatures.push({
                face: entry.pos,
                kind: 'INSCRIPTION',
                text: decoded
              });
            }
          } else if (entry.category === 3) {
            const actOff = (dbOffsets[3] ?? 0) + entry.index * 8;
            const w1 = readU16BE(buf, actOff + 2);
            const w2 = readU16BE(buf, actOff + 4);
            const w3 = readU16BE(buf, actOff + 6);

            const rawType = w1 & 0x7f;
            const value = (w1 >> 7) & 0x1ff;
            const onceOnly = ((w2 >> 2) & 0x01) !== 0;
            const action = ACTION_MAP[(w2 >> 3) & 0x03] ?? 'TOGGLE';
            const playSound = ((w2 >> 6) & 0x01) !== 0;
            const delayTicks = (w2 >> 7) & 0x0f;
            const isLocal = ((w2 >> 11) & 0x01) !== 0;
            const graphicIndex = (w2 >> 12) & 0x0f;
            const targetX = (w3 >> 6) & 0x1f;
            const targetY = (w3 >> 11) & 0x1f;

            actuators.push({
              id: entry.index,
              face: entry.pos,
              rawType,
              value,
              action,
              targetLevel: desc.id,
              targetX,
              targetY,
              delayTicks,
              onceOnly,
              triggered: false,
              playSound,
              graphicIndex,
              isLocal
            });

            if (tileType === 'WALL' && rawType === 127) {
              // Champion Mirror! Look up Champion db2 text on adjacent corridor tile in direction entry.pos
              const delta = DIRECTION_DELTAS[entry.pos];
              const adjX = x + delta.dx;
              const adjY = y + delta.dy;
              const adjChain =
                adjX >= 0 && adjX < desc.width && adjY >= 0 && adjY < desc.height
                  ? (tileChains[adjY]?.[adjX] ?? [])
                  : [];
              const champTextEntry = adjChain.find((e) => e.category === 2);

              const startingGear: string[] = [];
              for (const gearEntry of chain) {
                if (gearEntry.pos === entry.pos && gearEntry.category === 5) {
                  const wpnWord = readU16BE(buf, (dbOffsets[5] ?? 0) + gearEntry.index * 4 + 2);
                  const wpnType = wpnWord & 0x7f;
                  startingGear.push(WEAPON_NAMES_SAMPLE[wpnType] ?? `WEAPON_${wpnType}`);
                } else if (gearEntry.pos === entry.pos && gearEntry.category === 6) {
                  const armWord = readU16BE(buf, (dbOffsets[6] ?? 0) + gearEntry.index * 4 + 2);
                  startingGear.push(`ARMOR_${armWord & 0x7f}`);
                }
              }

              if (champTextEntry) {
                const txtW1 = readU16BE(buf, (dbOffsets[2] ?? 0) + champTextEntry.index * 4 + 2);
                const rawChampStr = decodeDmText(textWords, txtW1 >> 3);
                const parsedChamp = parseChampionTextRecord(rawChampStr, value, startingGear);
                if (parsedChamp) {
                  champions[parsedChamp.id] = parsedChamp;
                  wallFeatures.push({
                    face: entry.pos,
                    kind: 'CHAMPION_MIRROR',
                    championId: parsedChamp.id,
                    portraitIndex: value,
                    actuatorId: entry.index
                  });
                }
              }
            } else if (tileType === 'WALL' && graphicIndex > 0) {
              // Check if wall holds a torch weapon on this same face -> Torch Sconce!
              const hasTorchItem = chain.some((e) => {
                if (e.pos !== entry.pos || e.category !== 5) {
                  return false;
                }
                const wpnWord = readU16BE(buf, (dbOffsets[5] ?? 0) + e.index * 4 + 2);
                return (wpnWord & 0x7f) === 2;
              });

              if (hasTorchItem) {
                wallFeatures.push({
                  face: entry.pos,
                  kind: 'SCONCE',
                  hasTorch: true,
                  actuatorId: entry.index,
                  graphicIndex
                });
              } else {
                wallFeatures.push({
                  face: entry.pos,
                  kind: 'BUTTON',
                  actuatorId: entry.index,
                  graphicIndex
                });
              }
            }
          } else if (entry.category === 5) {
            const wpnWord = readU16BE(buf, (dbOffsets[5] ?? 0) + entry.index * 4 + 2);
            const wpnType = wpnWord & 0x7f;
            itemNames.push(WEAPON_NAMES_SAMPLE[wpnType] ?? `WEAPON_${wpnType}`);
          } else if (entry.category === 7) {
            itemNames.push('SCROLL');
          } else if (entry.category === 8) {
            itemNames.push('POTION');
          } else if (entry.category === 9) {
            itemNames.push('CHEST');
          }
        }

        tiles[y]![x] = {
          type: tileType,
          rawFlags: lowFlags,
          door: doorState,
          pit: pitState,
          stairs: stairsState,
          teleporter: teleporterState,
          trickWall: trickWallState,
          wallFeatures,
          actuators,
          itemNames
        };
      }
    }

    levels.push({
      id: desc.id,
      name: desc.id === 0 ? 'Hall of Champions' : `Dungeon Level ${desc.id}`,
      width: desc.width,
      height: desc.height,
      offsetX: desc.offsetX,
      offsetY: desc.offsetY,
      depth: desc.depth,
      ambientLight: desc.id === 0 ? 5 : 1,
      tiles
    });
  }

  return {
    source: 'AMIGA_DAT',
    dungeon: {
      campaignId: 'dm1-amiga-v2',
      title: 'Dungeon Master (1988 Amiga)',
      seed,
      startLevel: 0,
      startX,
      startY,
      startFacing,
      levels,
      champions
    }
  };
}
