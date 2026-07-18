import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeDeckPower } from '../card';
import {
  BOARD_POSITIONS,
  createBattleState,
  getActionTypesForUnit,
  getBattleResult,
  getBowTargets,
  getDefeated,
  getHealSelectionHint,
  getHealTargets,
  getIlluminateSelectionHint,
  getIlluminateTargets,
  getMeleeTargets,
  getSelectionTurn,
  getShieldTargetsForActor,
  getUnitAt,
  hasBattleActionChoices,
  isNinjaStealthStalemate,
  pickPassAction,
} from '../game';
import { buildDefeatedCpuLootCards } from '../battle/graveyardLoot';
import type { Card, BattleOutcomeCore } from '../types';
import type {
  BattleActionChoice,
  BattleActionType,
  BattleState,
  BoardPosition,
} from '../types/battle';
import { applyOnlineNinjaStalemateBreak } from '../onlinePvp/roomApi';
import type { OnlineUiPhase } from '../onlinePvp/deriveOnlineUiPhase';
import {
  onlineClashReplayKey,
  playbackEventsToResolveResult,
  shouldStartOnlineClashReplay,
  toLocalClashPlaybackEvents,
  toLocalPoisonDots,
} from '../onlinePvp/onlineClashPlayback';
import { flipBattleStateForGuest } from '../onlinePvp/battleSync';
import type { OnlineBattleRole, OnlineBattleRoom } from '../onlinePvp/types';
import { CLASH_MS } from './battleClashTypes';
import type { BattlePlayback } from './battlePlaybackTypes';
import {
  createBattlePlayback,
  initialPlaybackBoardState,
} from './createBattlePlayback';
import { useClashPlaybackAdvance } from './useClashPlaybackAdvance';
import type { BattleUiPhase, TurnStartPlayback } from './useBattle';
import { useOnlineBattleSession } from './useOnlineBattleSession';

function mapOnlineUiPhaseToBattle(uiPhase: OnlineUiPhase | null): BattleUiPhase {
  if (uiPhase == null) return 'pickMain';
  switch (uiPhase) {
    case 'clashReplay':
      return 'clash';
    case 'waitOpponent':
      return 'pickMain';
    case 'ended':
      return 'ended';
    default:
      return uiPhase;
  }
}

export interface UseOnlineBattleControllerOptions {
  room: OnlineBattleRoom | null;
  role: OnlineBattleRole;
  playerCards: Card[];
  cpuCards: Card[];
  onFinish: (outcome: BattleOutcomeCore) => void;
  onRoomSync?: (room: OnlineBattleRoom) => void;
}

