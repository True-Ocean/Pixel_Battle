import { useCallback, useMemo, useState } from 'react';
import { getPendingPromotionFronts } from '../game/battleState';
import type { BattleActionChoice, BattleState, BoardPosition } from '../types/battle';
import { toLocalBattleState } from '../onlinePvp/battleSync';
import {
  computeOnlineWaitingForOpponent,
  deriveOnlineUiPhase,
  isOnlineUiInputLocked,
  type ActionPickSubPhase,
  type OnlineReplayOverlay,
  type OnlineUiPhase,
} from '../onlinePvp/deriveOnlineUiPhase';
import {
  derivePromotionUi,
  type DerivedPromotionUi,
  type PromotionDraft,
} from '../onlinePvp/derivePromotionUi';
import {
  submitOnlineBattleChoice,
  submitOnlinePromotion,
} from '../onlinePvp/roomApi';
import type { OnlineBattleRole, OnlineBattleRoom, OnlineRoomResult } from '../onlinePvp/types';

export interface BuildOnlineBattleSessionViewInput {
  room: OnlineBattleRoom | null;
  role: OnlineBattleRole;
  promotionDraft: PromotionDraft;
  replayOverlay: OnlineReplayOverlay | null;
  actionPickSubPhase?: ActionPickSubPhase;
  /** 送信直後〜Realtime 反映前の楽観的ロック */
  choiceSubmitPending?: boolean;
}

export interface OnlineBattleSessionView {
  uiPhase: OnlineUiPhase | null;
  localState: BattleState | null;
  promotion: DerivedPromotionUi;
  waitingForOpponent: boolean;
  inputLocked: boolean;
}

const idlePromotion: DerivedPromotionUi = {
  mode: 'idle',
  validBacks: [],
  validFronts: [],
  hint: null,
  autoSubmit: null,
};

/** フックと同じ導出。単体テスト用の純関数ビュー */
export function buildOnlineBattleSessionView(
  input: BuildOnlineBattleSessionViewInput,
): OnlineBattleSessionView {
  const { room, role, promotionDraft, replayOverlay } = input;
  const actionPickSubPhase = input.actionPickSubPhase ?? 'main';
  const choiceSubmitPending = input.choiceSubmitPending ?? false;

  if (!room?.battleState) {
    return {
      uiPhase: null,
      localState: null,
      promotion: idlePromotion,
      waitingForOpponent: false,
      inputLocked: true,
    };
  }

  const localState = toLocalBattleState(room.battleState, role);
  const waitingForOpponent =
    choiceSubmitPending || computeOnlineWaitingForOpponent(room, role);
  const promotion = derivePromotionUi(
    localState,
    room.battlePhase,
    promotionDraft,
  );
  const uiPhase = deriveOnlineUiPhase({
    room,
    localState,
    promotionDraft,
    replayOverlay,
    waitingForOpponent,
    actionPickSubPhase,
  });

  return {
    uiPhase,
    localState,
    promotion,
    waitingForOpponent,
    inputLocked: isOnlineUiInputLocked(uiPhase),
  };
}

export interface UseOnlineBattleSessionOptions {
  room: OnlineBattleRoom | null;
  role: OnlineBattleRole;
  onRoomSync?: (room: OnlineBattleRoom) => void;
}

export interface UseOnlineBattleSessionResult extends OnlineBattleSessionView {
  promotionDraft: PromotionDraft;
  actionPickSubPhase: ActionPickSubPhase;
  replayOverlay: OnlineReplayOverlay | null;
  setPromotionDraft: (draft: PromotionDraft) => void;
  selectPromotionBack: (from: BoardPosition) => void;
  clearPromotionDraft: () => void;
  setActionPickSubPhase: (subPhase: ActionPickSubPhase) => void;
  setReplayOverlay: (overlay: OnlineReplayOverlay | null) => void;
  submitChoice: (
    choice: BattleActionChoice,
  ) => Promise<OnlineRoomResult<OnlineBattleRoom>>;
  submitPromotion: (
    from: BoardPosition,
    to: BoardPosition,
  ) => Promise<OnlineRoomResult<OnlineBattleRoom>>;
}

