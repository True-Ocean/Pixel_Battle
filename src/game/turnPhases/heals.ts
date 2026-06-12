import type { BattleActionChoice, BattleState } from '../../types/battle';
import { compareActionOrder } from '../../config/attributePriority';
import { getUnitAt, isAlive } from '../battleState';

/** 癒：行動カードで選ばれた側を先行解決（Phase 5 で実装） */
export function resolveHeals(
  state: BattleState,
  choices: { player: BattleActionChoice; cpu: BattleActionChoice },
): BattleState {
  const pending = (
    [
      { side: 'player' as const, action: choices.player },
      { side: 'cpu' as const, action: choices.cpu },
    ] as const
  ).filter(({ action }) => action.type === 'heal');

  if (pending.length === 0) return state;

  pending.sort((a, b) => {
    const fieldA = a.side === 'player' ? state.player : state.cpu;
    const fieldB = b.side === 'player' ? state.player : state.cpu;
    const unitA = getUnitAt(fieldA, a.action.actorPosition);
    const unitB = getUnitAt(fieldB, b.action.actorPosition);
    if (!unitA || !unitB) return 0;
    return compareActionOrder(unitA, unitB);
  });

  for (const { side, action } of pending) {
    if (action.type !== 'heal') continue;
    const field = side === 'player' ? state.player : state.cpu;
    const actor = getUnitAt(field, action.actorPosition);
    const target = getUnitAt(field, action.targetPosition);
    if (!actor || !target || !isAlive(actor) || !isAlive(target)) continue;
    if (actor.attribute !== 'heal' || actor.healUsesRemaining <= 0) continue;
    // Phase 5: 回復処理
  }

  return state;
}
