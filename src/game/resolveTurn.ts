import type {
  BattleActionChoice,
  BattleSide,
  BattleState,
  BattleUnit,
  BoardPosition,
  TurnChoices,
} from '../types/battle';
import {
  appendLog,
  getUnitAt,
  getUnitIndexAt,
  isAlive,
} from './battleState';

function cloneField(field: BattleUnit[]): BattleUnit[] {
  return field.map((u) => ({ ...u }));
}

function cloneBattleState(state: BattleState): BattleState {
  return {
    ...state,
    player: cloneField(state.player),
    cpu: cloneField(state.cpu),
    log: [...state.log],
    events: [...state.events],
  };
}

export interface ShieldGrants {
  player: number[];
  cpu: number[];
}

export interface AttackPlayback {
  fromSide: BattleSide;
  fromPosition: BoardPosition;
  toSide: BattleSide;
  toPosition: BoardPosition;
  bidirectional?: boolean;
  /** 防御側が受けるダメージ */
  damage: number;
  blocked: boolean;
  bpFrom: number;
  bpTo: number;
  /** 攻撃側が受けるダメージ */
  attackerDamage: number;
  attackerBpFrom: number;
  attackerBpTo: number;
  stateAfter: BattleState;
}

export interface ShieldPlayback {
  side: BattleSide;
  fromPosition: BoardPosition;
  toPosition: BoardPosition;
}

export interface ResolveTurnResult {
  state: BattleState;
  shieldState: BattleState;
  shieldGrants: ShieldGrants;
  attacks: AttackPlayback[];
  shields: ShieldPlayback[];
}

