/**
 * Clean-room starter CampaignProvider for deterministic headless testing and zero-asset fallback.
 *
 * TLDR:
 *   Builds a self-contained 3-level Dungeon Master starter campaign (Level 0 Hall of
 *   Champions with 4 hero mirrors + starting gear + torch sconce + fountain, and Level 1
 *   Entry Puzzles with alcove key/scroll, floor chest/food, keyhole lock, Vi Altar,
 *   iron grate, pressure plate, pit, fake wall, and teleporter).
 */

import type {
  CampaignBundle,
  CampaignProvider,
  ChampionDefinition,
  DungeonLevel,
  ItemInstance,
  ItemInstanceId,
  Tile,
  TileType
} from '../engine/types';
import { findItemDefByLegacyName } from './itemCatalog';

function makeTile(type: TileType, overrides: Partial<Tile> = {}): Tile {
  return {
    type,
    rawFlags: 0,
    wallFeatures: [],
    actuators: [],
    itemNames: [],
    ...overrides
  };
}

function makeCleanItem(
  instanceId: string,
  legacyName: string,
  extra: Partial<ItemInstance> = {}
): ItemInstance {
  const def = findItemDefByLegacyName(legacyName);
  return {
    instanceId,
    defId: def.defId,
    iconIndex: def.iconIndex,
    name: def.name,
    charges: def.name === 'TORCH' ? 15 : def.name === 'WATERSKIN' ? 3 : 0,
    ...extra
  };
}

