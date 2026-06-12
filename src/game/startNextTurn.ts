import type { BattleState } from '../types/battle';
import { appendLog } from './battleState';
import { applyDefeated } from './turnPhases/defeated';
import { applyPoisonDoT } from './turnPhases/poisonDoT';
import type { PoisonDoTPlayback } from './turnResult';

function cloneField<T extends { poisonStacks: { sourceCardId: string; damagePerTurn: number }[] }>(
  field: T[],
): T[] {
  return field.map((u) => ({
    ...u,
    poisonStacks: u.poisonStacks.map((s) => ({ ...s })),
  }));
}

function cloneBattleState(state: BattleState): BattleState {
  return {
    ...state,
    player: cloneField(state.player),
    cpu: cloneField(state.cpu),
    log: [...state.log],
    events: [...state.events],
  };
}

export interface StartTurnResult {
  /** 毒DoT適用前（ログ・ターン見出しのみ反映） */
  stateBeforeDot: BattleState;
  /** 毒DoT・撃破処理後 */
  stateAfterDot: BattleState;
  poisonDots: PoisonDoTPlayback[];
}

/**
 * 新ターン開始（カード選択前）: ターン見出しログ → 毒 DoT。
 * state.turn はまだ前ターンのまま。表示ターン = state.turn + 1。
 */
export function startNextTurn(state: BattleState): StartTurnResult {
  const displayTurn = state.turn + 1;
  let beforeDot = cloneBattleState(state);
  beforeDot = appendLog(beforeDot, `--- TURN ${displayTurn} ---`);

  const poisonResult = applyPoisonDoT(beforeDot);
  let afterDot = poisonResult.state;
  afterDot = applyDefeated(afterDot, afterDot.player, afterDot.cpu);

  return {
    stateBeforeDot: beforeDot,
    stateAfterDot: afterDot,
    poisonDots: poisonResult.playback,
  };
}
