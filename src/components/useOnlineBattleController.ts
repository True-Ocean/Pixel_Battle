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
import type { BattleActionChoice, BattleActionType, BoardPosition } from '../types/battle';
import { applyOnlineNinjaStalemateBreak } from '../onlinePvp/roomApi';
import type { OnlineUiPhase } from '../onlinePvp/deriveOnlineUiPhase';
import type { OnlineBattleRole, OnlineBattleRoom } from '../onlinePvp/types';
import type { BattleUiPhase } from './useBattle';
import { useOnlineBattleSession } from './useOnlineBattleSession';

const CLASH_REPLAY_STUB_MS = 400;

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
}

export function useOnlineBattleController({
  room,
  role,
  playerCards,
  cpuCards,
  onFinish,
}: UseOnlineBattleControllerOptions) {
  const session = useOnlineBattleSession({ room, role });
  const [pendingActor, setPendingActor] = useState<BoardPosition | null>(null);
  const [pendingAction, setPendingAction] = useState<BattleActionType | null>(null);
  const outcomeSavedRef = useRef(false);
  const lastClashRevisionRef = useRef<number | null>(null);
  const stalemateBreakRef = useRef(false);

  const state =
    session.localState ??
    createBattleState(playerCards, cpuCards);

  const effectivePhase: BattleUiPhase = mapOnlineUiPhaseToBattle(
    session.uiPhase,
  );
  const result = getBattleResult(state);
  const selectionTurn = getSelectionTurn(state);
  const pendingPromoteFrom = session.promotionDraft.from;

  useEffect(() => {
    if (!room?.lastClash) return;
    const revision = room.battleRevision;
    if (lastClashRevisionRef.current === revision) return;
    lastClashRevisionRef.current = revision;
    session.setReplayOverlay({ kind: 'clash' });
    const timer = window.setTimeout(() => {
      session.setReplayOverlay(null);
    }, CLASH_REPLAY_STUB_MS);
    return () => window.clearTimeout(timer);
  }, [room?.battleRevision, room?.lastClash, session.setReplayOverlay]);

  useEffect(() => {
    const auto = session.promotion.autoSubmit;
    if (!auto || session.inputLocked) return;
    void session.submitPromotion(auto.from, auto.to);
  }, [session.promotion.autoSubmit, session.inputLocked, session.submitPromotion]);

  useEffect(() => {
    setPendingActor(null);
    setPendingAction(null);
  }, [room?.battleRevision]);

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
    (position: BoardPosition) => availableActionsFor(position).length > 0,
    [availableActionsFor],
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
    if (effectivePhase === 'waitOpponentPromotion') {
      return '相手の前衛補充を待っています…';
    }
    if (session.waitingForOpponent) {
      return '相手の選択を待っています…';
    }
    if (effectivePhase === 'ended') return null;
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
    selectionTurn,
    session.promotion.hint,
    session.waitingForOpponent,
    state,
  ]);

  const playerAlive = state.player
    .map((u, i) => (u.currentBp > 0 && u.position !== 'defeated' ? i : -1))
    .filter((i) => i >= 0);

  const turnLabel = `TURN ${state.turn + 1}`;

  return {
    state,
    playerCards,
    cpuCards,
    playerAlive,
    clash: null,
    playback: null,
    turnStartPlayback: null,
    effectivePhase:
      result && effectivePhase !== 'clash' && effectivePhase !== 'turnStartPoison'
        ? 'ended'
        : effectivePhase,
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
