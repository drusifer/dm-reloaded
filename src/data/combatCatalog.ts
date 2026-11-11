/** Immutable Sprint 3 combat action definitions. */

import type { ItemDef } from '../engine/types';

export type CombatActionId = 'SWING' | 'SHOOT';

export interface CombatActionDefinition {
  readonly id: CombatActionId;
  readonly label: string;
  readonly kind: 'MELEE' | 'RANGED';
  readonly staminaCost: number;
  readonly cooldownTicks: number;
  readonly baseDamage: number;
  readonly subskill: number;
  readonly experience: number;
  readonly ammunitionNames: readonly string[];
}

export const COMBAT_ACTIONS: Readonly<Record<CombatActionId, CombatActionDefinition>> = {
  SWING: {
    id: 'SWING',
    label: 'SWING',
    kind: 'MELEE',
    staminaCost: 2,
    cooldownTicks: 3,
    baseDamage: 5,
    subskill: 0,
    experience: 8,
    ammunitionNames: []
  },
  SHOOT: {
    id: 'SHOOT',
    label: 'SHOOT',
    kind: 'RANGED',
    staminaCost: 2,
    cooldownTicks: 4,
    baseDamage: 6,
    subskill: 4,
    experience: 10,
    ammunitionNames: ['ARROW', 'SLAYER']
  }
};

const RANGED_WEAPONS = new Set(['BOW', 'CROSSBOW']);

export function actionSupportsItem(action: CombatActionDefinition, item: ItemDef): boolean {
  if (item.category !== 'WEAPON') return false;
  return action.kind === 'RANGED' ? RANGED_WEAPONS.has(item.name) : !RANGED_WEAPONS.has(item.name);
}
