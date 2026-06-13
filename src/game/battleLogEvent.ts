import type {
  Attribute,
  BattleEvent,
  BattleState,
  BattleUnit,
} from '../types/battle';

export type BattleLogActionKind =
  | 'melee'
  | 'bow'
  | 'dual_primary'
  | 'dual_secondary'
  | 'storm'
  | 'heal'
  | 'poison_dot';

export interface BattleLogUnitSnapshot {
  name: string;
  attribute: Attribute;
  bp: number;
  bpAfter?: number;
}

export function getDisplayTurn(state: BattleState): number {
  return state.turn + 1;
}

export function unitSnapshot(
  unit: BattleUnit,
  bp: number,
  bpAfter?: number,
): BattleLogUnitSnapshot {
  return {
    name: unit.name,
    attribute: unit.attribute,
    bp,
    bpAfter,
  };
}

export function pushBattleEvent(
  state: BattleState,
  event: BattleEvent,
): BattleState {
  return { ...state, events: [...state.events, event] };
}
