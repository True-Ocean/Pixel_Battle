import type {
  BattleActionChoice,
  BattleSide,
  BattleState,
  BattleUnit,
} from '../../types/battle';
import { compareActionOrder } from '../../config/attributePriority';
import { isValidIlluminateTarget } from '../illuminateCombat';
import { onExternalEffectToUnit } from '../ninjaCombat';
import { appendLog, getUnitAt, isAlive } from '../battleState';
import {
  getDisplayTurn,
  pushBattleEvent,
  unitSnapshot,
} from '../battleLogEvent';
import type { IlluminatePlayback } from '../turnResult';

export interface IlluminatePhaseResult {
  state: BattleState;
  illuminates: IlluminatePlayback[];
}

function applyIlluminate(
  state: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
  side: BattleSide,
  action: BattleActionChoice,
  illuminates: IlluminatePlayback[],
): BattleState {
  if (action.type !== 'illuminate') return state;

  const ownField = side === 'player' ? player : cpu;
  const enemyField = side === 'player' ? cpu : player;
  const actor = getUnitAt(ownField, action.actorPosition);
  const target = getUnitAt(enemyField, action.targetPosition);
  if (!actor || !target || !isAlive(actor) || !isAlive(target)) return state;
  if (actor.attribute !== 'illuminate') return state;
  if (!isValidIlluminateTarget(actor, enemyField, action.targetPosition)) {
    return state;
  }

  onExternalEffectToUnit(target);
  actor.illuminatedNinjaCardIds.push(target.cardId);

  illuminates.push({
    side,
    fromPosition: action.actorPosition,
    toPosition: action.targetPosition,
  });

  let next = appendLog(
    state,
    `${actor.name} が ${target.name} の隠れ身を照らした`,
  );
  next = pushBattleEvent(next, {
    type: 'illuminated',
    turn: getDisplayTurn(state),
    side,
    actor: unitSnapshot(actor, actor.currentBp),
    target: unitSnapshot(target, target.currentBp),
    actorId: actor.cardId,
    targetId: target.cardId,
  });
  return next;
}

/** 照：癒の後・盾付与の前に解決 */
export function resolveIlluminates(
  state: BattleState,
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
): IlluminatePhaseResult {
  const illuminates: IlluminatePlayback[] = [];
  const order = (
    [
      { side: 'player' as const, action: choices.player },
      { side: 'cpu' as const, action: choices.cpu },
    ] as const
  )
    .filter(({ action }) => action.type === 'illuminate')
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
    next = applyIlluminate(next, player, cpu, side, action, illuminates);
  }

  return { state: next, illuminates };
}
