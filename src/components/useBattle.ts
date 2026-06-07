import { useCallback, useEffect, useMemo, useState } from 'react';
import { PROTOTYPE_FAKE_LOSS } from '../config/balance';
import { computeDeckPower } from '../card';
import {
  autoPromoteCpu,
  BOARD_POSITIONS,
  createBattleState,
  getActionTypesForUnit,
  getBattleResult,
  getDefeated,
  getMeleeTargets,
  getPendingPromotionFronts,
  getPromotableBackPositions,
  getShieldTargetsForActor,
  getUnitAt,
  promoteUnit,
  pickCpuAction,
  resolveTurn,
} from '../game';
import type { Card } from '../types';
import type {
  BattleActionChoice,
  BattleActionType,
  BattleState,
  BoardPosition,
} from '../types/battle';
import { CLASH_MS } from './battleClashTypes';

export type BattleUiPhase =
  | 'opening'
  | 'pickMain'
  | 'pickTarget'
  | 'pickShield'
  | 'clash'
  | 'promoteUnit'
  | 'promoteSlot'
  | 'ended';

export interface BattlePlayback {
  attacks: ReturnType<typeof resolveTurn>['attacks'];
  shields: ReturnType<typeof resolveTurn>['shields'];
  pendingNext: BattleState;
  attackIndex: number;
  attackSubPhase: 'damage' | 'bp';
  phase: 'shield' | 'attack' | 'done';
}

