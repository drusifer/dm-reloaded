import type { RuneId, TimedEffectKind } from '../engine/types';

export type RuneTier = 'POWER' | 'ELEMENTAL' | 'FORM' | 'CLASS';
export interface RuneDefinition { readonly id: RuneId; readonly name: string; readonly tier: RuneTier; readonly mana: number }

const tier = (ids: readonly RuneId[], runeTier: RuneTier, mana: number): readonly RuneDefinition[] =>
  ids.map((id) => ({ id, name: id === 'POWER_EE' ? 'EE' : id, tier: runeTier, mana }));

export const MAGIC_RUNES: readonly RuneDefinition[] = [
  ...(['LO', 'UM', 'ON', 'POWER_EE', 'PAL', 'MON'] as const).map((id, index) => ({
    id, name: id === 'POWER_EE' ? 'EE' : id, tier: 'POWER' as const, mana: index + 1
  })),
  ...tier(['YA', 'VI', 'OH', 'FUL', 'DES', 'ZO'], 'ELEMENTAL', 2),
  ...tier(['VEN', 'EW', 'KATH', 'IR', 'BRO', 'GOR'], 'FORM', 2),
  ...tier(['KU', 'ROS', 'DAIN', 'NETA', 'RA', 'SAR'], 'CLASS', 2)
];

export interface PotionRecipe { readonly id: string; readonly rune: RuneId; readonly effect: 'HEALTH' | 'STAMINA' | 'MANA' | 'STRENGTH' | 'CURE_POISON' }
export const POTION_RECIPES: readonly PotionRecipe[] = [
  { id: 'VI', rune: 'VI', effect: 'HEALTH' }, { id: 'YA', rune: 'YA', effect: 'STAMINA' },
  { id: 'EE', rune: 'POWER_EE', effect: 'MANA' }, { id: 'KU', rune: 'KU', effect: 'STRENGTH' },
  { id: 'BRO', rune: 'BRO', effect: 'CURE_POISON' }
];

export interface SpellRecipe { readonly id: string; readonly suffix: readonly RuneId[]; readonly effect?: TimedEffectKind }
export const SPELL_RECIPES: readonly SpellRecipe[] = [
  { id: 'FIREBALL', suffix: ['FUL', 'IR'] }, { id: 'WEAKEN', suffix: ['DES', 'EW'] },
  { id: 'OPEN_DOOR', suffix: ['ZO'] }, { id: 'SHIELD', suffix: ['YA', 'IR'], effect: 'SHIELD' },
  { id: 'LIGHT', suffix: ['OH', 'IR', 'RA'], effect: 'LIGHT' }
];
