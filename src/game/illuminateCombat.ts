import type { BattleUnit, BoardPosition } from '../types/battle';
import { getUnitAt, isAlive } from './battleState';

/** 照1体が照らせる敵忍（ステルス中・未照らし） */
export function getIlluminateTargets(
  actor: BattleUnit,
  enemyField: BattleUnit[],
): BoardPosition[] {
  if (!isAlive(actor) || actor.attribute !== 'illuminate') return [];
  return enemyField
    .filter(
      (u) =>
        isAlive(u) &&
        u.attribute === 'ninja' &&
        u.stealthActive &&
        !actor.illuminatedNinjaCardIds.includes(u.cardId),
    )
    .map((u) => u.position)
    .filter((p): p is BoardPosition => p !== 'defeated');
}

export function canUseIlluminateAction(
  actor: BattleUnit,
  enemyField: BattleUnit[],
): boolean {
  return getIlluminateTargets(actor, enemyField).length > 0;
}

export function getIlluminateSelectionHint(
  actor: BattleUnit,
  enemyField: BattleUnit[],
  includeMeleeOption: boolean,
): string {
  if (includeMeleeOption) {
    return '敵忍をタップで照らす、敵前衛をタップで近接攻撃\nそれ以外をタップで解除';
  }
  return '敵忍をタップして照らす';
}

/** 照らし対象が有効か（行動確定時の検証） */
export function isValidIlluminateTarget(
  actor: BattleUnit,
  enemyField: BattleUnit[],
  targetPosition: BoardPosition,
): boolean {
  const target = getUnitAt(enemyField, targetPosition);
  if (!target) return false;
  return getIlluminateTargets(actor, enemyField).includes(targetPosition);
}
