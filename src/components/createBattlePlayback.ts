import type { BattleState } from '../types/battle';
import type { ResolveTurnResult } from '../game/turnResult';
import type { BattlePlayback } from './battlePlaybackTypes';

/** ResolveTurnResult から UI 再生カーソル付き BattlePlayback を生成する */
export function createBattlePlayback(result: ResolveTurnResult): BattlePlayback {
  const firstAttack = result.attacks[0];
  const hasHeals = result.heals.length > 0;
  const hasIlluminates = result.illuminates.length > 0;
  return {
    attacks: result.attacks,
    shields: result.shields,
    heals: result.heals,
    illuminates: result.illuminates,
    shieldState: result.shieldState,
    stateAfterHeals: result.stateAfterHeals,
    stateAfterIlluminates: result.stateAfterIlluminates,
    pendingNext: result.state,
    attackIndex: 0,
    attackSubPhase: 'damage',
    healSubPhase: 'damage',
    phase: hasHeals
      ? 'heal'
      : hasIlluminates
        ? 'illuminate'
        : result.shields.length > 0
          ? 'shield'
          : firstAttack
            ? 'attack'
            : 'done',
  };
}

/** 再生開始時に盤面へ載せる初期 state（heal/illuminate がある場合は clash 前） */
export function initialPlaybackBoardState(
  preClashState: BattleState,
  playback: BattlePlayback,
): BattleState {
  const hasHeals = playback.heals.length > 0;
  const hasIlluminates = playback.illuminates.length > 0;
  return hasHeals || hasIlluminates ? preClashState : playback.shieldState;
}
