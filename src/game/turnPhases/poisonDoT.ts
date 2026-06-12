import type { BattleSide, BattleState, BattleUnit, BoardPosition } from '../../types/battle';
import type { PoisonDoTPlayback } from '../turnResult';
import { sumPoisonDotDamage } from '../poisonCombat';
import { appendLog, isAlive } from '../battleState';

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
  if (unit.stealthActive) {
    unit.stealthActive = false;
  }
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
  next = {
    ...next,
    events: [
      ...next.events,
      {
        type: 'attack',
        side,
        targetId: unit.cardId,
        damage: totalDot,
      },
    ],
  };
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
