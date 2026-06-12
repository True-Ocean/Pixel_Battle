import type {
  BattleSide,
  BattleState,
  BattleUnit,
  BoardPosition,
  TurnChoices,
} from '../types/battle';
import { getUnitAt } from './battleState';
import { applyDefeated } from './turnPhases/defeated';
import { resolveHeals } from './turnPhases/heals';
import { resolveCombatAttacks } from './turnPhases/combatAttacks';
import { resolveShields } from './turnPhases/shields';
import type { ResolveTurnResult } from './turnResult';

export type {
  AttackPlayback,
  ResolveTurnResult,
  ShieldGrants,
  ShieldPlayback,
} from './turnResult';

function cloneField(field: BattleUnit[]): BattleUnit[] {
  return field.map((u) => ({ ...u, poisonStacks: u.poisonStacks.map((s) => ({ ...s })) }));
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

export interface ResolveTurnOptions {
  random?: () => number;
}

export function resolveTurn(
  state: BattleState,
  choices: TurnChoices,
  options?: ResolveTurnOptions,
): ResolveTurnResult {
  const player = cloneField(state.player);
  const cpu = cloneField(state.cpu);

  let next: BattleState = {
    ...state,
    player,
    cpu,
    log: [...state.log],
    events: [...state.events],
  };

  const healResult = resolveHeals(next, choices, player, cpu);
  next = healResult.state;
  const stateAfterTurnStart = cloneBattleState(next);

  const shieldResult = resolveShields(next, choices, player, cpu);
  next = shieldResult.state;
  const shieldState = cloneBattleState(next);

  const combatResult = resolveCombatAttacks(
    next,
    choices,
    player,
    cpu,
    options?.random,
  );
  next = combatResult.state;

  next = applyDefeated(next, player, cpu);
  next = { ...next, turn: state.turn + 1 };

  return {
    state: next,
    stateAfterTurnStart,
    shieldState,
    shieldGrants: shieldResult.shieldGrants,
    heals: healResult.heals,
    attacks: combatResult.attacks,
    shields: shieldResult.shields,
  };
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