export function useOnlineBattleSession({
  room,
  role,
  onRoomSync,
}: UseOnlineBattleSessionOptions): UseOnlineBattleSessionResult {
  const [promotionDraft, setPromotionDraft] = useState<PromotionDraft>({
    from: null,
  });
  const [actionPickSubPhase, setActionPickSubPhase] =
    useState<ActionPickSubPhase>('main');
  const [replayOverlay, setReplayOverlay] =
    useState<OnlineReplayOverlay | null>(null);
  /** 送信時点の battleRevision。同 revision かつ未反映のあいだだけ楽観ロック */
  const [optimisticSubmitRev, setOptimisticSubmitRev] = useState<number | null>(
    null,
  );

  const choiceSubmitPending =
    optimisticSubmitRev != null &&
    room != null &&
    room.battleRevision === optimisticSubmitRev &&
    room.battlePhase === 'select' &&
    (role === 'host' ? room.hostPendingAction : room.guestPendingAction) ==
      null;

  const view = useMemo(
    () =>
      buildOnlineBattleSessionView({
        room,
        role,
        promotionDraft,
        replayOverlay,
        actionPickSubPhase,
        choiceSubmitPending,
      }),
    [
      room,
      role,
      promotionDraft,
      replayOverlay,
      actionPickSubPhase,
      choiceSubmitPending,
    ],
  );

  // 昇格対象が無くなったら選択中の昇格ドラフトを破棄する。
  if (
    view.localState &&
    getPendingPromotionFronts(view.localState.player).length === 0 &&
    promotionDraft.from != null
  ) {
    setPromotionDraft({ from: null });
  }

  // 対象選択系(pick*)以外のフェーズでは行動選択のサブフェーズを main に戻す。
  if (
    view.uiPhase != null &&
    view.uiPhase !== 'pickMain' &&
    view.uiPhase !== 'pickTarget' &&
    view.uiPhase !== 'pickShield' &&
    view.uiPhase !== 'pickHeal' &&
    actionPickSubPhase !== 'main'
  ) {
    setActionPickSubPhase('main');
  }

  const selectPromotionBack = useCallback((from: BoardPosition) => {
    setPromotionDraft({ from });
  }, []);

  const clearPromotionDraft = useCallback(() => {
    setPromotionDraft({ from: null });
  }, []);

  const submitChoice = useCallback(
    (choice: BattleActionChoice) => {
      if (!room) {
        return Promise.resolve({
          ok: false as const,
          code: 'room_closed' as const,
          message: 'ルームがありません',
        });
      }
      setActionPickSubPhase('main');
      setOptimisticSubmitRev(room.battleRevision);
      return submitOnlineBattleChoice(room.id, role, choice).then((result) => {
        if (result.ok) {
          onRoomSync?.(result.data);
        } else {
          setOptimisticSubmitRev(null);
        }
        return result;
      });
    },
    [onRoomSync, room, role],
  );

  const submitPromotion = useCallback(
    (from: BoardPosition, to: BoardPosition) => {
      if (!room) {
        return Promise.resolve({
          ok: false as const,
          code: 'room_closed' as const,
          message: 'ルームがありません',
        });
      }
      return submitOnlinePromotion(room.id, role, from, to).then((result) => {
        if (result.ok) {
          setPromotionDraft({ from: null });
          onRoomSync?.(result.data);
        }
        return result;
      });
    },
    [onRoomSync, room, role],
  );

  return {
    ...view,
    promotionDraft,
    actionPickSubPhase,
    replayOverlay,
    setPromotionDraft,
    selectPromotionBack,
    clearPromotionDraft,
    setActionPickSubPhase,
    setReplayOverlay,
    submitChoice,
    submitPromotion,
  };
}
