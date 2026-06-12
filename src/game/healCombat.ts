import type { BattleUnit, BoardPosition } from '../types/battle';
import { getUnitAt, isAlive } from './battleState';

export function canReceiveHeal(unit: BattleUnit): boolean {
  if (!isAlive(unit)) return false;
  const wounded = unit.currentBp < unit.maxBp;
  if (unit.poisonStacks.length > 0) {
    return unit.poisonDotDamageReceived;
  }
  return wounded;
}

/** 回復可能な味方（ダメージを受けた味方、または毒 DoT 後の毒状態の味方） */
export function getHealTargets(
  field: BattleUnit[],
  actorPosition: BoardPosition,
): BoardPosition[] {
  const actor = getUnitAt(field, actorPosition);
  if (!actor || actor.attribute !== 'heal' || actor.healUsesRemaining <= 0) {
    return [];
  }
  return field
    .filter((u) => canReceiveHeal(u))
    .map((u) => u.position)
    .filter((p): p is BoardPosition => p !== 'defeated');
}

export function canUseHealAction(
  field: BattleUnit[],
  actorPosition: BoardPosition,
): boolean {
  return getHealTargets(field, actorPosition).length > 0;
}

export function calcHealAmount(healer: BattleUnit, target: BattleUnit): number {
  if (!isAlive(target) || target.currentBp >= target.maxBp) return 0;
  return Math.min(healer.currentBp, target.maxBp - target.currentBp);
}
