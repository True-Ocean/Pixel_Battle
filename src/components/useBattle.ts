import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeDeckPower } from '../card';
import {
  autoPromoteCpu,
  BOARD_POSITIONS,
  createBattleState,
  getActionTypesForUnit,
  getBattleResult,
  getBowTargets,
  getDefeated,
  getMeleeTargets,
  getPendingPromotionFronts,
  getPromotableBackPositions,
  getHealSelectionHint,
  getHealTargets,
  getSelectionTurn,
  getShieldTargetsForActor,
  getUnitAt,
  hasBattleActionChoices,
  promoteUnit,
  pickCpuAction,
  pickPassAction,
  resolveTurn,
  startNextTurn,
} from '../game';
import { buildDefeatedCpuLootCards } from '../battle/graveyardLoot';
import type { PoisonDoTPlayback } from '../game/turnResult';
import type { Card, BattleOutcomeCore } from '../types';
import type {
  BattleActionChoice,
  BattleActionType,
  BattleState,
  BoardPosition,
} from '../types/battle';
import { CLASH_MS } from './battleClashTypes';

export type BattleUiPhase =
  | 'opening'
  | 'turnStartPoison'
  | 'pickMain'
  | 'pickTarget'
  | 'pickShield'
  | 'pickHeal'
  | 'clash'
  | 'promoteUnit'
  | 'promoteSlot'
  | 'ended';

export interface TurnStartPlayback {
  poisonDots: PoisonDoTPlayback[];
  stateAfter: BattleState;
  poisonSubPhase: 'damage' | 'bp';
}

export interface BattlePlayback {
  attacks: ReturnType<typeof resolveTurn>['attacks'];
  shields: ReturnType<typeof resolveTurn>['shields'];
  heals: ReturnType<typeof resolveTurn>['heals'];
  shieldState: BattleState;
  stateAfterHeal: BattleState;
  pendingNext: BattleState;
  attackIndex: number;
  attackSubPhase: 'damage' | 'bp';
  healSubPhase: 'damage' | 'bp';
  phase: 'heal' | 'shield' | 'attack' | 'done';
}

