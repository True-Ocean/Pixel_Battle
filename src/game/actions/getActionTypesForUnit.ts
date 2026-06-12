import type { Attribute } from '../../types';
import type { BattleActionType } from '../../types/battle';
import type { BoardPosition } from '../../types/battle';
import { getBowTargets } from '../bowCombat';
import {
  canUseShieldAction,
  getMeleeTargets,
  getUnitAt,
  isFrontPosition,
} from '../battleState';

/** 前衛から近接攻撃できる属性 */
const FRONT_MELEE_ATTRIBUTES: ReadonlySet<Attribute> = new Set([
  'attack',
  'defense',
  'power',
  'dual',
  'poison',
  'ice',
  'ninja',
  'bow',
]);

export function getActionTypesForUnit(
  ownField: Parameters<typeof getUnitAt>[0],
  enemyField: Parameters<typeof getMeleeTargets>[0],
  position: BoardPosition,
): BattleActionType[] {
  const unit = getUnitAt(ownField, position);
  if (!unit) return [];

  const actions: BattleActionType[] = [];

  if (unit.attribute === 'bow') {
    const bowTargets = getBowTargets(ownField, enemyField, position);
    if (bowTargets.length > 0) {
      actions.push('bowAttack');
    }
    if (
      isFrontPosition(position) &&
      getMeleeTargets(enemyField).length > 0
    ) {
      actions.push('meleeAttack');
    }
    return actions;
  }

  const canMelee =
    isFrontPosition(position) &&
    FRONT_MELEE_ATTRIBUTES.has(unit.attribute) &&
    getMeleeTargets(enemyField).length > 0;

  if (canMelee) {
    actions.push('meleeAttack');
  }
  if (unit.attribute === 'defense' && canUseShieldAction(ownField, position)) {
    actions.push('grantShield');
  }

  return actions;
}
