import type { BattleState, BattleUnit } from '../../types/battle';
import { appendLog } from '../battleState';

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
        next = {
          ...next,
          events: [...next.events, { type: 'defeated', targetId: unit.cardId }],
        };
      }
    }
  }
  return next;
}
