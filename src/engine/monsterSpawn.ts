/** Pure conversion of monster group specs into runtime combat targets. */

import { monsterTypeDef } from '../data/monsterCatalog';
import type { CombatTargetState, MonsterGroupSpec } from './types';

export function laneOfSubcell(subcell: number): 'LEFT' | 'RIGHT' {
  return subcell % 2 === 0 ? 'LEFT' : 'RIGHT';
}

/** Expand one group into one target per living creature; unknown types are dropped safely. */
export function expandMonsterGroup(spec: MonsterGroupSpec, nowTick = 0): CombatTargetState[] {
  const def = monsterTypeDef(spec.typeId);
  if (!def) return [];
  const count = Math.min(def.maxGroup, spec.healths.length, 4);
  const out: CombatTargetState[] = [];
  for (let i = 0; i < count; i++) {
    const subcell = i as 0 | 1 | 2 | 3;
    const raw = spec.healths[i] ?? def.health;
    const health = Math.max(1, Math.min(def.health, raw > 0 ? raw : def.health));
    out.push({
      id: `${spec.id}_${i}`,
      level: spec.level,
      x: spec.x,
      y: spec.y,
      lane: laneOfSubcell(subcell),
      traits: def.traits,
      maxHealth: def.health,
      health,
      defeated: false,
      monster: {
        typeId: def.typeId,
        groupId: spec.id,
        subcell,
        facing: spec.facing,
        nextMoveTick: nowTick,
        nextAttackTick: nowTick,
        awake: false,
        lastX: spec.x,
        lastY: spec.y
      }
    });
  }
  return out;
}

export function expandMonsterGroups(specs: readonly MonsterGroupSpec[] | undefined): CombatTargetState[] {
  return (specs ?? []).flatMap((spec) => expandMonsterGroup(spec));
}