export function useOnlineBattleController({
  room,
  role,
  playerCards,
  cpuCards,
  onFinish,
  onRoomSync,
}: UseOnlineBattleControllerOptions) {
  const session = useOnlineBattleSession({ room, role, onRoomSync });
  const [pendingActor, setPendingActor] = useState<BoardPosition | null>(null);
  const [pendingAction, setPendingAction] = useState<BattleActionType | null>(null);
  const [prevBattleRevision, setPrevBattleRevision] = useState<
    number | undefined
  >(undefined);
  const [playback, setPlayback] = useState<BattlePlayback | null>(null);
  const [turnStartPlayback, setTurnStartPlayback] =
    useState<TurnStartPlayback | null>(null);
  const [displayState, setDisplayState] = useState<BattleState | null>(null);
  const outcomeSavedRef = useRef(false);
  const playedClashKeyRef = useRef<string | null>(null);
  const playedPoisonKeyRef = useRef<string | null>(null);
  const seededRoomIdRef = useRef<string | null>(null);
  const stalemateBreakRef = useRef(false);

  const authoritativeState =
    session.localState ?? createBattleState(playerCards, cpuCards);
  const state = displayState ?? authoritativeState;

  const mappedPhase: BattleUiPhase = mapOnlineUiPhaseToBattle(session.uiPhase);
  const result = getBattleResult(authoritativeState);
  const selectionTurn = getSelectionTurn(state);
  const pendingPromoteFrom = session.promotionDraft.from;

  // rematch_wait 確定〜再生 effect 起動前に ended へ落ちないようにする
  const pendingClashReplay =
    room != null &&
    Boolean(room.lastClash?.playbackEvents) &&
    // eslint-disable-next-line react-hooks/refs -- playedClashKeyRef は effect 内でライブに読み書きする再生済みマーカーで、この描画では effectivePhase を同一レンダーで確定させるため意図的に参照する（state 化すると effect 内の最新値参照が壊れる）
    shouldStartOnlineClashReplay(room, playedClashKeyRef.current);

  const effectivePhase: BattleUiPhase = (() => {
    if (playback) return 'clash';
    if (turnStartPlayback) return 'turnStartPoison';
    if (pendingClashReplay) return 'clash';
    if (
      result &&
      mappedPhase !== 'clash' &&
      mappedPhase !== 'turnStartPoison'
    ) {
      return 'ended';
    }
    return mappedPhase;
  })();

  const releaseReplayToRoom = useCallback(() => {
    setPlayback(null);
    setTurnStartPlayback(null);
    setDisplayState(null);
    session.setReplayOverlay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session の identity churn を避け、安定した setter のみ依存する
  }, [session.setReplayOverlay]);

  const releaseReplayRef = useRef(releaseReplayToRoom);
  useEffect(() => {
    releaseReplayRef.current = releaseReplayToRoom;
  }, [releaseReplayToRoom]);

  const startPoisonReplay = useCallback(
    (clashKey: string) => {
      const lastClash = room?.lastClash;
      if (!lastClash?.poisonDots?.length || !lastClash.stateBeforePoison) {
        releaseReplayRef.current();
        return;
      }
      if (playedPoisonKeyRef.current === clashKey) {
        releaseReplayRef.current();
        return;
      }
      playedPoisonKeyRef.current = clashKey;
      const localBefore =
        role === 'guest'
          ? flipBattleStateForGuest(lastClash.stateBeforePoison)
          : lastClash.stateBeforePoison;
      const localAfter = lastClash.stateAfterPoison
        ? role === 'guest'
          ? flipBattleStateForGuest(lastClash.stateAfterPoison)
          : lastClash.stateAfterPoison
        : authoritativeState;
      setPlayback(null);
      setDisplayState(localBefore);
      setTurnStartPlayback({
        poisonDots: toLocalPoisonDots(lastClash.poisonDots, role),
        stateAfter: localAfter,
        poisonSubPhase: 'damage',
      });
      session.setReplayOverlay({ kind: 'turnStartPoison' });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session の identity churn を避け、安定した setter のみ依存する
    [authoritativeState, role, room?.lastClash, session.setReplayOverlay],
  );

  const startPoisonReplayRef = useRef(startPoisonReplay);
  useEffect(() => {
    startPoisonReplayRef.current = startPoisonReplay;
  }, [startPoisonReplay]);

  const finishClashPlayback = useCallback(() => {
    const lastClash = room?.lastClash;
    const clashKey = lastClash
      ? onlineClashReplayKey(lastClash.turn, lastClash.preClashRevision)
      : null;
    setPlayback(null);
    if (
      clashKey &&
      lastClash?.poisonDots &&
      lastClash.poisonDots.length > 0 &&
      lastClash.stateBeforePoison
    ) {
      startPoisonReplayRef.current(clashKey);
      return;
    }
    releaseReplayRef.current();
  }, [room?.lastClash]);

  // §7.2: last_clash.playbackEvents を再生（resolveTurn 再実行禁止）
  useEffect(() => {
    if (!room) return;

    // ルーム入場時の既存 lastClash は再生せず既読扱い（リロードで古い演出を避ける）
    if (seededRoomIdRef.current !== room.id) {
      seededRoomIdRef.current = room.id;
      if (room.lastClash) {
        const key = onlineClashReplayKey(
          room.lastClash.turn,
          room.lastClash.preClashRevision,
        );
        playedClashKeyRef.current = key;
        playedPoisonKeyRef.current = room.lastClash.poisonDots?.length
          ? key
          : null;
      } else {
        playedClashKeyRef.current = null;
        playedPoisonKeyRef.current = null;
      }
      return;
    }

    if (!room.lastClash?.playbackEvents) return;
    const lastClash = room.lastClash;
    const clashKey = onlineClashReplayKey(
      lastClash.turn,
      lastClash.preClashRevision,
    );
    if (playedClashKeyRef.current === clashKey) {
      // clash 再生済みで、あとから poisonDots が載った場合（昇格後 turn_start）
      if (
        lastClash.poisonDots &&
        lastClash.poisonDots.length > 0 &&
        lastClash.stateBeforePoison &&
        playedPoisonKeyRef.current !== clashKey &&
        !playback &&
        !turnStartPlayback &&
        session.replayOverlay == null
      ) {
        startPoisonReplayRef.current(clashKey);
      }
      return;
    }
    // 古い last_clash や revision が進みすぎたものは再生せず既読にする
    if (!shouldStartOnlineClashReplay(room, playedClashKeyRef.current)) {
      playedClashKeyRef.current = clashKey;
      if (lastClash.poisonDots?.length) {
        playedPoisonKeyRef.current = clashKey;
      }
      return;
    }
    playedClashKeyRef.current = clashKey;
    playedPoisonKeyRef.current = null;
    const localEvents = toLocalClashPlaybackEvents(
      lastClash.playbackEvents,
      role,
    );
    const nextPlayback = createBattlePlayback(
      playbackEventsToResolveResult(localEvents),
    );
    setDisplayState(
      initialPlaybackBoardState(localEvents.preClashState, nextPlayback),
    );
    setPlayback(nextPlayback);
    setTurnStartPlayback(null);
    session.setReplayOverlay({ kind: 'clash' });
    // room.id / lastClash キー変化と再生中フラグのみ。コールバック identity は ref 経由。
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally narrow
  }, [
    playback,
    role,
    room?.id,
    room?.battleRevision,
    room?.lastClash,
    session.replayOverlay,
    session.setReplayOverlay,
    turnStartPlayback,
  ]);

  useClashPlaybackAdvance(
    playback,
    effectivePhase,
    setPlayback,
    setDisplayState,
    finishClashPlayback,
  );

  useEffect(() => {
    if (!turnStartPlayback || effectivePhase !== 'turnStartPoison') return;
    if (turnStartPlayback.poisonSubPhase === 'damage') {
      const t = window.setTimeout(
        () =>
          setTurnStartPlayback((p) =>
            p ? { ...p, poisonSubPhase: 'bp' } : null,
          ),
        CLASH_MS.damage,
      );
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      releaseReplayToRoom();
    }, CLASH_MS.bp);
    return () => window.clearTimeout(t);
  }, [turnStartPlayback, effectivePhase, releaseReplayToRoom]);

  useEffect(() => {
    const auto = session.promotion.autoSubmit;
    if (!auto || session.inputLocked) return;
    void session.submitPromotion(auto.from, auto.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session の identity churn を避け、必要な値のみ依存する
  }, [session.promotion.autoSubmit, session.inputLocked, session.submitPromotion]);

  // バトルの revision（＝ターン進行）が変わったら選択中の UI 状態をリセットする。
  // effect ではなく描画時の transition 検知で行う。
  if (room?.battleRevision !== prevBattleRevision) {
    setPrevBattleRevision(room?.battleRevision);
    setPendingActor(null);
    setPendingAction(null);
  }

  const availableActionsFor = useCallback(
    (position: BoardPosition) =>
      getActionTypesForUnit(
        state.player,
        state.cpu,
        position,
        selectionTurn,
      ),
    [state, selectionTurn],
  );

  const isStormPickPending = useCallback(() => {
    return (
      effectivePhase === 'pickTarget' &&
      pendingActor != null &&
      pendingAction == null &&
      availableActionsFor(pendingActor).includes('storm')
    );
  }, [effectivePhase, pendingActor, pendingAction, availableActionsFor]);

  const cancelStormPick = useCallback(() => {
    if (!isStormPickPending()) return false;
    setPendingActor(null);
    setPendingAction(null);
    session.setActionPickSubPhase('main');
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session の identity churn を避け、安定した setter のみ依存する
  }, [isStormPickPending, session.setActionPickSubPhase]);

  const commitTurn = useCallback(
    (playerChoice: BattleActionChoice) => {
      setPendingActor(null);
      setPendingAction(null);
      session.setActionPickSubPhase('main');
      void session.submitChoice(playerChoice);
    },
    [session],
  );

  useEffect(() => {
    if (
      session.inputLocked ||
      effectivePhase !== 'pickMain' ||
      result ||
      !room?.id
    ) {
      return;
    }
    if (!hasBattleActionChoices(state, 'player')) {
      if (isNinjaStealthStalemate(state)) {
        if (stalemateBreakRef.current) return;
        stalemateBreakRef.current = true;
        void applyOnlineNinjaStalemateBreak(room.id).finally(() => {
          stalemateBreakRef.current = false;
        });
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 選択肢が無い場合のパス自動提出。オンライン対戦の battle state に追従する状態機械で、描画時導出に置き換えるとターン同期が壊れる
      commitTurn(pickPassAction(state, 'player'));
    }
  }, [
    commitTurn,
    effectivePhase,
    result,
    room?.id,
    session.inputLocked,
    state,
  ]);

  const handlePlayerCardClick = useCallback(
    (position: BoardPosition | number) => {
      if (typeof position === 'number') return;
      if (session.inputLocked) return;
      if (
        effectivePhase === 'clash' ||
        effectivePhase === 'turnStartPoison' ||
        effectivePhase === 'stalemateStealthBreak' ||
        effectivePhase === 'waitOpponentPromotion'
      ) {
        return;
      }

      if (effectivePhase === 'promoteUnit') {
        if (!session.promotion.validBacks.includes(position)) return;
        session.selectPromotionBack(position);
        return;
      }

      if (effectivePhase === 'promoteSlot' && pendingPromoteFrom) {
        if (session.promotion.validBacks.includes(position)) {
          if (position === pendingPromoteFrom) {
            session.clearPromotionDraft();
            return;
          }
          session.selectPromotionBack(position);
          return;
        }
        if (!session.promotion.validFronts.includes(position)) return;
        void session.submitPromotion(pendingPromoteFrom, position);
        return;
      }

      if (effectivePhase === 'pickHeal' && pendingActor && pendingAction) {
        if (getHealTargets(state.player, pendingActor, selectionTurn).includes(position)) {
          commitTurn({
            type: 'heal',
            actorPosition: pendingActor,
            targetPosition: position,
          });
          return;
        }
      }

      if (effectivePhase === 'pickShield' && pendingActor && pendingAction) {
        if (
          getShieldTargetsForActor(state.player, pendingActor).includes(position)
        ) {
          commitTurn({
            type: pendingAction,
            actorPosition: pendingActor,
            targetPosition: position,
          });
          return;
        }
      }

      if (
        effectivePhase === 'pickTarget' &&
        pendingActor &&
        pendingAction == null &&
        getHealTargets(state.player, pendingActor, selectionTurn).includes(position)
      ) {
        commitTurn({
          type: 'heal',
          actorPosition: pendingActor,
          targetPosition: position,
        });
        return;
      }

      if (
        effectivePhase === 'pickTarget' &&
        pendingActor &&
        pendingAction == null &&
        availableActionsFor(pendingActor).includes('grantShield') &&
        getShieldTargetsForActor(state.player, pendingActor).includes(position)
      ) {
        commitTurn({
          type: 'grantShield',
          actorPosition: pendingActor,
          targetPosition: position,
        });
        return;
      }

      if (isStormPickPending() && pendingActor !== position) {
        cancelStormPick();
        return;
      }

      if (
        (effectivePhase === 'pickTarget' ||
          effectivePhase === 'pickShield' ||
          effectivePhase === 'pickHeal') &&
        pendingActor === position
      ) {
        if (
          effectivePhase === 'pickTarget' &&
          pendingAction == null &&
          availableActionsFor(position).includes('storm')
        ) {
          commitTurn({
            type: 'storm',
            actorPosition: position,
            targetPosition: position,
          });
          return;
        }
        setPendingActor(null);
        setPendingAction(null);
        session.setActionPickSubPhase('main');
        return;
      }

      if (effectivePhase !== 'pickMain') return;
      const actions = availableActionsFor(position);
      if (actions.length === 0) return;
      if (pendingActor === position) {
        setPendingActor(null);
        setPendingAction(null);
        return;
      }
      setPendingActor(position);
      if (actions.length === 1) {
        const action = actions[0]!;
        if (action === 'storm') {
          setPendingAction(null);
          session.setActionPickSubPhase('target');
          return;
        }
        if (action === 'illuminate') {
          setPendingAction(null);
          session.setActionPickSubPhase('target');
          return;
        }
        setPendingAction(action);
        session.setActionPickSubPhase(
          action === 'grantShield'
            ? 'shield'
            : action === 'heal'
              ? 'heal'
              : 'target',
        );
      } else {
        setPendingAction(null);
        session.setActionPickSubPhase('target');
      }
    },
    [
      availableActionsFor,
      cancelStormPick,
      commitTurn,
      effectivePhase,
      isStormPickPending,
      pendingAction,
      pendingActor,
      pendingPromoteFrom,
      selectionTurn,
      session,
      state,
    ],
  );

  const handleCpuCardClick = useCallback(
    (position: BoardPosition) => {
      if (session.inputLocked) return;
      if (effectivePhase !== 'pickTarget' || !pendingActor) {
        return;
      }
      const actor = getUnitAt(state.player, pendingActor);
      if (!actor) return;

      const illuminateTargets = getIlluminateTargets(actor, state.cpu);
      if (
        actor.attribute === 'illuminate' &&
        illuminateTargets.includes(position) &&
        (pendingAction === 'illuminate' || pendingAction == null)
      ) {
        commitTurn({
          type: 'illuminate',
          actorPosition: pendingActor,
          targetPosition: position,
        });
        return;
      }

      const targetUnit = getUnitAt(state.cpu, position);
      if (!targetUnit) {
        cancelStormPick();
        return;
      }
      if (targetUnit.stealthActive) {
        return;
      }

      const bowTargets = getBowTargets(state.player, state.cpu, pendingActor);
      const meleeTargets = getMeleeTargets(state.cpu);

      if (
        actor.attribute === 'bow' &&
        bowTargets.includes(position) &&
        (pendingAction === 'bowAttack' || pendingAction == null)
      ) {
        commitTurn({
          type: 'bowAttack',
          actorPosition: pendingActor,
          targetPosition: position,
        });
        return;
      }

      if (
        meleeTargets.includes(position) &&
        (pendingAction === 'dualAttack' ||
          (pendingAction == null && actor.attribute === 'dual'))
      ) {
        commitTurn({
          type: 'dualAttack',
          actorPosition: pendingActor,
          targetPosition: position,
        });
        return;
      }

      if (
        meleeTargets.includes(position) &&
        (pendingAction === 'meleeAttack' ||
          (pendingAction == null && actor.attribute === 'defense'))
      ) {
        commitTurn({
          type: 'meleeAttack',
          actorPosition: pendingActor,
          targetPosition: position,
        });
        return;
      }

      const actorActions = availableActionsFor(pendingActor);
      if (
        pendingAction !== 'bowAttack' &&
        actorActions.includes('meleeAttack') &&
        meleeTargets.includes(position)
      ) {
        commitTurn({
          type: 'meleeAttack',
          actorPosition: pendingActor,
          targetPosition: position,
        });
        return;
      }

      cancelStormPick();
    },
    [
      availableActionsFor,
      cancelStormPick,
      commitTurn,
      effectivePhase,
      pendingAction,
      pendingActor,
      session.inputLocked,
      state,
    ],
  );

  const cancelSelection = useCallback(() => {
    setPendingActor(null);
    setPendingAction(null);
    session.clearPromotionDraft();
    session.setActionPickSubPhase('main');
  }, [session]);

  const isActionablePosition = useCallback(
    (position: BoardPosition) => {
      if (session.inputLocked || session.waitingForOpponent) return false;
      return availableActionsFor(position).length > 0;
    },
    [availableActionsFor, session.inputLocked, session.waitingForOpponent],
  );

  const isValidTargetPosition = useCallback(
    (position: BoardPosition, side: 'cpu' | 'player' = 'player') => {
      if (effectivePhase === 'pickTarget') {
        if (side === 'cpu' && pendingActor) {
          const actor = getUnitAt(state.player, pendingActor);
          if (!actor) return false;
          const illuminateTargets = getIlluminateTargets(actor, state.cpu);
          if (
            illuminateTargets.includes(position) &&
            (pendingAction === 'illuminate' || pendingAction == null)
          ) {
            return true;
          }
          const targetUnit = getUnitAt(state.cpu, position);
          if (targetUnit?.stealthActive) return false;
          const actorActions = availableActionsFor(pendingActor);
          const bowTargets = getBowTargets(state.player, state.cpu, pendingActor);
          const meleeTargets = getMeleeTargets(state.cpu);
          if (pendingAction === 'bowAttack') {
            return bowTargets.includes(position);
          }
          if (pendingAction === 'dualAttack') {
            return meleeTargets.includes(position);
          }
          if (pendingAction === 'meleeAttack') {
            return meleeTargets.includes(position);
          }
          if (pendingAction == null) {
            if (actor.attribute === 'bow') {
              if (actor.bowArrowsRemaining <= 0) {
                return (
                  actorActions.includes('meleeAttack') &&
                  meleeTargets.includes(position)
                );
              }
              return bowTargets.includes(position);
            }
            if (actor.attribute === 'dual') {
              return meleeTargets.includes(position);
            }
            if (actorActions.includes('meleeAttack')) {
              return meleeTargets.includes(position);
            }
          }
          return false;
        }
        if (side === 'player' && pendingActor) {
          const actorActions = availableActionsFor(pendingActor);
          if (
            pendingAction == null &&
            actorActions.includes('storm') &&
            position === pendingActor
          ) {
            return true;
          }
          return (
            pendingAction == null &&
            ((actorActions.includes('grantShield') &&
              getShieldTargetsForActor(state.player, pendingActor).includes(
                position,
              )) ||
              getHealTargets(state.player, pendingActor, selectionTurn).includes(
                position,
              ))
          );
        }
        return false;
      }
      if (effectivePhase === 'pickShield') {
        return (
          side === 'player' &&
          !!pendingActor &&
          getShieldTargetsForActor(state.player, pendingActor).includes(position)
        );
      }
      if (effectivePhase === 'pickHeal') {
        return (
          side === 'player' &&
          !!pendingActor &&
          getHealTargets(state.player, pendingActor, selectionTurn).includes(
            position,
          )
        );
      }
      if (effectivePhase === 'promoteUnit') {
        return (
          side === 'player' && session.promotion.validBacks.includes(position)
        );
      }
      if (effectivePhase === 'promoteSlot' && pendingPromoteFrom) {
        if (
          side === 'player' &&
          session.promotion.validBacks.includes(position)
        ) {
          return true;
        }
        return (
          side === 'player' && session.promotion.validFronts.includes(position)
        );
      }
      return false;
    },
    [
      availableActionsFor,
      effectivePhase,
      pendingAction,
      pendingActor,
      pendingPromoteFrom,
      selectionTurn,
      session.promotion.validBacks,
      session.promotion.validFronts,
      state,
    ],
  );

  const handleEnd = useCallback(() => {
    if (outcomeSavedRef.current || !result) return;
    outcomeSavedRef.current = true;
    onFinish({
      winner: result,
      playerCardIds: playerCards.map((c) => c.id),
      defeatedPlayerCardIds: getDefeated(state.player).map((unit) => unit.cardId),
      cpuDefeatedCount: getDefeated(state.cpu).length,
      defeatedCpuCards: buildDefeatedCpuLootCards(
        getDefeated(state.cpu),
        cpuCards,
      ),
      survivorPlayerCards: (() => {
        const defeatedIds = new Set(
          getDefeated(state.player).map((unit) => unit.cardId),
        );
        return playerCards.filter((card) => !defeatedIds.has(card.id));
      })(),
      defeatedPlayerCards: (() => {
        const defeatedIds = new Set(
          getDefeated(state.player).map((unit) => unit.cardId),
        );
        return playerCards.filter((card) => defeatedIds.has(card.id));
      })(),
      playerDeckPower: computeDeckPower(playerCards),
      opponentDeckPower: computeDeckPower(cpuCards),
    });
  }, [cpuCards, onFinish, playerCards, result, state.cpu, state.player]);

  const hint = useMemo(() => {
    if (session.promotion.hint && effectivePhase.startsWith('promote')) {
      return session.promotion.hint;
    }
    if (session.waitingForOpponent) {
      return '相手の選択を待っています…';
    }
    if (effectivePhase === 'waitOpponentPromotion') {
      return '相手の前衛補充を待っています…';
    }
    if (effectivePhase === 'ended') return null;
    if (effectivePhase === 'clash' && playback) {
      if (playback.phase === 'heal') return '回復';
      if (playback.phase === 'illuminate') return 'ステルス解除';
      if (playback.phase === 'shield') return '盾付与';
      if (playback.phase === 'attack') return '攻撃判定中';
    }
    if (effectivePhase === 'clash') return '攻撃判定中';
    if (effectivePhase === 'turnStartPoison') return '毒ダメージ';
    if (
      effectivePhase === 'pickTarget' &&
      (pendingAction === 'bowAttack' || pendingAction === 'meleeAttack')
    ) {
      return '攻撃先をタップ';
    }
    if (
      effectivePhase === 'pickTarget' &&
      (pendingAction === 'dualAttack' ||
        (pendingAction == null &&
          pendingActor != null &&
          getUnitAt(state.player, pendingActor)?.attribute === 'dual'))
    ) {
      return '両攻撃の主対象を選択';
    }
    if (effectivePhase === 'pickTarget' && pendingAction == null) {
      const actor = pendingActor
        ? getUnitAt(state.player, pendingActor)
        : null;
      if (actor?.attribute === 'heal' && pendingActor) {
        return getHealSelectionHint(
          state.player,
          pendingActor,
          selectionTurn,
          true,
        );
      }
      if (pendingActor) {
        const actorActions = availableActionsFor(pendingActor);
        if (
          actorActions.includes('storm') &&
          actorActions.includes('meleeAttack')
        ) {
          return '再タップで嵐、敵タップで近接攻撃\nそれ以外をタップで解除';
        }
        if (actorActions.includes('storm') && actorActions.length === 1) {
          return '再タップで嵐、それ以外をタップで解除';
        }
        if (
          actor?.attribute === 'illuminate' &&
          actorActions.includes('illuminate')
        ) {
          return getIlluminateSelectionHint(
            actor,
            state.cpu,
            actorActions.includes('meleeAttack'),
          );
        }
        if (
          actor?.attribute === 'defense' &&
          actorActions.includes('grantShield') &&
          actorActions.includes('meleeAttack')
        ) {
          return '味方タップで盾付与、敵タップで近接攻撃';
        }
      }
    }
    if (effectivePhase === 'pickTarget') return '攻撃先をタップ';
    if (effectivePhase === 'pickShield') return '味方タップで盾付与';
    if (effectivePhase === 'pickHeal' && pendingActor) {
      return getHealSelectionHint(
        state.player,
        pendingActor,
        selectionTurn,
        false,
      );
    }
    if (effectivePhase === 'promoteUnit') {
      return '前衛に移動する後衛カードを選択';
    }
    if (effectivePhase === 'promoteSlot') return '移動先の前衛スロットを選択';
    return '行動カードを選択';
  }, [
    availableActionsFor,
    effectivePhase,
    pendingAction,
    pendingActor,
    playback,
    selectionTurn,
    session.promotion.hint,
    session.waitingForOpponent,
    state,
  ]);

  const playerAlive = state.player
    .map((u, i) => (u.currentBp > 0 && u.position !== 'defeated' ? i : -1))
    .filter((i) => i >= 0);

  const turnLabel = `TURN ${authoritativeState.turn + 1}`;

  return {
    state,
    playerCards,
    cpuCards,
    playerAlive,
    clash: null,
    playback,
    turnStartPlayback,
    effectivePhase,
    pendingMain: null,
    pendingActor,
    pendingAction,
    pendingPromoteFrom,
    result,
    hint,
    turnLabel,
    boardPositions: BOARD_POSITIONS,
    getUnitAt,
    availableActionsFor,
    cancelSelection,
    cancelStormPick,
    isStormPickPending,
    isActionablePosition,
    isValidTargetPosition,
    handlePlayerCardClick,
    handleCpuCardClick,
    handleEnd,
    cancelShieldPick: cancelSelection,
    waitingForOpponent: session.waitingForOpponent,
  };
}

export type OnlineBattleController = ReturnType<typeof useOnlineBattleController>;