export function resolveTurn(
  state: BattleState,
  choices: TurnChoices,
): ResolveTurnResult {
  const player = cloneField(state.player);
  const cpu = cloneField(state.cpu);
  const working: BattleState = {
    ...state,
    player,
    cpu,
    turn: state.turn + 1,
  };

  const shieldGrants: ShieldGrants = { player: [], cpu: [] };
  const shields: ShieldPlayback[] = [];
  const attacks: AttackPlayback[] = [];

  let next = appendLog(working, `--- TURN ${working.turn} ---`);

  const applyShield = (side: BattleSide, action: BattleActionChoice) => {
    if (action.type !== 'grantShield') return;
    const field = side === 'player' ? player : cpu;
    const actor = getUnitAt(field, action.actorPosition);
    const target = getUnitAt(field, action.targetPosition);
    if (!actor || !target || !isAlive(actor) || !isAlive(target)) return;
    if (action.actorPosition === action.targetPosition) return;
    if (actor.attribute !== 'defense' || actor.defenseShieldUsed) return;
    if (target.hasShield) return;

    actor.defenseShieldUsed = true;
    target.hasShield = true;
    const targetIndex = getUnitIndexAt(field, action.targetPosition);
    if (targetIndex >= 0) shieldGrants[side].push(targetIndex);
    shields.push({
      side,
      fromPosition: action.actorPosition,
      toPosition: action.targetPosition,
    });
    next = appendLog(next, `${actor.name} が ${target.name} に盾を付与`);
    next.events.push({
      type: 'shield_granted',
      side,
      actorId: actor.cardId,
      targetId: target.cardId,
    });
  };

  applyShield('player', choices.player);
  applyShield('cpu', choices.cpu);
  const shieldState = cloneBattleState(next);

  const pendingAttacks = [
    { side: 'player' as const, action: choices.player },
    { side: 'cpu' as const, action: choices.cpu },
  ].filter(({ action }) => action.type === 'meleeAttack');

  const attackInputs = pendingAttacks
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
        damage: attacker.currentBp,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a != null);

  type BattleResolution = (typeof attackInputs)[number] & {
    bidirectional: boolean;
  };

  const battles = new Map<string, BattleResolution>();
  for (const attack of attackInputs) {
    const aKey = `${attack.side}:${attack.action.actorPosition}`;
    const tKey = `${attack.targetSide}:${attack.action.targetPosition}`;
    const battleKey = [aKey, tKey].sort().join('|');
    const existing = battles.get(battleKey);
    if (existing) {
      existing.bidirectional = true;
    } else {
      battles.set(battleKey, { ...attack, bidirectional: false });
    }
  }

  const orderedBattles = [...battles.values()].sort((a, b) => {
    const attackerBpA = a.attacker.currentBp;
    const attackerBpB = b.attacker.currentBp;
    if (attackerBpA !== attackerBpB) return attackerBpB - attackerBpA;

    const maxA = Math.max(a.attacker.currentBp, a.target.currentBp);
    const maxB = Math.max(b.attacker.currentBp, b.target.currentBp);
    if (maxA !== maxB) return maxB - maxA;
    return b.target.currentBp - a.target.currentBp;
  });

  for (const attack of orderedBattles) {
    if (!isAlive(attack.attacker) || !isAlive(attack.target)) continue;

    const attackerBpFrom = attack.attacker.currentBp;
    const bpFrom = attack.target.currentBp;
    const attackerShieldConsumed = attack.attacker.hasShield;
    const targetShieldConsumed = attack.target.hasShield;
    const blocked = targetShieldConsumed;

    let damageToTarget = attackerBpFrom;
    let damageToAttacker = bpFrom;

    if (attackerShieldConsumed) {
      damageToAttacker = 0;
      attack.attacker.hasShield = false;
      next = appendLog(next, `${attack.attacker.name} の盾が攻撃で壊れた`);
      next.events.push({
        type: 'blocked',
        side: attack.side,
        targetId: attack.attacker.cardId,
      });
    }
    if (targetShieldConsumed) {
      damageToTarget = 0;
      attack.target.hasShield = false;
      next = appendLog(next, `${attack.target.name} の盾が攻撃を防いだ`);
      next.events.push({
        type: 'blocked',
        side: attack.side === 'player' ? 'cpu' : 'player',
        targetId: attack.target.cardId,
      });
    }
    attack.attacker.currentBp = Math.max(
      0,
      attack.attacker.currentBp - damageToAttacker,
    );
    attack.target.currentBp = Math.max(0, attack.target.currentBp - damageToTarget);
    attacks.push({
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
      stateAfter: cloneBattleState(next),
    });
    next = appendLog(
      next,
      `${attack.attacker.name} ↔ ${attack.target.name}: ${attackerBpFrom}→${attack.attacker.currentBp}, ${bpFrom}→${attack.target.currentBp}`,
    );
    next.events.push({
      type: 'attack',
      side: attack.side,
      actorId: attack.attacker.cardId,
      targetId: attack.target.cardId,
      damage: damageToTarget,
    });
  }

  for (const field of [player, cpu]) {
    for (const unit of field) {
      if (unit.position !== 'defeated' && unit.currentBp <= 0) {
        unit.position = 'defeated';
        unit.hasShield = false;
        next = appendLog(next, `${unit.name} は撃破された`);
        next.events.push({ type: 'defeated', targetId: unit.cardId });
      }
    }
  }

  return { state: next, shieldState, shieldGrants, attacks, shields };
}

export function promoteUnit(
  state: BattleState,
  side: BattleSide,
  from: BoardPosition,
  to: BoardPosition,
): BattleState {
  const next: BattleState = {
    ...state,
    player: cloneField(state.player),
    cpu: cloneField(state.cpu),
    log: [...state.log],
    events: [...state.events],
  };
  const field = side === 'player' ? next.player : next.cpu;
  const unit = getUnitAt(field, from);
  if (!unit || getUnitAt(field, to)) return state;
  unit.position = to;
  next.log.push(`${unit.name} が前衛へ移動`);
  next.events.push({
    type: 'promoted',
    side,
    actorId: unit.cardId,
    from,
    to,
  });
  return next;
}
