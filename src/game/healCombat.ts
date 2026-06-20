import type { BattleUnit, BoardPosition } from '../types/battle';
import { getUnitAt, isAlive } from './battleState';
import { isFrozen } from './iceCombat';

/** 毒 DoT 後の毒スタック（癒で解消可能なデバフ） */
export function hasHealablePoison(unit: BattleUnit): boolean {
  return unit.poisonStacks.length > 0 && unit.poisonDotDamageReceived;
}

/** 癒で解消可能なデバフ（毒・凍結）を持つか */
export function hasHealableDebuff(
  unit: BattleUnit,
  selectionTurn: number,
): boolean {
  return hasHealablePoison(unit) || isFrozen(unit, selectionTurn);
}

export function canReceiveHeal(
  unit: BattleUnit,
  selectionTurn: number,
): boolean {
  if (!isAlive(unit)) return false;
  if (unit.poisonStacks.length > 0 && !unit.poisonDotDamageReceived) {
    return false;
  }
  if (hasHealableDebuff(unit, selectionTurn)) return true;
  return unit.currentBp < unit.maxBp;
}

/** 回復可能な味方（デバフあり、または BP 欠損） */
export function getHealTargets(
  field: BattleUnit[],
  actorPosition: BoardPosition,
  selectionTurn: number,
): BoardPosition[] {
  const actor = getUnitAt(field, actorPosition);
  if (!actor || actor.attribute !== 'heal' || actor.healUsesRemaining <= 0) {
    return [];
  }
  return field
    .filter((u) => canReceiveHeal(u, selectionTurn))
    .map((u) => u.position)
    .filter((p): p is BoardPosition => p !== 'defeated');
}

export function canUseHealAction(
  field: BattleUnit[],
  actorPosition: BoardPosition,
  selectionTurn: number,
): boolean {
  return getHealTargets(field, actorPosition, selectionTurn).length > 0;
}

export function calcHealAmount(healer: BattleUnit, target: BattleUnit): number {
  if (!isAlive(target) || target.currentBp >= target.maxBp) return 0;
  return Math.min(healer.currentBp, target.maxBp - target.currentBp);
}

/** 癒の選択対象のうち、治癒可能なデバフを持つ味方がいるか */
export function healTargetsIncludeDebuff(
  field: BattleUnit[],
  actorPosition: BoardPosition,
  selectionTurn: number,
): boolean {
  return getHealTargets(field, actorPosition, selectionTurn).some((position) => {
    const target = getUnitAt(field, position);
    return target != null && hasHealableDebuff(target, selectionTurn);
  });
}

/** 癒行動選択時の中央ガイド文言 */
export function getHealSelectionHint(
  field: BattleUnit[],
  actorPosition: BoardPosition,
  selectionTurn: number,
  includeAttackOption: boolean,
): string {
  const hasDebuffTarget = healTargetsIncludeDebuff(
    field,
    actorPosition,
    selectionTurn,
  );
  if (includeAttackOption) {
    return hasDebuffTarget
      ? '攻撃先か治癒・回復先を選択'
      : '攻撃先か回復先を選択';
  }
  return hasDebuffTarget ? '治癒・回復先を選択' : '回復先を選択';
}
