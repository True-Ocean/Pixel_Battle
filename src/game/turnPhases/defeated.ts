import type { BattleState, BattleUnit } from '../../types/battle';
import { appendLog } from '../battleState';
import {
  getDisplayTurn,
  pushBattleEvent,
  unitSnapshot,
} from '../battleLogEvent';

export function applyDefeated(
  state: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
): BattleState {
  let next = state;
  for (const field of [player, cpu]) {
    for (const unit of field) {
      if (unit.position !== 'defeated' && unit.currentBp <= 0) {
        unit.position = 'defeated';
        unit.hasShield = false;
        next = appendLog(next, `${unit.name} は撃破された`);
        next = pushBattleEvent(next, {
          type: 'defeated',
          turn: getDisplayTurn(next),
          target: unitSnapshot(unit, 0, 0),
          targetId: unit.cardId,
        });
      }
    }
  }
  return next;
}
