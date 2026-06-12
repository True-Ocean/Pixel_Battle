import type { BattleUnit, BoardPosition } from '../types/battle';
import {
  BACK_POSITIONS,
  FRONT_POSITIONS,
  getUnitAt,
  isAlive,
  isBackPosition,
  isFrontPosition,
} from './battleState';

export function isBowTargetable(unit: BattleUnit): boolean {
  return isAlive(unit) && !unit.stealthActive;
}

/** 弓攻撃の有効ターゲット（ATTRIBUTE_SPEC §4.4） */
export function getBowTargets(
  ownField: BattleUnit[],
  enemyField: BattleUnit[],
  actorPosition: BoardPosition,
): BoardPosition[] {
  const actor = getUnitAt(ownField, actorPosition);
  if (!actor || actor.attribute !== 'bow') return [];

  const candidatePositions = isBackPosition(actorPosition)
    ? ([...FRONT_POSITIONS, ...BACK_POSITIONS] as const)
    : BACK_POSITIONS;

  return candidatePositions.filter((position) => {
    const target = getUnitAt(enemyField, position);
    return target != null && isBowTargetable(target);
  });
}

/** 弓ダメージ倍率（1段先100%・2段先50%） */
export function getBowDamageRatio(
  actorPosition: BoardPosition,
  targetPosition: BoardPosition,
): number {
  if (isBackPosition(actorPosition)) {
    return isFrontPosition(targetPosition) ? 1 : 0.5;
  }
  return 1;
}

export function calcBowDamage(
  attackerBp: number,
  actorPosition: BoardPosition,
  targetPosition: BoardPosition,
): number {
  return Math.round(attackerBp * getBowDamageRatio(actorPosition, targetPosition));
}

/** 前衛の弓が近接したときの与ダメ倍率（ATTRIBUTE_SPEC §4.4） */
export const BOW_FRONT_MELEE_DAMAGE_RATIO = 0.5;

export function calcBowMeleeDamage(
  attacker: BattleUnit,
  actorPosition: BoardPosition,
): number {
  if (attacker.attribute !== 'bow' || !isFrontPosition(actorPosition)) {
    return attacker.currentBp;
  }
  return Math.round(attacker.currentBp * BOW_FRONT_MELEE_DAMAGE_RATIO);
}
