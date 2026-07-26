import { getBattleResult } from '../game';
import { getPendingPromotionFronts } from '../game/battleState';
import type { BattleState } from '../types/battle';
import { onlinePromotionNeeded } from './onlineBattleAuthority';
import {
  derivePromotionUi,
  promotionModeToUiPhase,
  type PromotionDraft,
} from './derivePromotionUi';
import type { OnlineBattleRole, OnlineBattleRoom } from './types';

export type OnlineUiPhase =
  | 'pickMain'
  | 'pickTarget'
  | 'pickShield'
  | 'pickHeal'
  | 'promoteUnit'
  | 'promoteSlot'
  | 'waitOpponentPromotion'
  | 'clashReplay'
  | 'turnStartPoison'
  | 'waitOpponent'
  | 'ended';

export type OnlineReplayOverlayKind = 'clash' | 'turnStartPoison';

export interface OnlineReplayOverlay {
  kind: OnlineReplayOverlayKind;
}

export type ActionPickSubPhase = 'main' | 'target' | 'shield' | 'heal';

export interface DeriveOnlineUiPhaseInput {
  room: OnlineBattleRoom;
  localState: BattleState;
  promotionDraft: PromotionDraft;
  replayOverlay: OnlineReplayOverlay | null;
  waitingForOpponent: boolean;
  actionPickSubPhase?: ActionPickSubPhase;
}

function actionSubPhaseToUiPhase(
  subPhase: ActionPickSubPhase,
): 'pickMain' | 'pickTarget' | 'pickShield' | 'pickHeal' {
  switch (subPhase) {
    case 'target':
      return 'pickTarget';
    case 'shield':
      return 'pickShield';
    case 'heal':
      return 'pickHeal';
    default:
      return 'pickMain';
  }
}

/** 相手の行動選択待ち（自分は submit 済み） */
export function computeOnlineWaitingForOpponent(
  room: OnlineBattleRoom,
  role: OnlineBattleRole,
): boolean {
  if (room.status !== 'battle' || room.battlePhase !== 'select') {
    return false;
  }
  const mine =
    role === 'host' ? room.hostPendingAction : room.guestPendingAction;
  const theirs =
    role === 'host' ? room.guestPendingAction : room.hostPendingAction;
  return mine != null && theirs == null;
}

/**
 * オンライン PvP の UI フェーズを room 正本から 1 関数で導出する（§6.2 優先順位）。
 * battle 外は null（ルーム UI に委譲）。
 * ただし rematch_wait / closed でも、再生オーバーレイ中は clash を優先し、
 * 盤面がある終了後は ended を返す（最終 clash 完走 → WIN/LOSE のため）。
 */
export function deriveOnlineUiPhase(
  input: DeriveOnlineUiPhaseInput,
): OnlineUiPhase | null {
  const {
    room,
    localState,
    promotionDraft,
    replayOverlay,
    waitingForOpponent,
  } = input;
  const actionPickSubPhase = input.actionPickSubPhase ?? 'main';

  // status に関わらず再生中は最優先（finalize で rematch_wait になっても clash を止めない）
  if (replayOverlay != null) {
    return replayOverlay.kind === 'clash' ? 'clashReplay' : 'turnStartPoison';
  }

  if (room.status === 'rematch_wait' && room.battleState != null) {
    return 'ended';
  }

  if (
    room.status === 'closed' &&
    room.battleState != null &&
    getBattleResult(localState) != null
  ) {
    return 'ended';
  }

  if (room.status !== 'battle' || room.battleState == null) {
    return null;
  }

  if (getPendingPromotionFronts(localState.player).length > 0) {
    const promotion = derivePromotionUi(
      localState,
      room.battlePhase,
      promotionDraft,
    );
    const promoPhase = promotionModeToUiPhase(promotion.mode);
    if (promoPhase) return promoPhase;
  }

  const promotion = derivePromotionUi(
    localState,
    room.battlePhase,
    promotionDraft,
  );
  const waitOpponentPromotion = promotionModeToUiPhase(promotion.mode);
  if (waitOpponentPromotion === 'waitOpponentPromotion') {
    return 'waitOpponentPromotion';
  }

  // 自分提出済みの相手待ちは select 中でも pick* より優先（入力ロックのため）
  if (waitingForOpponent) {
    return 'waitOpponent';
  }

  if (
    room.battlePhase === 'select' &&
    !onlinePromotionNeeded(localState)
  ) {
    return actionSubPhaseToUiPhase(actionPickSubPhase);
  }

  if (getBattleResult(localState) != null) {
    return 'ended';
  }

  if (room.battlePhase === 'promotion' || room.battlePhase === 'turn_start') {
    return 'waitOpponent';
  }

  return 'waitOpponent';
}

export function isOnlineUiInputLocked(phase: OnlineUiPhase | null): boolean {
  if (phase == null) return true;
  return (
    phase === 'waitOpponent' ||
    phase === 'waitOpponentPromotion' ||
    phase === 'clashReplay' ||
    phase === 'turnStartPoison' ||
    phase === 'ended'
  );
}
