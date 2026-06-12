import type {
  BattleActionChoice,
  BattleSide,
  BattleState,
  BattleUnit,
  BoardPosition,
} from '../../types/battle';
import {
  calcStormDamage,
  pickStormTargets,
} from '../stormCombat';
import { appendLog, getUnitAt, isAlive } from '../battleState';
import type { AttackPlayback } from '../turnResult';

export interface StormAttackInput {
  side: BattleSide;
  targetSide: BattleSide;
  action: BattleActionChoice;
  attacker: BattleUnit;
}

function cloneStateSnapshot(
  next: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
): BattleState {
  return {
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
  };
}

export function collectStormAttacks(
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
): StormAttackInput[] {
  return (
    [
      { side: 'player' as const, action: choices.player },
      { side: 'cpu' as const, action: choices.cpu },
    ] as const
  )
    .filter(({ action }) => action.type === 'storm')
    .map(({ side, action }) => {
      const own = side === 'player' ? player : cpu;
      const attacker = getUnitAt(own, action.actorPosition);
      if (!attacker || !isAlive(attacker)) return null;
      if (attacker.attribute !== 'storm' || attacker.stormUsesRemaining <= 0) {
        return null;
      }
      return {
        side,
        targetSide: side === 'player' ? ('cpu' as const) : ('player' as const),
        action,
        attacker,
      };
    })
    .filter((a): a is StormAttackInput => a != null);
}

function applyStormHit(
  state: BattleState,
  side: BattleSide,
  targetSide: BattleSide,
  attacker: BattleUnit,
  target: BattleUnit,
  damage: number,
): { state: BattleState; damage: number; blocked: boolean; bpFrom: number; bpTo: number } {
  let next = state;
  const bpFrom = target.currentBp;
  let actualDamage = damage;
  let blocked = false;

  if (target.hasShield) {
    actualDamage = 0;
    blocked = true;
    target.hasShield = false;
    next = appendLog(next, `${target.name} の盾が嵐を防いだ`);
    next = {
      ...next,
      events: [
        ...next.events,
        {
          type: 'blocked',
          side: targetSide,
          targetId: target.cardId,
        },
      ],
    };
  }

  target.currentBp = Math.max(0, target.currentBp - actualDamage);
  next = appendLog(
    next,
    `${attacker.name} の嵐 → ${target.name}: ${bpFrom}→${target.currentBp}`,
  );
  next = {
    ...next,
    events: [
      ...next.events,
      {
        type: 'attack',
        side,
        actorId: attacker.cardId,
        targetId: target.cardId,
        damage: actualDamage,
      },
    ],
  };

  return {
    state: next,
    damage: actualDamage,
    blocked,
    bpFrom,
    bpTo: target.currentBp,
  };
}

export function applyStormAttack(
  state: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
  attack: StormAttackInput,
  random: () => number = Math.random,
): { state: BattleState; playback: AttackPlayback } {
  let next = {
    ...state,
    player,
    cpu,
    log: [...state.log],
    events: [...state.events],
  };

  const enemyField = attack.targetSide === 'cpu' ? cpu : player;
  const targets = pickStormTargets(enemyField, random);
  const attackerBpFrom = attack.attacker.currentBp;
  const stormDamage = calcStormDamage(attackerBpFrom);

  const primaryPosition = targets[0]!;
  const primary = getUnitAt(enemyField, primaryPosition)!;
  const primaryHit = applyStormHit(
    next,
    attack.side,
    attack.targetSide,
    attack.attacker,
    primary,
    stormDamage,
  );
  next = primaryHit.state;

  let secondaryPosition: BoardPosition | undefined;
  let secondaryDamage: number | undefined;
  let secondaryBlocked: boolean | undefined;
  let secondaryBpFrom: number | undefined;
  let secondaryBpTo: number | undefined;

  if (targets.length > 1 && isAlive(attack.attacker)) {
    const secondary = getUnitAt(enemyField, targets[1]!);
    if (secondary && isAlive(secondary)) {
      const secondaryHit = applyStormHit(
        next,
        attack.side,
        attack.targetSide,
        attack.attacker,
        secondary,
        stormDamage,
      );
      next = secondaryHit.state;
      secondaryPosition = targets[1];
      secondaryDamage = secondaryHit.damage;
      secondaryBlocked = secondaryHit.blocked;
      secondaryBpFrom = secondaryHit.bpFrom;
      secondaryBpTo = secondaryHit.bpTo;
    }
  }

  attack.attacker.stormUsesRemaining -= 1;

  const playback: AttackPlayback = {
    kind: 'storm',
    fromSide: attack.side,
    fromPosition: attack.action.actorPosition,
    toSide: attack.targetSide,
    toPosition: primaryPosition,
    damage: primaryHit.damage,
    blocked: primaryHit.blocked,
    bpFrom: primaryHit.bpFrom,
    bpTo: primaryHit.bpTo,
    attackerDamage: 0,
    attackerBpFrom,
    attackerBpTo: attack.attacker.currentBp,
    secondaryToPosition: secondaryPosition,
    secondaryDamage,
    secondaryBlocked,
    secondaryBpFrom,
    secondaryBpTo,
    stateAfter: cloneStateSnapshot(next, player, cpu),
  };

  return { state: next, playback };
}
