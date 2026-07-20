import type { BattleUnit, BoardPosition } from '../types/battle';
import { FRONT_POSITIONS, getUnitAt } from './battleState';

/** 副攻撃の与ダメ倍率（ATTRIBUTE_SPEC §4.5） */
export const DUAL_SECONDARY_DAMAGE_RATIO = 0.5;

export function isDualTargetable(unit: BattleUnit): boolean {
  return unit.currentBp > 0 && unit.position !== 'defeated' && !unit.stealthActive;
}

/** 主対象でもう一方の敵前衛スロット */
export function getDualSecondaryPosition(
  mainTargetPosition: BoardPosition,
): BoardPosition | null {
  if (mainTargetPosition === 'frontLeft') return 'frontRight';
  if (mainTargetPosition === 'frontRight') return 'frontLeft';
  return null;
}

export function getDualSecondaryTarget(
  mainTargetPosition: BoardPosition,
  enemyField: BattleUnit[],
): { position: BoardPosition; unit: BattleUnit } | null {
  const position = getDualSecondaryPosition(mainTargetPosition);
  if (!position) return null;
  const unit = getUnitAt(enemyField, position);
  if (!unit || !isDualTargetable(unit)) return null;
  return { position, unit };
}

export function calcDualSecondaryDamage(attackerBp: number): number {
  return Math.round(attackerBp * DUAL_SECONDARY_DAMAGE_RATIO);
}

/** 前衛に生存敵がいれば両攻撃可能 */
export function getDualTargets(enemyField: BattleUnit[]): BoardPosition[] {
  return FRONT_POSITIONS.filter((position) => {
    const target = getUnitAt(enemyField, position);
    return target != null && isDualTargetable(target);
  });
}
