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
  /** 嵐カードの残り使用回数（1戦闘あたり上限あり） */
  stormUsesRemaining: number;
  /** 忍初回無反撃を消費したか（Phase 8） */
  ninjaFirstStrikeUsed: boolean;
  /** tie-break 用 */
  rarity: CardRarity;
  stars: CardStars;
}

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

export interface StormEngulfHit {
  target: BattleLogUnitSnapshot;
  damage: number;
  shieldBroken: boolean;
}

export interface BattleEvent {
  type:
    | 'turn_start'
    | 'shield_granted'
    | 'attack'
    | 'blocked'
    | 'defeated'
    | 'promoted'
    | 'frozen'
    | 'poison_applied'
    | 'shield_broken'
    | 'storm_cast'
    | 'storm_engulf'
    | 'attack_preempted'
    | 'stealth_mutual_break';
  turn: number;
  side?: BattleSide;
  actor?: BattleLogUnitSnapshot;
  target?: BattleLogUnitSnapshot;
  actionKind?: BattleLogActionKind;
  damageToTarget?: number;
  damageToActor?: number;
  /** 近接など: 防御側の盾が消費された */
  targetShieldBroken?: boolean;
  /** 近接など: 攻撃側の盾が消費された */
  actorShieldBroken?: boolean;
  healAmount?: number;
  poisonStacksCleared?: number;
  freezeCleared?: boolean;
  blockContext?: 'melee' | 'bow' | 'storm' | 'dual_secondary';
  stormDamage?: number;
  stormHits?: StormEngulfHit[];
  /** @deprecated ログ整形は actor / target を使用 */
  actorId?: string;
  /** @deprecated ログ整形は actor / target を使用 */
  targetId?: string;
  from?: UnitPosition;
  to?: UnitPosition;
  /** @deprecated damageToTarget を使用 */
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
