import type { Attribute, CardRarity, CardStars } from './index';

export type BattleSide = 'player' | 'cpu';
export type BoardPosition =
  | 'frontLeft'
  | 'frontRight'
  | 'backLeft'
  | 'backCenter'
  | 'backRight';

export type UnitPosition = BoardPosition | 'defeated';
export type BattleActionType =
  | 'meleeAttack'
  | 'grantShield'
  | 'bowAttack'
  | 'dualAttack'
  | 'heal'
  | 'storm';

/** 毒 DoT スタック（Phase 4 で付与処理） */
export interface PoisonStack {
  sourceCardId: string;
  /** 付与時 currentBp × 30%（固定値） */
  damagePerTurn: number;
}

export interface BattleUnit {
  cardId: string;
  name: string;
  attribute: Attribute;
  maxBp: number;
  currentBp: number;
  position: UnitPosition;
  /**
   * 防御カードが「自分＋味方1枚」に盾を付与する能力を、この戦闘で既に使ったか。
   * 防御カードごとに1回まで（別の防御カードは別カウント）。
   */
  defenseShieldUsed: boolean;
  /** 未使用の盾（1回だけダメージ0） */
  hasShield: boolean;
  poisonStacks: PoisonStack[];
  /** この戦闘で毒 DoT ダメージを一度でも受けた（癒の対象条件） */
  poisonDotDamageReceived: boolean;
  /** このターン番号まで行動不能（Phase 7） */
  frozenUntilTurn: number | null;
  /** 忍ステルス（Phase 8） */
  stealthActive: boolean;
  /** 癒カードの残使用回数（Phase 5） */
  healUsesRemaining: number;
  /** 弓カードの残り矢数（1戦闘あたり上限あり） */
  bowArrowsRemaining: number;
  /** 嵐をこの戦闘で使用済みか（Phase 6） */
  stormUsed: boolean;
  /** 忍初回無反撃を消費したか（Phase 8） */
  ninjaFirstStrikeUsed: boolean;
  /** tie-break 用 */
  rarity: CardRarity;
  stars: CardStars;
}

export interface BattleEvent {
  type:
    | 'action_selected'
    | 'shield_granted'
    | 'attack'
    | 'blocked'
    | 'defeated'
    | 'promoted';
  side?: BattleSide;
  actorId?: string;
  targetId?: string;
  from?: UnitPosition;
  to?: UnitPosition;
  damage?: number;
}

export interface BattleState {
  player: BattleUnit[];
  cpu: BattleUnit[];
  turn: number;
  log: string[];
  events: BattleEvent[];
}

export interface BattleActionChoice {
  type: BattleActionType;
  actorPosition: BoardPosition;
  targetPosition: BoardPosition;
}

export interface TurnChoices {
  player: BattleActionChoice;
  cpu: BattleActionChoice;
}

export type BattleResult = 'player' | 'cpu' | null;
