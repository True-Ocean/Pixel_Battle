import type { BattleSide, BattleState, BoardPosition } from '../types/battle';

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
