import type {
  BattleActionChoice,
  BattleSide,
  BattleState,
  BattleUnit,
} from '../../types/battle';
import { compareActionOrder } from '../../config/attributePriority';
import { calcHealAmount } from '../healCombat';
import { onExternalEffectToUnit } from '../ninjaCombat';
import { appendLog, getUnitAt, isAlive } from '../battleState';
import {
  getDisplayTurn,
  pushBattleEvent,
  unitSnapshot,
} from '../battleLogEvent';
import type { HealPlayback } from '../turnResult';

export interface HealPhaseResult {
  state: BattleState;
  heals: HealPlayback[];
}

function applyHeal(
  state: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
  side: BattleSide,
  action: BattleActionChoice,
  heals: HealPlayback[],
): BattleState {
  if (action.type !== 'heal') return state;

  const field = side === 'player' ? player : cpu;
  const actor = getUnitAt(field, action.actorPosition);
  const target = getUnitAt(field, action.targetPosition);
  if (!actor || !target || !isAlive(actor) || !isAlive(target)) return state;
  if (actor.attribute !== 'heal' || actor.healUsesRemaining <= 0) return state;

  const amount = calcHealAmount(actor, target);
  const poisonStacksCleared = target.poisonStacks.length;
  if (amount <= 0 && poisonStacksCleared === 0) return state;

  const bpFrom = target.currentBp;
  onExternalEffectToUnit(target);
  target.currentBp = Math.min(target.maxBp, target.currentBp + amount);
  target.poisonStacks = [];
  target.poisonDotDamageReceived = false;
  actor.healUsesRemaining -= 1;

  heals.push({
    side,
    fromPosition: action.actorPosition,
    toPosition: action.targetPosition,
    amount,
    bpFrom,
    bpTo: target.currentBp,
    poisonStacksCleared,
  });

  const logParts = [
    amount > 0
      ? `回復（+${amount}、${bpFrom}→${target.currentBp}）`
      : null,
    poisonStacksCleared > 0 ? '毒解消' : null,
  ].filter((part): part is string => part != null);
  let next = appendLog(
    state,
    `${actor.name} が ${target.name} を${logParts.join('・')}`,
  );
  next = pushBattleEvent(next, {
    type: 'attack',
    turn: getDisplayTurn(state),
    side,
    actionKind: 'heal',
    actor: unitSnapshot(actor, actor.currentBp),
    target: unitSnapshot(target, bpFrom, target.currentBp),
    healAmount: amount,
    poisonStacksCleared,
    damage: amount,
    actorId: actor.cardId,
    targetId: target.cardId,
  });
  return next;
}

/** 癒：行動カードで選ばれた側を先行解決（ATTRIBUTE_SPEC §4.7） */
export function resolveHeals(
  state: BattleState,
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
): HealPhaseResult {
  const heals: HealPlayback[] = [];
  const order = (
    [
      { side: 'player' as const, action: choices.player },
      { side: 'cpu' as const, action: choices.cpu },
    ] as const
  )
    .filter(({ action }) => action.type === 'heal')
    .sort((a, b) => {
      const fieldA = a.side === 'player' ? player : cpu;
      const fieldB = b.side === 'player' ? player : cpu;
      const unitA = getUnitAt(fieldA, a.action.actorPosition);
      const unitB = getUnitAt(fieldB, b.action.actorPosition);
      if (!unitA || !unitB) return 0;
      return compareActionOrder(unitA, unitB);
    });

  let next = state;
  for (const { side, action } of order) {
    next = applyHeal(next, player, cpu, side, action, heals);
  }

  return { state: next, heals };
}
