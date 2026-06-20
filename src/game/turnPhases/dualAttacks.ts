import type {
  BattleActionChoice,
  BattleActionType,
  BattleSide,
  BattleState,
  BattleUnit,
  BoardPosition,
} from '../../types/battle';
import {
  calcDualSecondaryDamage,
  getDualSecondaryTarget,
  isDualTargetable,
} from '../dualCombat';
import type { BattleEvent } from '../../types/battle';
import { appendLog, getUnitAt, isAlive } from '../battleState';
import {
  getDisplayTurn,
  pushBattleEvent,
  unitSnapshot,
} from '../battleLogEvent';
import type { AttackPlayback } from '../turnResult';
import {
  applyMeleeBattle,
  battlePairKey,
  type MeleeBattleResolution,
} from './meleeAttacks';

export interface DualAttackInput {
  side: BattleSide;
  targetSide: BattleSide;
  action: BattleActionChoice;
  attacker: BattleUnit;
  target: BattleUnit;
}

function isMeleeLikeAction(type: BattleActionType): boolean {
  return type === 'meleeAttack' || type === 'dualAttack';
}

export function isBidirectionalMeleePair(
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  side: BattleSide,
  actorPosition: BoardPosition,
  targetPosition: BoardPosition,
): boolean {
  const other = side === 'player' ? choices.cpu : choices.player;
  if (!isMeleeLikeAction(other.type)) return false;
  return (
    other.actorPosition === targetPosition &&
    other.targetPosition === actorPosition
  );
}

export function collectDualAttacks(
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
): DualAttackInput[] {
  return (
    [
      { side: 'player' as const, action: choices.player },
      { side: 'cpu' as const, action: choices.cpu },
    ] as const
  )
    .filter(({ action }) => action.type === 'dualAttack')
    .map(({ side, action }) => {
      const own = side === 'player' ? player : cpu;
      const enemy = side === 'player' ? cpu : player;
      const attacker = getUnitAt(own, action.actorPosition);
      const target = getUnitAt(enemy, action.targetPosition);
      if (
        !attacker ||
        !target ||
        !isAlive(attacker) ||
        !isAlive(target) ||
        !isDualTargetable(target)
      ) {
        return null;
      }
      if (attacker.attribute !== 'dual') return null;
      return {
        side,
        targetSide: side === 'player' ? ('cpu' as const) : ('player' as const),
        action,
        attacker,
        target,
      };
    })
    .filter((a): a is DualAttackInput => a != null);
}

export function applyDualAttack(
  state: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
  attack: DualAttackInput,
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  resolvedMainPairs: Set<string>,
): { state: BattleState; playback: AttackPlayback } {
  const attackerBpAtAction = attack.attacker.currentBp;
  const pairKey = battlePairKey(
    attack.side,
    attack.action.actorPosition,
    attack.targetSide,
    attack.action.targetPosition,
  );
  const bidirectional = isBidirectionalMeleePair(
    choices,
    attack.side,
    attack.action.actorPosition,
    attack.action.targetPosition,
  );

  let next = state;
  let playback: AttackPlayback;

  if (!resolvedMainPairs.has(pairKey)) {
    const meleeBattle: MeleeBattleResolution = {
      ...attack,
      bidirectional,
    };
    const mainResult = applyMeleeBattle(next, player, cpu, meleeBattle, 'dual_primary');
    next = mainResult.state;
    playback = { ...mainResult.playback, kind: 'dual' };
    resolvedMainPairs.add(pairKey);
  } else {
    const attackerBpFrom = attack.attacker.currentBp;
    playback = {
      kind: 'dual',
      fromSide: attack.side,
      fromPosition: attack.action.actorPosition,
      toSide: attack.targetSide,
      toPosition: attack.action.targetPosition,
      bidirectional,
      damage: 0,
      blocked: false,
      bpFrom: attack.target.currentBp,
      bpTo: attack.target.currentBp,
      attackerDamage: 0,
      attackerBpFrom,
      attackerBpTo: attack.attacker.currentBp,
      stateAfter: {
        ...next,
        player: player.map((u) => ({
          ...u,
          poisonStacks: u.poisonStacks.map((s) => ({ ...s })),
        })),
        cpu: cpu.map((u) => ({
          ...u,
          poisonStacks: u.poisonStacks.map((s) => ({ ...s })),
        })),
        log: [...next.log],
        events: [...next.events],
      },
    };
  }

  // 副攻撃は主近接と同時（§4.5）。主近接の反撃で撃破されても副攻撃は確定する。
  const enemyField = attack.targetSide === 'cpu' ? cpu : player;
  const secondary = getDualSecondaryTarget(
    attack.action.targetPosition,
    enemyField,
  );
  if (!secondary) {
    return { state: next, playback };
  }

  const secondaryBpFrom = secondary.unit.currentBp;
  const turn = getDisplayTurn(next);
  let secondaryDamage = calcDualSecondaryDamage(attackerBpAtAction);
  let secondaryBlocked = false;
  let deferredBlocked: BattleEvent | null = null;

  if (secondary.unit.hasShield) {
    secondaryDamage = 0;
    secondaryBlocked = true;
    secondary.unit.hasShield = false;
    next = appendLog(next, `${secondary.unit.name} の盾が副攻撃を防いだ`);
    deferredBlocked = {
      type: 'blocked',
      turn,
      side: attack.targetSide,
      target: unitSnapshot(secondary.unit, secondaryBpFrom),
      blockContext: 'dual_secondary',
    };
  }

  secondary.unit.currentBp = Math.max(0, secondary.unit.currentBp - secondaryDamage);

  playback = {
    ...playback,
    secondaryToPosition: secondary.position,
    secondaryDamage,
    secondaryBlocked,
    secondaryBpFrom,
    secondaryBpTo: secondary.unit.currentBp,
    stateAfter: {
      ...next,
      player: player.map((u) => ({
        ...u,
        poisonStacks: u.poisonStacks.map((s) => ({ ...s })),
      })),
      cpu: cpu.map((u) => ({
        ...u,
        poisonStacks: u.poisonStacks.map((s) => ({ ...s })),
      })),
      log: [...next.log],
      events: [...next.events],
    },
  };

  next = appendLog(
    next,
    `${attack.attacker.name} の副攻撃 → ${secondary.unit.name}: ${secondaryBpFrom}→${secondary.unit.currentBp}`,
  );
  next = pushBattleEvent(next, {
    type: 'attack',
    turn,
    side: attack.side,
    actionKind: 'dual_secondary',
    actor: unitSnapshot(attack.attacker, attackerBpAtAction),
    target: unitSnapshot(
      secondary.unit,
      secondaryBpFrom,
      secondary.unit.currentBp,
    ),
    damageToTarget: secondaryDamage,
    damageToActor: 0,
    damage: secondaryDamage,
    actorId: attack.attacker.cardId,
    targetId: secondary.unit.cardId,
  });
  if (deferredBlocked) {
    next = pushBattleEvent(next, deferredBlocked);
  }

  return { state: next, playback };
}