export function useBattle(
  playerCards: Card[],
  cpuCards: Card[],
  onFinish: (outcome: BattleOutcomeCore) => void,
) {
  const [state, setState] = useState<BattleState>(() =>
    createBattleState(playerCards, cpuCards),
  );
  const [uiPhase, setUiPhase] = useState<BattleUiPhase>('pickMain');
  const battleBegunRef = useRef(false);
  const [pendingActor, setPendingActor] = useState<BoardPosition | null>(null);
  const [pendingAction, setPendingAction] = useState<BattleActionType | null>(
    null,
  );
  const [pendingPromoteFrom, setPendingPromoteFrom] =
    useState<BoardPosition | null>(null);
  const [playback, setPlayback] = useState<BattlePlayback | null>(null);
  const [turnStartPlayback, setTurnStartPlayback] =
    useState<TurnStartPlayback | null>(null);
  /** 補充完了後: 戦闘後は新ターン開始、毒DoT後はカード選択へ */
  const [postPromotion, setPostPromotion] = useState<'beginTurn' | 'pickMain'>(
    'beginTurn',
  );
  const outcomeSavedRef = useRef(false);
  const result = getBattleResult(state);
  const effectivePhase: BattleUiPhase =
    result && !playback && !turnStartPlayback ? 'ended' : uiPhase;
  const playerAlive = state.player
    .map((u, i) => (u.currentBp > 0 && u.position !== 'defeated' ? i : -1))
    .filter((i) => i >= 0);

  const enterPostTurnStart = useCallback((afterState: BattleState) => {
    const promoted = autoPromoteCpu(afterState);
    setState(promoted);
    setTurnStartPlayback(null);
    if (getBattleResult(promoted)) {
      setUiPhase('ended');
      return;
    }
    const pendingFronts = getPendingPromotionFronts(promoted.player);
    if (pendingFronts.length > 0) {
      setPostPromotion('pickMain');
      setUiPhase('promoteUnit');
      return;
    }
    setUiPhase('pickMain');
  }, []);

  const beginTurnSelection = useCallback(
    (fromState: BattleState) => {
      if (getBattleResult(fromState)) {
        setUiPhase('ended');
        return;
      }
      const turnStart = startNextTurn(fromState);
      if (turnStart.poisonDots.length === 0) {
        enterPostTurnStart(turnStart.stateAfterDot);
        return;
      }
      setState(turnStart.stateBeforeDot);
      setTurnStartPlayback({
        poisonDots: turnStart.poisonDots,
        stateAfter: turnStart.stateAfterDot,
        poisonSubPhase: 'damage',
      });
      setUiPhase('turnStartPoison');
    },
    [enterPostTurnStart],
  );

  const finishPromotion = useCallback(
    (nextState: BattleState) => {
      setState(nextState);
      setPendingPromoteFrom(null);
      const pendingFronts = getPendingPromotionFronts(nextState.player);
      if (pendingFronts.length > 0) {
        setUiPhase('promoteUnit');
        return;
      }
      if (postPromotion === 'pickMain') {
        setPostPromotion('beginTurn');
        setUiPhase(getBattleResult(nextState) ? 'ended' : 'pickMain');
        return;
      }
      beginTurnSelection(nextState);
    },
    [postPromotion, beginTurnSelection],
  );

  useEffect(() => {
    if (battleBegunRef.current) return;
    battleBegunRef.current = true;
    beginTurnSelection(state);
  }, [beginTurnSelection, state]);

  const finishPlayback = useCallback(
    (nextState: BattleState) => {
      const promotedCpu = autoPromoteCpu(nextState);
      setState(promotedCpu);
      setPlayback(null);
      setPendingActor(null);
      setPendingAction(null);
      const pendingFronts = getPendingPromotionFronts(promotedCpu.player);
      if (pendingFronts.length > 0) {
        setPostPromotion('beginTurn');
        setUiPhase('promoteUnit');
        return;
      }
      beginTurnSelection(promotedCpu);
    },
    [beginTurnSelection],
  );

  useEffect(() => {
    if (uiPhase !== 'promoteUnit' || playback || result) return;

    const fronts = getPendingPromotionFronts(state.player);
    if (fronts.length === 0) {
      finishPromotion(state);
      return;
    }

    const forced = fronts
      .map((front) => ({
        front,
        backs: getPromotableBackPositions(state.player, front),
      }))
      .find(({ backs }) => backs.length === 1);

    if (forced) {
      const next = promoteUnit(state, 'player', forced.backs[0]!, forced.front);
      finishPromotion(next);
    }
  }, [uiPhase, playback, result, state, finishPromotion]);

  useEffect(() => {
    if (!turnStartPlayback || uiPhase !== 'turnStartPoison') return;
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
      enterPostTurnStart(turnStartPlayback.stateAfter);
    }, CLASH_MS.bp);
    return () => window.clearTimeout(t);
  }, [turnStartPlayback, uiPhase, enterPostTurnStart]);

  useEffect(() => {
    if (!playback || uiPhase !== 'clash') return;
    if (playback.phase === 'heal') {
      if (playback.healSubPhase === 'damage') {
        const t = window.setTimeout(
          () =>
            setPlayback((p) =>
              p ? { ...p, healSubPhase: 'bp' } : null,
            ),
          CLASH_MS.damage,
        );
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(
        () => {
          const firstAttack = playback.attacks[0];
          const nextPhase =
            playback.shields.length > 0
              ? 'shield'
              : firstAttack
                ? 'attack'
                : 'done';
          setState(playback.stateAfterHeal);
          if (nextPhase === 'shield' || nextPhase === 'attack') {
            setState(playback.shieldState);
          }
          setPlayback((p) =>
            p
              ? {
                  ...p,
                  phase: nextPhase,
                  attackIndex: 0,
                  attackSubPhase: 'damage',
                }
              : null,
          );
        },
        CLASH_MS.bp,
      );
      return () => window.clearTimeout(t);
    }
    if (playback.phase === 'shield') {
      const t = window.setTimeout(
        () => {
          const firstAttack = playback.attacks[0];
          if (firstAttack) {
            setPlayback((p) =>
              p
                ? {
                    ...p,
                    phase: 'attack',
                    attackIndex: 0,
                    attackSubPhase: 'damage',
                  }
                : null,
            );
          } else {
            setPlayback((p) => (p ? { ...p, phase: 'done' } : null));
          }
        },
        CLASH_MS.bp,
      );
      return () => window.clearTimeout(t);
    }
    if (playback.phase === 'attack') {
      const attack = playback.attacks[playback.attackIndex];
      if (!attack) {
        setPlayback((p) => (p ? { ...p, phase: 'done' } : null));
        return;
      }
      if (playback.attackSubPhase === 'damage') {
        const t = window.setTimeout(
          () =>
            setPlayback((p) =>
              p ? { ...p, attackSubPhase: 'bp' } : null,
            ),
          CLASH_MS.damage,
        );
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(
        () => {
          const nextIndex = playback.attackIndex + 1;
          const nextAttack = playback.attacks[nextIndex];
          setState(attack.stateAfter);
          if (nextAttack) {
            setPlayback((p) =>
              p
                ? {
                    ...p,
                    attackIndex: nextIndex,
                    attackSubPhase: 'damage',
                  }
                : null,
            );
          } else {
            setPlayback((p) => (p ? { ...p, phase: 'done' } : null));
          }
        },
        CLASH_MS.bp,
      );
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(
      () => finishPlayback(playback.pendingNext),
      CLASH_MS.exit,
    );
    return () => window.clearTimeout(t);
  }, [playback, uiPhase, finishPlayback]);

  const selectionTurn = getSelectionTurn(state);
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
    setUiPhase('pickMain');
    return true;
  }, [isStormPickPending]);

  const commitTurn = useCallback(
    (playerChoice: BattleActionChoice) => {
      const cpuChoice = pickCpuAction(state);
      const result = resolveTurn(state, { player: playerChoice, cpu: cpuChoice });
      const firstAttack = result.attacks[0];
      const hasHeals = result.heals.length > 0;
      setState(hasHeals ? state : result.shieldState);
      setPlayback({
        attacks: result.attacks,
        shields: result.shields,
        heals: result.heals,
        shieldState: result.shieldState,
        stateAfterHeal: result.stateAfterTurnStart,
        pendingNext: result.state,
        attackIndex: 0,
        attackSubPhase: 'damage',
        healSubPhase: 'damage',
        phase: hasHeals
          ? 'heal'
          : result.shields.length > 0
            ? 'shield'
            : firstAttack
              ? 'attack'
              : 'done',
      });
      setUiPhase('clash');
    },
    [state],
  );

  useEffect(() => {
    if (
      effectivePhase !== 'pickMain' ||
      playback ||
      turnStartPlayback ||
      result
    ) {
      return;
    }
    if (!hasBattleActionChoices(state, 'player')) {
      commitTurn(pickPassAction(state, 'player'));
    }
  }, [
    effectivePhase,
    playback,
    turnStartPlayback,
    result,
    state,
    commitTurn,
  ]);

  const handlePlayerCardClick = useCallback(
    (position: BoardPosition | number) => {
      if (typeof position === 'number') return;
      if (
        effectivePhase === 'clash' ||
        effectivePhase === 'turnStartPoison'
      ) {
        return;
      }

      if (effectivePhase === 'promoteUnit') {
        const fronts = getPendingPromotionFronts(state.player).filter((front) =>
          getPromotableBackPositions(state.player, front).includes(position),
        );
        if (fronts.length === 0) return;

        setPendingPromoteFrom(position);
        setUiPhase('promoteSlot');
        return;
      }

      if (effectivePhase === 'promoteSlot' && pendingPromoteFrom) {
        const promotableBacks = getPendingPromotionFronts(state.player).flatMap(
          (front) => getPromotableBackPositions(state.player, front),
        );
        if (promotableBacks.includes(position)) {
          if (position === pendingPromoteFrom) {
            setPendingPromoteFrom(null);
            setUiPhase('promoteUnit');
            return;
          }
          setPendingPromoteFrom(position);
          return;
        }

        const fronts = getPendingPromotionFronts(state.player).filter((front) =>
          getPromotableBackPositions(state.player, front).includes(
            pendingPromoteFrom,
          ),
        );
        if (!fronts.includes(position)) return;
        const next = promoteUnit(state, 'player', pendingPromoteFrom, position);
        finishPromotion(next);
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

      if (
        isStormPickPending() &&
        pendingActor !== position
      ) {
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
        setUiPhase('pickMain');
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
          setUiPhase('pickTarget');
          return;
        }
        setPendingAction(action);
        setUiPhase(
          action === 'grantShield'
            ? 'pickShield'
            : action === 'heal'
              ? 'pickHeal'
              : 'pickTarget',
        );
      } else {
        setPendingAction(null);
        setUiPhase('pickTarget');
      }
    },
    [
      effectivePhase,
      state,
      pendingPromoteFrom,
      pendingActor,
      pendingAction,
      commitTurn,
      availableActionsFor,
      finishPromotion,
      isStormPickPending,
      cancelStormPick,
    ],
  );

  const handleCpuCardClick = useCallback(
    (position: BoardPosition) => {
      if (effectivePhase !== 'pickTarget' || !pendingActor) {
        return;
      }
      const actor = getUnitAt(state.player, pendingActor);
      if (!actor) return;

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
      effectivePhase,
      pendingActor,
      pendingAction,
      state,
      commitTurn,
      availableActionsFor,
      cancelStormPick,
    ],
  );

  const cancelSelection = useCallback(() => {
    setPendingActor(null);
    setPendingAction(null);
    setPendingPromoteFrom(null);
    setUiPhase(
      getPendingPromotionFronts(state.player).length > 0
        ? 'promoteUnit'
        : 'pickMain',
    );
  }, [state.player]);

  const isActionablePosition = useCallback(
    (position: BoardPosition) => availableActionsFor(position).length > 0,
    [availableActionsFor],
  );

  const isValidTargetPosition = useCallback(
    (position: BoardPosition, side: 'cpu' | 'player' = 'player') => {
      if (effectivePhase === 'pickTarget') {
        if (side === 'cpu' && pendingActor) {
          const targetUnit = getUnitAt(state.cpu, position);
          if (targetUnit?.stealthActive) return false;
          const actor = getUnitAt(state.player, pendingActor);
          if (!actor) return false;
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
              getHealTargets(state.player, pendingActor, selectionTurn).includes(position))
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
          getHealTargets(state.player, pendingActor, selectionTurn).includes(position)
        );
      }
      if (effectivePhase === 'promoteUnit') {
        return (
          side === 'player' &&
          getPendingPromotionFronts(state.player).some((front) =>
            getPromotableBackPositions(state.player, front).includes(position),
          )
        );
      }
      if (effectivePhase === 'promoteSlot' && pendingPromoteFrom) {
        return (
          side === 'player' &&
          getPendingPromotionFronts(state.player)
            .filter((front) =>
              getPromotableBackPositions(state.player, front).includes(
                pendingPromoteFrom,
              ),
            )
            .includes(position)
        );
      }
      return false;
    },
    [
      effectivePhase,
      state,
      pendingPromoteFrom,
      pendingActor,
      pendingAction,
      availableActionsFor,
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
  }, [result, playerCards, state.cpu, state.player, onFinish, cpuCards]);

  const hint = useMemo(() => {
    if (effectivePhase === 'ended') return null;
    if (effectivePhase === 'turnStartPoison') return '毒ダメージ';
    if (effectivePhase === 'clash' && playback) {
      if (playback.phase === 'heal') return '回復';
      if (playback.phase === 'shield') return '盾付与';
      if (playback.phase === 'attack') return '攻撃判定中';
      return '攻撃判定中';
    }
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
    effectivePhase,
    playback,
    pendingAction,
    pendingActor,
    state,
    selectionTurn,
    availableActionsFor,
  ]);

  const turnLabel = `TURN ${state.turn + 1}`;

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
  };
}
