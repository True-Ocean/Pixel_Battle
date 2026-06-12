import { STORM_DAMAGE_RATIO } from '../config/balance';
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

/** 嵐の対象（ステルス中の忍も含む — ATTRIBUTE_SPEC §4.9） */
export function isStormTargetable(unit: BattleUnit): boolean {
  return unit.currentBp > 0 && unit.position !== 'defeated';
}

export function getStormTargetableUnits(enemyField: BattleUnit[]): BattleUnit[] {
  return ALL_ENEMY_POSITIONS.map((position) => getUnitAt(enemyField, position))
    .filter((unit): unit is BattleUnit => unit != null && isStormTargetable(unit));
}

export function canUseStormAction(
  unit: BattleUnit,
  enemyField: BattleUnit[],
): boolean {
  return (
    unit.attribute === 'storm' &&
    unit.stormUsesRemaining > 0 &&
    getStormTargetableUnits(enemyField).length > 0
  );
}

/** 生存敵からランダム2体（別ユニット。1体のみなら1体） */
export function pickStormTargets(
  enemyField: BattleUnit[],
  random: () => number = Math.random,
): BoardPosition[] {
  const alive = getStormTargetableUnits(enemyField);
  if (alive.length === 0) return [];
  if (alive.length === 1) return [alive[0]!.position];

  const firstIdx = Math.floor(random() * alive.length);
  let secondIdx = Math.floor(random() * (alive.length - 1));
  if (secondIdx >= firstIdx) secondIdx += 1;
  return [alive[firstIdx]!.position, alive[secondIdx]!.position];
}

export function calcStormDamage(attackerBp: number): number {
  return Math.round(attackerBp * STORM_DAMAGE_RATIO);
}
