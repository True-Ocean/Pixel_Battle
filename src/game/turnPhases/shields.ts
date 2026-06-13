import type {
  BattleActionChoice,
  BattleSide,
  BattleState,
  BattleUnit,
} from '../../types/battle';
import { compareActionOrder } from '../../config/attributePriority';
import { appendLog, getUnitAt, getUnitIndexAt, isAlive } from '../battleState';
import {
  getDisplayTurn,
  pushBattleEvent,
  unitSnapshot,
} from '../battleLogEvent';
import { onExternalEffectToUnit } from '../ninjaCombat';
import type { ShieldGrants, ShieldPlayback } from '../turnResult';

export interface ShieldPhaseResult {
  state: BattleState;
  shieldGrants: ShieldGrants;
  shields: ShieldPlayback[];
}

function applyShieldGrant(
  state: BattleState,
  player: BattleUnit[],
  cpu: BattleUnit[],
  side: BattleSide,
  action: BattleActionChoice,
  shieldGrants: ShieldGrants,
  shields: ShieldPlayback[],
): BattleState {
  if (action.type !== 'grantShield') return state;

  const field = side === 'player' ? player : cpu;
  const actor = getUnitAt(field, action.actorPosition);
  const target = getUnitAt(field, action.targetPosition);
  if (!actor || !target || !isAlive(actor) || !isAlive(target)) return state;
  if (action.actorPosition === action.targetPosition) return state;
  if (actor.attribute !== 'defense' || actor.defenseShieldUsed) return state;
  if (target.hasShield) return state;

  actor.defenseShieldUsed = true;
  onExternalEffectToUnit(target);
  target.hasShield = true;
  const targetIndex = getUnitIndexAt(field, action.targetPosition);
  if (targetIndex >= 0) shieldGrants[side].push(targetIndex);
  shields.push({
    side,
    fromPosition: action.actorPosition,
    toPosition: action.targetPosition,
  });

  let next = appendLog(state, `${actor.name} が ${target.name} に盾を付与`);
  next = pushBattleEvent(next, {
    type: 'shield_granted',
    turn: getDisplayTurn(state),
    side,
    actor: unitSnapshot(actor, actor.currentBp),
    target: unitSnapshot(target, target.currentBp),
    actorId: actor.cardId,
    targetId: target.cardId,
  });
  return next;
}

export function resolveShields(
  state: BattleState,
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
  player: BattleUnit[],
  cpu: BattleUnit[],
): ShieldPhaseResult {
  const shieldGrants: ShieldGrants = { player: [], cpu: [] };
  const shields: ShieldPlayback[] = [];

  const order = (
    [
      { side: 'player' as const, action: choices.player },
      { side: 'cpu' as const, action: choices.cpu },
    ] as const
  )
    .filter(({ action }) => action.type === 'grantShield')
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
    next = applyShieldGrant(next, player, cpu, side, action, shieldGrants, shields);
  }

  return { state: next, shieldGrants, shields };
}
