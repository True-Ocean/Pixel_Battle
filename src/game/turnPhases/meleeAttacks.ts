import type {
  BattleActionChoice,
  BattleSide,
  BattleState,
  BattleUnit,
  BoardPosition,
} from '../../types/battle';
import { compareActionOrder } from '../../config/attributePriority';
import { applyFreeze } from '../iceCombat';
import { grantPoisonStack } from '../poisonCombat';
import { appendLog, getUnitAt, isAlive } from '../battleState';
import type { AttackPlayback } from '../turnResult';

const MELEE_COUNTER_RATIO_ONE_SIDED = 0.5;

export interface MeleePhaseResult {
  state: BattleState;
  attacks: AttackPlayback[];
}

export interface MeleeBattleInput {
  side: BattleSide;
  targetSide: BattleSide;
  action: BattleActionChoice;
  attacker: BattleUnit;
  target: BattleUnit;
}

export type MeleeBattleResolution = MeleeBattleInput & {
  bidirectional: boolean;
};

function cloneBattleStateFields(
  state: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
): BattleState {
  return {
    ...state,
    player,
    cpu,
    log: [...state.log],
    events: [...state.events],
  };
}

function battleKey(side: BattleSide, position: BoardPosition): string {
  return `${side}:${position}`;
}

export function battlePairKey(
  fromSide: BattleSide,
  fromPosition: BoardPosition,
  toSide: BattleSide,
  toPosition: BoardPosition,
): string {
  const aKey = battleKey(fromSide, fromPosition);
  const tKey = battleKey(toSide, toPosition);
  return [aKey, tKey].sort().join('|');
}

export function collectMeleeBattles(
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
): Map<string, MeleeBattleResolution> {
  const pendingAttacks = [
    { side: 'player' as const, action: choices.player },
    { side: 'cpu' as const, action: choices.cpu },
  ].filter(({ action }) => action.type === 'meleeAttack');

  const attackInputs: MeleeBattleInput[] = pendingAttacks
    .map(({ side, action }) => {
      const own = side === 'player' ? player : cpu;
      const enemy = side === 'player' ? cpu : player;
      const attacker = getUnitAt(own, action.actorPosition);
      const target = getUnitAt(enemy, action.targetPosition);
      if (!attacker || !target || !isAlive(attacker) || !isAlive(target)) {
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
    .filter((a): a is MeleeBattleInput => a != null);

  const battles = new Map<string, MeleeBattleResolution>();
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

function counterDamage(target: BattleUnit, bidirectional: boolean): number {
  const raw = target.currentBp;
  if (bidirectional) return raw;
  return Math.round(raw * MELEE_COUNTER_RATIO_ONE_SIDED);
}

export function applyMeleeBattle(
  state: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
  attack: MeleeBattleResolution,
): { state: BattleState; playback: AttackPlayback } {
  let next = cloneBattleStateFields(state, player, cpu);

  const attackerBpFrom = attack.attacker.currentBp;
  const bpFrom = attack.target.currentBp;
  const attackerBpAtMelee = attack.attacker.currentBp;
  const targetBpAtMelee = attack.target.currentBp;
  const attackerShieldConsumed = attack.attacker.hasShield;
  const targetShieldConsumed = attack.target.hasShield;
  const blocked = targetShieldConsumed;

  let damageToTarget = attack.attacker.currentBp;
  let damageToAttacker = counterDamage(attack.target, attack.bidirectional);

  if (attackerShieldConsumed) {
    damageToAttacker = 0;
    attack.attacker.hasShield = false;
    next = appendLog(next, `${attack.attacker.name} の盾が攻撃で壊れた`);
    next = {
      ...next,
      events: [
        ...next.events,
        {
          type: 'blocked',
          side: attack.side,
          targetId: attack.attacker.cardId,
        },
      ],
    };
  }
  if (targetShieldConsumed) {
    damageToTarget = 0;
    attack.target.hasShield = false;
    next = appendLog(next, `${attack.target.name} の盾が攻撃を防いだ`);
    next = {
      ...next,
      events: [
        ...next.events,
        {
          type: 'blocked',
          side: attack.side === 'player' ? 'cpu' : 'player',
          targetId: attack.target.cardId,
        },
      ],
    };
  }

  attack.attacker.currentBp = Math.max(
    0,
    attack.attacker.currentBp - damageToAttacker,
  );
  attack.target.currentBp = Math.max(0, attack.target.currentBp - damageToTarget);

  const freezeOnTarget =
    attack.attacker.attribute === 'ice' && !targetShieldConsumed;
  const poisonOnTarget =
    attack.attacker.attribute === 'poison' && !targetShieldConsumed;
  const poisonOnAttacker =
    attack.target.attribute === 'poison' &&
    !attack.bidirectional &&
    damageToAttacker > 0 &&
    !attackerShieldConsumed;

  if (freezeOnTarget) {
    applyFreeze(attack.target, next.turn);
    next = appendLog(
      next,
      `${attack.target.name} は凍結された（${attack.attacker.name}）`,
    );
  }
  if (poisonOnTarget) {
    grantPoisonStack(attack.target, attack.attacker, attackerBpAtMelee);
    next = appendLog(
      next,
      `${attack.target.name} に毒が付与された（${attack.attacker.name}）`,
    );
  }
  if (poisonOnAttacker) {
    grantPoisonStack(attack.attacker, attack.target, targetBpAtMelee);
    next = appendLog(
      next,
      `${attack.attacker.name} に毒が付与された（${attack.target.name}・反撃）`,
    );
  }

  const poisonGranted = poisonOnTarget;
  const poisonCounterGranted = poisonOnAttacker;
  const iceGranted = freezeOnTarget;
  const playback: AttackPlayback = {
    kind: 'melee',
    fromSide: attack.side,
    fromPosition: attack.action.actorPosition,
    toSide: attack.targetSide,
    toPosition: attack.action.targetPosition,
    bidirectional: attack.bidirectional,
    damage: damageToTarget,
    blocked,
    bpFrom,
    bpTo: attack.target.currentBp,
    attackerDamage: damageToAttacker,
    attackerBpFrom,
    attackerBpTo: attack.attacker.currentBp,
    poisonGranted,
    poisonCounterGranted,
    iceGranted,
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
    `${attack.attacker.name} ↔ ${attack.target.name}: ${attackerBpFrom}→${attack.attacker.currentBp}, ${bpFrom}→${attack.target.currentBp}`,
  );
  next = {
    ...next,
    events: [
      ...next.events,
      {
        type: 'attack',
        side: attack.side,
        actorId: attack.attacker.cardId,
        targetId: attack.target.cardId,
        damage: damageToTarget,
      },
    ],
  };

  return { state: next, playback };
}

export function resolveMeleeAttacks(
  state: BattleState,
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
): MeleePhaseResult {
  const battles = collectMeleeBattles(choices, player, cpu);
  const attacks: AttackPlayback[] = [];

  const orderedBattles = [...battles.values()].sort((a, b) =>
    compareActionOrder(a.attacker, b.attacker),
  );

  let next = cloneBattleStateFields(state, player, cpu);

  for (const battle of orderedBattles) {
    if (!isAlive(battle.attacker) || !isAlive(battle.target)) continue;
    const result = applyMeleeBattle(next, player, cpu, battle);
    next = result.state;
    attacks.push(result.playback);
  }

  return { state: next, attacks };
}
