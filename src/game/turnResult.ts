import type { BattleSide, BattleState, BoardPosition } from '../types/battle';

export interface PoisonDoTPlayback {
  side: BattleSide;
  position: BoardPosition;
  damage: number;
  bpFrom: number;
  bpTo: number;
}

export interface ShieldGrants {
  player: number[];
  cpu: number[];
}

export interface AttackPlayback {
  kind?: 'melee' | 'bow' | 'dual';
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
  /** 両属性の副攻撃（§4.5） */
  secondaryToPosition?: BoardPosition;
  secondaryDamage?: number;
  secondaryBlocked?: boolean;
  secondaryBpFrom?: number;
  secondaryBpTo?: number;
  /** 近接で毒スタックを付与した（攻撃側→主対象） */
  poisonGranted?: boolean;
  /** 一方的近接の反撃で毒を付与した（被攻撃側→攻撃側） */
  poisonCounterGranted?: boolean;
  stateAfter: BattleState;
}

export interface ShieldPlayback {
  side: BattleSide;
  fromPosition: BoardPosition;
  toPosition: BoardPosition;
}

export interface ResolveTurnResult {
  state: BattleState;
  /** 癒の後、盾付与前 */
  stateAfterTurnStart: BattleState;
  shieldState: BattleState;
  shieldGrants: ShieldGrants;
  attacks: AttackPlayback[];
  shields: ShieldPlayback[];
}
