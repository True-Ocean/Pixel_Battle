import type {
  BattleActionChoice,
  BattleSide,
  BattleState,
  BattleUnit,
  BoardPosition,
  StormEngulfHit,
} from '../../types/battle';
import { onExternalEffectToUnit } from '../ninjaCombat';
import {
  calcStormDamage,
  pickStormTargets,
} from '../stormCombat';
import { appendLog, getUnitAt, isAlive } from '../battleState';
import {
  getDisplayTurn,
  pushBattleEvent,
  unitSnapshot,
} from '../battleLogEvent';
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
  target: BattleUnit,
  damage: number,
  attackerName: string,
): { state: BattleState; hit: StormEngulfHit; bpFrom: number; bpTo: number } {
  let next = state;
  const bpFrom = target.currentBp;
  let actualDamage = damage;
  let shieldBroken = false;

  if (target.hasShield) {
    actualDamage = 0;
    shieldBroken = true;
    target.hasShield = false;
    next = appendLog(next, `${target.name} の盾が嵐を防いだ`);
  }

  onExternalEffectToUnit(target);
  target.currentBp = Math.max(0, target.currentBp - actualDamage);
  next = appendLog(
    next,
    `${attackerName} の嵐 → ${target.name}: ${bpFrom}→${target.currentBp}`,
  );

  return {
    state: next,
    hit: {
      target: unitSnapshot(target, bpFrom, target.currentBp),
      damage: actualDamage,
      shieldBroken,
    },
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
  const turn = getDisplayTurn(next);

  const enemyField = attack.targetSide === 'cpu' ? cpu : player;
  const targets = pickStormTargets(enemyField, random);
  const attackerBpFrom = attack.attacker.currentBp;
  const stormDamage = calcStormDamage(attackerBpFrom);

  next = pushBattleEvent(next, {
    type: 'storm_cast',
    turn,
    side: attack.side,
    actor: unitSnapshot(attack.attacker, attackerBpFrom),
    stormDamage,
    actorId: attack.attacker.cardId,
  });

  const stormHits: StormEngulfHit[] = [];

  const primaryPosition = targets[0]!;
  const primary = getUnitAt(enemyField, primaryPosition)!;
  const primaryHit = applyStormHit(
    next,
    primary,
    stormDamage,
    attack.attacker.name,
  );
  next = primaryHit.state;
  stormHits.push(primaryHit.hit);

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
        secondary,
        stormDamage,
        attack.attacker.name,
      );
      next = secondaryHit.state;
      stormHits.push(secondaryHit.hit);
      secondaryPosition = targets[1];
      secondaryDamage = secondaryHit.hit.damage;
      secondaryBlocked = secondaryHit.hit.shieldBroken;
      secondaryBpFrom = secondaryHit.bpFrom;
      secondaryBpTo = secondaryHit.bpTo;
    }
  }

  next = pushBattleEvent(next, {
    type: 'storm_engulf',
    turn,
    side: attack.side,
    stormDamage,
    stormHits,
  });

  attack.attacker.stormUsesRemaining -= 1;

  const playback: AttackPlayback = {
    kind: 'storm',
    fromSide: attack.side,
    fromPosition: attack.action.actorPosition,
    toSide: attack.targetSide,
    toPosition: primaryPosition,
    damage: primaryHit.hit.damage,
    blocked: primaryHit.hit.shieldBroken,
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
