import type { BattleState, BattleUnit } from '../types/battle';
import { isAlive } from './battleState';

/** 行動カード選択の表示ターン（startNextTurn の TURN N と一致） */
export function getSelectionTurn(state: BattleState): number {
  return state.turn + 1;
}

export function isFrozen(unit: BattleUnit, selectionTurn: number): boolean {
  return (
    isAlive(unit) &&
    unit.frozenUntilTurn != null &&
    selectionTurn <= unit.frozenUntilTurn
  );
}

/** 近接で凍結付与（ATTRIBUTE_SPEC §4.8）。battleTurn は resolveTurn 時点の state.turn */
export function applyFreeze(unit: BattleUnit, battleTurn: number): void {
  unit.frozenUntilTurn = battleTurn + 2;
}

export function expireFreeze(field: BattleUnit[], displayTurn: number): void {
  for (const unit of field) {
    if (unit.frozenUntilTurn != null && displayTurn > unit.frozenUntilTurn) {
      unit.frozenUntilTurn = null;
    }
  }
}
