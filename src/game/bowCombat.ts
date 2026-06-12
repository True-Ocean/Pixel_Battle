import type { BattleUnit, BoardPosition } from '../types/battle';

const ALL_ENEMY_POSITIONS = [
  'frontLeft',
  'frontRight',
  'backLeft',
  'backCenter',
  'backRight',
] as const satisfies readonly BoardPosition[];

function getUnitAt(
  field: BattleUnit[],
  position: BoardPosition,
): BattleUnit | undefined {
  return field.find((unit) => unit.position === position);
}

export function isBowTargetable(unit: BattleUnit): boolean {
  return unit.currentBp > 0 && unit.position !== 'defeated' && !unit.stealthActive;
}

/** 弓攻撃の有効ターゲット（ATTRIBUTE_SPEC §4.4） */
export function getBowTargets(
  ownField: BattleUnit[],
  enemyField: BattleUnit[],
  actorPosition: BoardPosition,
): BoardPosition[] {
  const actor = getUnitAt(ownField, actorPosition);
  if (!actor || actor.attribute !== 'bow') return [];

  return ALL_ENEMY_POSITIONS.filter((position) => {
    const target = getUnitAt(enemyField, position);
    return target != null && isBowTargetable(target);
  });
}

/** 弓攻撃の与ダメ（currentBp 100%） */
export function calcBowDamage(attackerBp: number): number {
  return attackerBp;
}
