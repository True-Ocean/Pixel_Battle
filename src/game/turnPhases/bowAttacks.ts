import type {
  BattleActionChoice,
  BattleSide,
  BattleState,
  BattleUnit,
} from '../../types/battle';
import { calcBowDamage, isBowTargetable } from '../bowCombat';
import { onExternalEffectToUnit } from '../ninjaCombat';
import type { BattleEvent } from '../../types/battle';
import { appendLog, getUnitAt, isAlive } from '../battleState';
import {
  getDisplayTurn,
  pushBattleEvent,
  unitSnapshot,
} from '../battleLogEvent';
import type { AttackPlayback } from '../turnResult';
import { battlePairKey } from './meleeAttacks';

export interface BowAttackInput {
  side: BattleSide;
  targetSide: BattleSide;
  action: BattleActionChoice;
  attacker: BattleUnit;
  target: BattleUnit;
}

export type BowBattleResolution = BowAttackInput & {
  bidirectional: boolean;
};

function collectBowAttackInputs(
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
): BowAttackInput[] {
  return (
    [
      { side: 'player' as const, action: choices.player },
      { side: 'cpu' as const, action: choices.cpu },
    ] as const
  )
    .filter(({ action }) => action.type === 'bowAttack')
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
        !isBowTargetable(target)
      ) {
        return null;
      }
      if (attacker.attribute !== 'bow' || attacker.bowArrowsRemaining <= 0) {
        return null;
      }
      return {
        side,
        targetSide: side === 'player' ? ('cpu' as const) : ('player' as const),
        action,
        attacker,
        target,
      };
    })
    .filter((a): a is BowAttackInput => a != null);
}

export function collectBowBattles(
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
): Map<string, BowBattleResolution> {
  const attackInputs = collectBowAttackInputs(choices, player, cpu);
  const battles = new Map<string, BowBattleResolution>();

  for (const attack of attackInputs) {
    const key = battlePairKey(
      attack.side,
      attack.action.actorPosition,
      attack.targetSide,
      attack.action.targetPosition,
    );
    const existing = battles.get(key);
    if (existing) {
      existing.bidirectional = true;
    } else {
      battles.set(key, { ...attack, bidirectional: false });
    }
  }

  return battles;
}

export function applyBowMutualStalemate(
  state: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
  attack: BowBattleResolution,
): { state: BattleState; playback: AttackPlayback } {
  let next = {
    ...state,
    player,
    cpu,
    log: [...state.log],
    events: [...state.events],
  };
  const turn = getDisplayTurn(next);

  const attackerBpFrom = attack.attacker.currentBp;
  const bpFrom = attack.target.currentBp;

  attack.attacker.bowArrowsRemaining -= 1;
  attack.target.bowArrowsRemaining -= 1;

  const playback: AttackPlayback = {
    kind: 'bow',
    fromSide: attack.side,
    fromPosition: attack.action.actorPosition,
    toSide: attack.targetSide,
    toPosition: attack.action.targetPosition,
    bidirectional: true,
    damage: 0,
    blocked: false,
    bpFrom,
    bpTo: attack.target.currentBp,
    attackerDamage: 0,
    attackerBpFrom,
    attackerBpTo: attack.attacker.currentBp,
    stateAfter: {
      ...next,
      player: player.map((u) => ({ ...u, poisonStacks: u.poisonStacks.map((s) => ({ ...s })) })),
      cpu: cpu.map((u) => ({ ...u, poisonStacks: u.poisonStacks.map((s) => ({ ...s })) })),
      log: [...next.log],
      events: [...next.events],
    },
  };

  next = appendLog(
    next,
    `${attack.attacker.name} ↔ ${attack.target.name}: 弓の矢が相殺（ノーダメージ）`,
  );
  next = pushBattleEvent(next, {
    type: 'attack',
    turn,
    side: attack.side,
    actionKind: 'bow',
    actor: unitSnapshot(
      attack.attacker,
      attackerBpFrom,
      attack.attacker.currentBp,
    ),
    target: unitSnapshot(attack.target, bpFrom, attack.target.currentBp),
    damageToTarget: 0,
    damageToActor: 0,
    damage: 0,
    actorId: attack.attacker.cardId,
    targetId: attack.target.cardId,
  });

  return { state: next, playback };
}

export function applyBowAttack(
  state: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
  attack: BowAttackInput,
): { state: BattleState; playback: AttackPlayback } {
  let next = {
    ...state,
    player,
    cpu,
    log: [...state.log],
    events: [...state.events],
  };
  const turn = getDisplayTurn(next);

  const attackerBpFrom = attack.attacker.currentBp;
  const bpFrom = attack.target.currentBp;
  const targetShieldConsumed = attack.target.hasShield;
  const blocked = targetShieldConsumed;

  let damageToTarget = calcBowDamage(attackerBpFrom);
  let deferredBlocked: BattleEvent | null = null;

  if (targetShieldConsumed) {
    damageToTarget = 0;
    attack.target.hasShield = false;
    next = appendLog(next, `${attack.target.name} の盾が弓攻撃を防いだ`);
    deferredBlocked = {
      type: 'blocked',
      turn,
      side: attack.side === 'player' ? 'cpu' : 'player',
      target: unitSnapshot(attack.target, bpFrom),
      blockContext: 'bow',
    };
  }

  onExternalEffectToUnit(attack.target);
  attack.target.currentBp = Math.max(0, attack.target.currentBp - damageToTarget);
  attack.attacker.bowArrowsRemaining -= 1;

  const playback: AttackPlayback = {
    kind: 'bow',
    fromSide: attack.side,
    fromPosition: attack.action.actorPosition,
    toSide: attack.targetSide,
    toPosition: attack.action.targetPosition,
    damage: damageToTarget,
    blocked,
    bpFrom,
    bpTo: attack.target.currentBp,
    attackerDamage: 0,
    attackerBpFrom,
    attackerBpTo: attack.attacker.currentBp,
    stateAfter: {
      ...next,
      player: player.map((u) => ({ ...u, poisonStacks: u.poisonStacks.map((s) => ({ ...s })) })),
      cpu: cpu.map((u) => ({ ...u, poisonStacks: u.poisonStacks.map((s) => ({ ...s })) })),
      log: [...next.log],
      events: [...next.events],
    },
  };

  next = appendLog(
    next,
    `${attack.attacker.name} → ${attack.target.name}: ${bpFrom}→${attack.target.currentBp}（弓）`,
  );
  next = pushBattleEvent(next, {
    type: 'attack',
    turn,
    side: attack.side,
    actionKind: 'bow',
    actor: unitSnapshot(
      attack.attacker,
      attackerBpFrom,
      attack.attacker.currentBp,
    ),
    target: unitSnapshot(attack.target, bpFrom, attack.target.currentBp),
    damageToTarget,
    damageToActor: 0,
    damage: damageToTarget,
    actorId: attack.attacker.cardId,
    targetId: attack.target.cardId,
  });
  if (deferredBlocked) {
    next = pushBattleEvent(next, deferredBlocked);
  }

  return { state: next, playback };
}
