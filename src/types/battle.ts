import type { Attribute } from './index';

export type BattleSide = 'player' | 'cpu';
export type BoardPosition =
  | 'frontLeft'
  | 'frontRight'
  | 'backLeft'
  | 'backCenter'
  | 'backRight';

export type UnitPosition = BoardPosition | 'defeated';
export type BattleActionType = 'meleeAttack' | 'grantShield';

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