const CLEAN_ROOM_CHAMPIONS: Readonly<Record<string, ChampionDefinition>> = {
  iaido: {
    id: 'iaido',
    name: 'IAIDO RUYITO',
    title: 'CHIBURI',
    gender: 'M',
    portraitIndex: 0,
    maxHealth: 48,
    maxStamina: 65,
    maxMana: 11,
    attributes: {
      luck: 40,
      strength: 43,
      dexterity: 55,
      wisdom: 40,
      vitality: 35,
      antiMagic: 45,
      antiFire: 40
    },
    skills: [2, 3, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    startingItems: ['SAMURAI SWORD', 'GHI', 'GHI TROUSERS']
  },
  zed: {
    id: 'zed',
    name: 'ZED',
    title: 'DUKE OF BANVILLE',
    gender: 'M',
    portraitIndex: 1,
    maxHealth: 60,
    maxStamina: 60,
    maxMana: 10,
    attributes: {
      luck: 50,
      strength: 40,
      dexterity: 40,
      wisdom: 40,
      vitality: 50,
      antiMagic: 40,
      antiFire: 40
    },
    skills: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    startingItems: ['TORCH', 'MAIL AKETON', 'BLUE PANTS', 'HOSEN', 'BREAD', 'WATERSKIN']
  },
  chani: {
    id: 'chani',
    name: 'CHANI',
    title: 'SAYYADINA SIHAYA',
    gender: 'F',
    portraitIndex: 2,
    maxHealth: 47,
    maxStamina: 67,
    maxMana: 17,
    attributes: {
      luck: 45,
      strength: 37,
      dexterity: 47,
      wisdom: 57,
      vitality: 37,
      antiMagic: 47,
      antiFire: 37
    },
    skills: [0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 2, 0, 2, 0],
    startingItems: ['MOONSTONE', 'SILK SHIRT', 'SANDALS']
  },
  elija: {
    id: 'elija',
    name: 'ELIJA',
    title: 'LION OF YAITOPYA',
    gender: 'M',
    portraitIndex: 3,
    maxHealth: 60,
    maxStamina: 58,
    maxMana: 22,
    attributes: {
      luck: 42,
      strength: 42,
      dexterity: 40,
      wisdom: 52,
      vitality: 36,
      antiMagic: 53,
      antiFire: 40
    },
    skills: [1, 0, 1, 0, 0, 0, 0, 0, 2, 2, 1, 0, 1, 0, 0, 0],
    startingItems: ['MAGICAL BOX', 'ROBE', 'SANDALS', 'APPLE']
  }
};

export function createCleanRoomBundle(): CampaignBundle {
  const initialItems: Record<ItemInstanceId, ItemInstance> = {};
  const register = (inst: ItemInstance): ItemInstanceId => {
    initialItems[inst.instanceId] = inst;
    return inst.instanceId;
  };

  const scroll1 = register(
    makeCleanItem('cr_scroll_1', 'SCROLL', {
      iconIndex: 31,
      scrollText: ['THROW OBJECTS THROUGH', 'IRON GRATES TO TRIGGER', 'DISTANT PLATES.']
    })
  );
  const ironKey1 = register(makeCleanItem('cr_key_iron', 'IRON KEY'));
  const apple1 = register(makeCleanItem('cr_apple_1', 'APPLE'));
  const dagger1 = register(makeCleanItem('cr_dagger_1', 'DAGGER'));
  const flaskEmpty = register(makeCleanItem('cr_flask_empty', 'EMPTY FLASK'));
  const chest1 = register(
    makeCleanItem('cr_chest_1', 'CHEST', {
      contents: [apple1, flaskEmpty]
    })
  );

  // Level 0: 8x8 Hall of Champions
  const lvl0Tiles: Tile[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => makeTile('WALL'))
  );

  for (let x = 1; x <= 5; x++) {
    lvl0Tiles[2]![x] = makeTile('FLOOR');
  }
  // Place starter Chest + Dagger on floor at (2, 2) NE/SE quadrants for immediate inventory/pickup testing
  lvl0Tiles[2]![2] = makeTile('FLOOR', {
    itemNames: ['CHEST', 'DAGGER'],
    floorItems: { 0: [], 1: [chest1], 2: [dagger1], 3: [] }
  });

  lvl0Tiles[3]![5] = makeTile('DOOR', {
    door: {
      orientation: 'WEST_EAST',
      material: 'WOODEN',
      progress: 4,
      targetProgress: 4,
      hasButton: true,
      bashable: true,
      fireballDestructible: true
    }
  });
  lvl0Tiles[4]![5] = makeTile('FLOOR');
  lvl0Tiles[5]![5] = makeTile('STAIRS', {
    stairs: { direction: 'DOWN', orientation: 'WEST_EAST' }
  });

  // Inscription on North wall at (1, 1) facing South (face 2)
  lvl0Tiles[1]![1] = makeTile('WALL', {
    wallFeatures: [{ face: 2, kind: 'INSCRIPTION', text: 'HALL OF CHAMPIONS' }]
  });

  // Wall Fountain on West wall at (0, 2) facing East (face 1)
  lvl0Tiles[2]![0] = makeTile('WALL', {
    wallFeatures: [{ face: 1, kind: 'FOUNTAIN', ornamentId: 59 }]
  });

  // 4 Champion Mirrors on North walls x=2..5, y=1 (face 2 = South)
  const mirrorOrder = ['iaido', 'zed', 'chani', 'elija'] as const;
  mirrorOrder.forEach((champId, idx) => {
    lvl0Tiles[1]![2 + idx] = makeTile('WALL', {
      wallFeatures: [
        {
          face: 2,
          kind: 'CHAMPION_MIRROR',
          championId: champId,
          portraitIndex: idx,
          ornamentId: 43
        }
      ]
    });
  });

  // Lit starter Torch sconce on East wall at (6, 4) facing West (face 3)
  lvl0Tiles[4]![6] = makeTile('WALL', {
    wallFeatures: [{ face: 3, kind: 'SCONCE', hasTorch: true, graphicIndex: 1, ornamentId: 46 }]
  });

  // Level 1: 8x8 Entry Puzzles
  const lvl1Tiles: Tile[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => makeTile('WALL'))
  );

  lvl1Tiles[5]![5] = makeTile('STAIRS', {
    stairs: { direction: 'UP', orientation: 'WEST_EAST' }
  });
  lvl1Tiles[4]![5] = makeTile('FLOOR');

  // West wall at (4, 4) facing East (face 1): Square Alcove holding Iron Key + Scroll!
  lvl1Tiles[4]![4] = makeTile('WALL', {
    itemNames: ['IRON KEY', 'SCROLL'],
    wallFeatures: [{ face: 1, kind: 'ALCOVE', ornamentId: 1 }],
    wallItems: { 0: [], 1: [ironKey1, scroll1], 2: [], 3: [] }
  });

  // Vi Altar on South wall at (5, 6) facing North (face 0) for reviving fallen Champion Bones!
  lvl1Tiles[6]![5] = makeTile('WALL', {
    wallFeatures: [{ face: 0, kind: 'VI_ALTAR', ornamentId: 3 }]
  });

  lvl1Tiles[3]![5] = makeTile('DOOR', {
    door: {
      orientation: 'WEST_EAST',
      material: 'IRON_GRATE',
      progress: 4,
      targetProgress: 4,
      hasButton: false,
      bashable: false,
      fireballDestructible: false
    }
  });

  // Wall button + Iron Keyhole on East wall at (6, 4) facing West (face 3) toggling iron grate at (5, 3)
  lvl1Tiles[4]![6] = makeTile('WALL', {
    wallFeatures: [
      { face: 3, kind: 'BUTTON', actuatorId: 100, graphicIndex: 2, ornamentId: 49 },
      {
        face: 3,
        kind: 'KEYHOLE',
        actuatorId: 101,
        graphicIndex: 3,
        ornamentId: 19,
        requiredItemIcon: 176, // IRON KEY
        consumesKey: true,
        unlocked: false
      }
    ],
    actuators: [
      {
        id: 100,
        face: 3,
        rawType: 1,
        value: 0,
        action: 'TOGGLE',
        targetLevel: 1,
        targetX: 5,
        targetY: 3,
        delayTicks: 0,
        onceOnly: false,
        triggered: false,
        playSound: true,
        graphicIndex: 2,
        isLocal: false
      },
      {
        id: 101,
        face: 3,
        rawType: 4,
        value: 176,
        action: 'SET', // SET opens a door (targetProgress 0); CLEAR would close it
        targetLevel: 1,
        targetX: 5,
        targetY: 3,
        delayTicks: 0,
        onceOnly: true,
        triggered: false,
        playSound: true,
        graphicIndex: 3,
        isLocal: false
      }
    ]
  });

  // Floor pressure plate at (5, 2) that opens/toggles iron grate at (5, 3) when an item is thrown through the grate onto (5, 2)!
  lvl1Tiles[2]![5] = makeTile('FLOOR', {
    actuators: [
      {
        id: 102,
        face: 0,
        rawType: 7, // Party or Object pressure plate
        value: 0,
        action: 'SET', // SET opens a door (targetProgress 0); CLEAR would close it
        targetLevel: 1,
        targetX: 5,
        targetY: 3,
        delayTicks: 0,
        onceOnly: false,
        triggered: false,
        playSound: true,
        graphicIndex: 1,
        isLocal: false
      }
    ]
  });

  lvl1Tiles[2]![4] = makeTile('PIT', {
    pit: { open: true, illusionary: false, hiddenOutline: false }
  });
  lvl1Tiles[1]![5] = makeTile('TRICK_WALL', {
    trickWall: { open: false, illusionary: true }
  });
  lvl1Tiles[2]![3] = makeTile('TELEPORTER', {
    teleporter: {
      active: true,
      visibleHaze: true,
      destLevel: 1,
      destX: 5,
      destY: 4,
      rotation: 0,
      absoluteRotation: true,
      scope: 'ALL',
      playSound: true
    }
  });
  lvl1Tiles[2]![2] = makeTile('FLOOR');

  // Level 2: Pit landing room
  const lvl2Tiles: Tile[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => makeTile('WALL'))
  );
  lvl2Tiles[2]![4] = makeTile('FLOOR');

  const levels: DungeonLevel[] = [
    {
      id: 0,
      name: 'Hall of Champions',
      width: 8,
      height: 8,
      offsetX: 0,
      offsetY: 0,
      depth: 0,
      ambientLight: 5,
      tiles: lvl0Tiles
    },
    {
      id: 1,
      name: 'Entry Puzzles',
      width: 8,
      height: 8,
      offsetX: 0,
      offsetY: 0,
      depth: 1,
      ambientLight: 1,
      tiles: lvl1Tiles
    },
    {
      id: 2,
      name: 'The Lower Cellar',
      width: 8,
      height: 8,
      offsetX: 0,
      offsetY: 0,
      depth: 2,
      ambientLight: 0,
      tiles: lvl2Tiles
    }
  ];

  return {
    source: 'CLEAN_ROOM',
    dungeon: {
      campaignId: 'clean-room-starter',
      title: 'Dungeon Master (Clean-Room Slice)',
      seed: 99,
      startLevel: 0,
      startX: 1,
      startY: 2,
      startFacing: 1,
      levels,
      champions: CLEAN_ROOM_CHAMPIONS,
      initialItems
    }
  };
}

export class CleanRoomCampaignProvider implements CampaignProvider {
  public async loadCampaign(): Promise<CampaignBundle> {
    return createCleanRoomBundle();
  }
}
