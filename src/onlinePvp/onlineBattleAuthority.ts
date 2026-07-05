import {
  getPendingPromotionFronts,
  getPromotableBackPositions,
} from '../game/battleState';
import { promoteUnit } from '../game/resolveTurn';
import type { BattleState } from '../types/battle';
import type { OnlineBattlePhase } from './types';

export function onlinePromotionNeeded(state: BattleState): boolean {
  return (
    getPendingPromotionFronts(state.player).length > 0 ||
    getPendingPromotionFronts(state.cpu).length > 0
  );
}

/**
 * 1択の前衛補充のみ両軍分を自動適用（オンライン PvP サーバー正本）。
 * 複数候補がある昇格はプレイヤーの手動操作に委ねる。
 */
export function autoCompleteForcedPromotions(state: BattleState): BattleState {
  let next = state;
  for (const side of ['player', 'cpu'] as const) {
    for (let guard = 0; guard < 8; guard += 1) {
      const fronts = getPendingPromotionFronts(next[side]);
      if (fronts.length === 0) break;
      const forced = fronts
        .map((front) => ({
          front,
          backs: getPromotableBackPositions(next[side], front),
        }))
        .find(({ backs }) => backs.length === 1);
      if (!forced) break;
      const promoted = promoteUnit(next, side, forced.backs[0]!, forced.front);
      if (promoted === next) break;
      next = promoted;
    }
  }
  return next;
}

export function nextPhaseAfterClash(state: BattleState): OnlineBattlePhase {
  return onlinePromotionNeeded(state) ? 'promotion' : 'turn_start';
}

/** select に昇格必要 state が載っていないこと等、phase と state の整合を検証 */
export function assertOnlineBattlePhaseInvariant(
  battlePhase: OnlineBattlePhase,
  state: BattleState,
): void {
  const needs = onlinePromotionNeeded(state);
  if (battlePhase === 'select' && needs) {
    throw new Error('invariant: select phase requires completed promotions');
  }
  if (battlePhase === 'promotion' && !needs) {
    throw new Error('invariant: promotion phase requires pending promotions');
  }
}

/** 不整合時に正しい battle_phase へ戻す（idempotent） */
export function targetOnlineBattlePhaseForState(
  state: BattleState,
  currentPhase: OnlineBattlePhase,
): OnlineBattlePhase | null {
  const needs = onlinePromotionNeeded(state);
  if (needs && currentPhase !== 'promotion') {
    return 'promotion';
  }
  if (!needs && currentPhase === 'promotion') {
    return 'turn_start';
  }
  return null;
}
