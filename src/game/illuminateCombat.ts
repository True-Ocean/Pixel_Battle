import type { BattleUnit, BoardPosition } from '../types/battle';
import { getUnitAt, isAlive } from './battleState';

/** 照が照射できる敵（生存・潜伏中忍は解除対象、他は目眩対象） */
export function getIlluminateTargets(
  actor: BattleUnit,
  enemyField: BattleUnit[],
): BoardPosition[] {
  if (!isAlive(actor) || actor.attribute !== 'illuminate') return [];
  if (actor.illuminateUsesRemaining <= 0) return [];
  return enemyField
    .filter((u) => isAlive(u))
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
  _actor: BattleUnit,
  _enemyField: BattleUnit[],
  includeMeleeOption: boolean,
): string {
  if (includeMeleeOption) {
    return '再タップで懐中電灯、敵前衛タップで近接攻撃\nそれ以外をタップで解除';
  }
  return '照らす敵をタップ';
}

export function getIlluminateFlashlightHint(): string {
  return '照らす敵をタップ';
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

/** 潜伏中の忍への照射か（目眩なし・解除のみ） */
export function isStealthNinjaIlluminateTarget(target: BattleUnit): boolean {
  return (
    isAlive(target) &&
    target.attribute === 'ninja' &&
    target.stealthActive
  );
}