export function useBattle(
  playerCards: Card[],
  cpuCards: Card[],
  onFinish: (outcome: {
    winner: 'player' | 'cpu';
    playerCardIds: string[];
    cpuDefeatedCount: number;
    playerDeckPower: number;
    opponentDeckPower: number;
    fauxLostCardId: string | null;
  }) => void,
) {
  const [state, setState] = useState<BattleState>(() =>
    createBattleState(playerCards, cpuCards),
  );
  const [uiPhase, setUiPhase] = useState<BattleUiPhase>('opening');
  const [revealedCpu, setRevealedCpu] = useState<Set<BoardPosition>>(
    () => new Set(),
  );
  const [pendingActor, setPendingActor] = useState<BoardPosition | null>(null);
  const [pendingAction, setPendingAction] = useState<BattleActionType | null>(
    null,
  );
  const [pendingPromoteFrom, setPendingPromoteFrom] =
    useState<BoardPosition | null>(null);
  const [playback, setPlayback] = useState<BattlePlayback | null>(null);
  const [outcomeSaved, setOutcomeSaved] = useState(false);
  const result = getBattleResult(state);
  const effectivePhase: BattleUiPhase = result && !playback ? 'ended' : uiPhase;
  const playerAlive = state.player
    .map((u, i) => (u.currentBp > 0 && u.position !== 'defeated' ? i : -1))
    .filter((i) => i >= 0);

  useEffect(() => {
    if (uiPhase !== 'opening') return;
    const order: BoardPosition[] = [
      'frontLeft',
      'frontRight',
      'backLeft',
      'backCenter',
      'backRight',
    ];
    if (revealedCpu.size >= order.length) {
      const t = window.setTimeout(() => setUiPhase('pickMain'), 280);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      const position = order[revealedCpu.size];
      if (position) {
        setRevealedCpu((prev) => new Set(prev).add(position));
      }
    }, 360);
    return () => window.clearTimeout(t);
  }, [uiPhase, revealedCpu]);

  const finishPlayback = useCallback((nextState: BattleState) => {
    const promotedCpu = autoPromoteCpu(nextState);
    setState(promotedCpu);
    setPlayback(null);
    setPendingActor(null);
    setPendingAction(null);
    const pendingFronts = getPendingPromotionFronts(promotedCpu.player);
    setUiPhase(pendingFronts.length > 0 ? 'promoteUnit' : 'pickMain');
  }, []);

  useEffect(() => {
    if (uiPhase !== 'promoteUnit' || playback || result) return;

    const fronts = getPendingPromotionFronts(state.player);
    if (fronts.length === 0) {
      setUiPhase('pickMain');
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
      setState(next);
      setPendingPromoteFrom(null);
      setUiPhase(
        getPendingPromotionFronts(next.player).length > 0
          ? 'promoteUnit'
          : 'pickMain',
      );
    }
  }, [uiPhase, playback, result, state]);

  useEffect(() => {
    if (!playback || uiPhase !== 'clash') return;
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

  const availableActionsFor = useCallback(
    (position: BoardPosition) =>
      getActionTypesForUnit(state.player, state.cpu, position),
    [state],
  );

  const commitTurn = useCallback(
    (playerChoice: BattleActionChoice) => {
      const cpuChoice = pickCpuAction(state);
      const result = resolveTurn(state, { player: playerChoice, cpu: cpuChoice });
      const firstAttack = result.attacks[0];
      setState(result.shieldState);
      setPlayback({
        attacks: result.attacks,
        shields: result.shields,
        pendingNext: result.state,
        attackIndex: 0,
        attackSubPhase: 'damage',
        phase: result.shields.length > 0 ? 'shield' : firstAttack ? 'attack' : 'done',
      });
      setUiPhase('clash');
    },
    [state],
  );

  const handlePlayerCardClick = useCallback(
    (position: BoardPosition | number) => {
      if (typeof position === 'number') return;
      if (effectivePhase === 'clash' || effectivePhase === 'opening') return;

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
        setState(next);
        setPendingPromoteFrom(null);
        setUiPhase(
          getPendingPromotionFronts(next.player).length > 0
            ? 'promoteUnit'
            : 'pickMain',
        );
        return;
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
        (effectivePhase === 'pickTarget' || effectivePhase === 'pickShield') &&
        pendingActor === position
      ) {
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
        setPendingAction(action);
        setUiPhase(action === 'meleeAttack' ? 'pickTarget' : 'pickShield');
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
    ],
  );

  const handleCpuCardClick = useCallback(
    (position: BoardPosition) => {
      if (effectivePhase !== 'pickTarget' || !pendingActor) {
        return;
      }
      if (!getMeleeTargets(state.cpu).includes(position)) return;
      commitTurn({
        type: 'meleeAttack',
        actorPosition: pendingActor,
        targetPosition: position,
      });
    },
    [effectivePhase, pendingActor, pendingAction, state.cpu, commitTurn],
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
        if (side === 'cpu') {
          return getMeleeTargets(state.cpu).includes(position);
        }
        return (
          pendingAction == null &&
          !!pendingActor &&
          getShieldTargetsForActor(state.player, pendingActor).includes(position)
        );
      }
      if (effectivePhase === 'pickShield') {
        return (
          side === 'player' &&
          !!pendingActor &&
          getShieldTargetsForActor(state.player, pendingActor).includes(position)
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
    [effectivePhase, state, pendingPromoteFrom, pendingActor, pendingAction],
  );

  const handleEnd = useCallback(() => {
    if (outcomeSaved || !result) return;
    setOutcomeSaved(true);
    let fauxLostCardId: string | null = null;
    if (result === 'cpu' && PROTOTYPE_FAKE_LOSS) {
      const idx = Math.floor(Math.random() * playerCards.length);
      fauxLostCardId = playerCards[idx]?.id ?? null;
    }
    onFinish({
      winner: result,
      playerCardIds: playerCards.map((c) => c.id),
      cpuDefeatedCount: getDefeated(state.cpu).length,
      playerDeckPower: computeDeckPower(playerCards),
      opponentDeckPower: computeDeckPower(cpuCards),
      fauxLostCardId,
    });
  }, [outcomeSaved, result, playerCards, state.cpu, onFinish]);

  const hint = useMemo(() => {
    if (effectivePhase === 'ended') return null;
    if (effectivePhase === 'opening') return 'カードオープン';
    if (effectivePhase === 'clash' && playback) {
      if (playback.phase === 'shield') return '盾付与';
      if (playback.phase === 'attack') return '攻撃';
      return '判定中';
    }
    if (effectivePhase === 'pickTarget' && pendingAction == null)
      return '攻撃先か盾先を選択';
    if (effectivePhase === 'pickTarget') return '攻撃対象を選択';
    if (effectivePhase === 'pickShield') return '盾対象を選択';
    if (effectivePhase === 'promoteUnit') {
      return '前衛に移動する後衛カードを選択';
    }
    if (effectivePhase === 'promoteSlot') return '移動先の前衛スロットを選択';
    return 'カードを選択';
  }, [effectivePhase, playback, pendingAction]);

  const turnLabel = effectivePhase === 'opening' ? null : `TURN ${state.turn + 1}`;

  return {
    state,
    playerCards,
    cpuCards,
    playerAlive,
    clash: null,
    playback,
    revealedCpu,
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
    isActionablePosition,
    isValidTargetPosition,
    handlePlayerCardClick,
    handleCpuCardClick,
    handleEnd,
    cancelShieldPick: cancelSelection,
  };
}
