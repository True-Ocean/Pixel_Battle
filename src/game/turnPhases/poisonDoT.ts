import type { BattleSide, BattleState, BattleUnit, BoardPosition } from '../../types/battle';
import type { PoisonDoTPlayback } from '../turnResult';
import { onExternalEffectToUnit } from '../ninjaCombat';
import { sumPoisonDotDamage } from '../poisonCombat';
import { appendLog, isAlive } from '../battleState';
import {
  getDisplayTurn,
  pushBattleEvent,
  unitSnapshot,
} from '../battleLogEvent';

function applyDotToUnit(
  state: BattleState,
  side: BattleSide,
  unit: BattleUnit,
  totalDot: number,
  playback: PoisonDoTPlayback[],
): BattleState {
  let next = state;
  const bpFrom = unit.currentBp;
  unit.currentBp = Math.max(0, unit.currentBp - totalDot);
  unit.poisonDotDamageReceived = true;
  onExternalEffectToUnit(unit);
  if (unit.position !== 'defeated') {
    playback.push({
      side,
      position: unit.position as BoardPosition,
      damage: totalDot,
      bpFrom,
      bpTo: unit.currentBp,
    });
  }
  next = appendLog(
    next,
    `${unit.name} は毒で ${totalDot} ダメージ（${bpFrom}→${unit.currentBp}）`,
  );
  next = pushBattleEvent(next, {
    type: 'attack',
    turn: getDisplayTurn(next),
    side,
    actionKind: 'poison_dot',
    target: unitSnapshot(unit, bpFrom, unit.currentBp),
    damageToTarget: totalDot,
    damage: totalDot,
    targetId: unit.cardId,
  });
  return next;
}

/** ターン開始：毒 DoT（ATTRIBUTE_SPEC §6 ①） */
export function applyPoisonDoT(state: BattleState): {
  state: BattleState;
  playback: PoisonDoTPlayback[];
} {
  const playback: PoisonDoTPlayback[] = [];
  let next: BattleState = {
    ...state,
    log: [...state.log],
    events: [...state.events],
  };

  for (const [side, field] of [
    ['player', next.player] as const,
    ['cpu', next.cpu] as const,
  ]) {
    for (const unit of field) {
      if (!isAlive(unit) || unit.poisonStacks.length === 0) continue;
      const totalDot = sumPoisonDotDamage(unit.poisonStacks);
      if (totalDot <= 0) continue;
      next = applyDotToUnit(next, side, unit, totalDot, playback);
    }
  }

  return { state: next, playback };
}
