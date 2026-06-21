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
  kind?: 'melee' | 'bow' | 'dual' | 'storm';
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
  /** 近接で凍結を付与した（攻撃側→主対象） */
  iceGranted?: boolean;
  /** 氷に近接した攻撃側へ凍結を付与した（主対象→攻撃側） */
  iceCounterGranted?: boolean;
  stateAfter: BattleState;
}

export interface ShieldPlayback {
  side: BattleSide;
  fromPosition: BoardPosition;
  toPosition: BoardPosition;
}

export interface HealPlayback {
  side: BattleSide;
  fromPosition: BoardPosition;
  toPosition: BoardPosition;
  amount: number;
  bpFrom: number;
  bpTo: number;
  poisonStacksCleared: number;
  freezeCleared: boolean;
}

export interface IlluminatePlayback {
  side: BattleSide;
  fromPosition: BoardPosition;
  toPosition: BoardPosition;
}

export interface ResolveTurnResult {
  state: BattleState;
  /** 癒の後・照の前 */
  stateAfterHeals: BattleState;
  /** 癒・照の後、盾付与前 */
  stateAfterIlluminates: BattleState;
  shieldState: BattleState;
  shieldGrants: ShieldGrants;
  heals: HealPlayback[];
  illuminates: IlluminatePlayback[];
  attacks: AttackPlayback[];
  shields: ShieldPlayback[];
}
