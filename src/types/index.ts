/** 全10属性（docs/ATTRIBUTE_SPEC.md §3） */
export type Attribute =
  | 'attack'
  | 'defense'
  | 'power'
  | 'bow'
  | 'dual'
  | 'poison'
  | 'heal'
  | 'ice'
  | 'storm'
  | 'ninja';

/** カードレア度（v1 抽選: N / R / SR、将来: UR / L） */
export type CardRarity = 'N' | 'R' | 'SR' | 'UR' | 'L';

/** 限界突破の★数（0〜3） */
export type CardStars = 0 | 1 | 2 | 3;

/** パレット色（#RRGGBB または null = 未塗り） */
export type PixelColor = string | null;

export type PixelGrid = PixelColor[][];

export interface Card {
  id: string;
  name: string;
  pixels: PixelGrid;
  /** 描画グリッドの一辺（マス数）。未設定セーブは 16 として移行 */
  canvasSize: number;
  attribute: Attribute;
  bp: number;
  wins: number;
  losses: number;
  reviveCount: number;
  rarity: CardRarity;
  stars: CardStars;
  createdAt: string;
}

/** ユーザープロフィール（localStorage 永続化） */
export interface UserProfile {
  username: string;
  level: number;
  exp: number;
  /** ユーザーとしてのバトル勝利数 */
  battleWins: number;
  /** ユーザーとしてのバトル敗北数 */
  battleLosses: number;
}

/** バトル終了時に永続化へ渡す結果 */
export interface BattleOpponentSnapshot {
  name: string;
  level: number;
  deck: Card[];
}

export interface BattleOutcome {
  winner: 'player' | 'cpu';
  /** その戦に出撃した自軍カード ID */
  playerCardIds: string[];
  /** その戦で墓地へ送られた自軍カード ID */
  defeatedPlayerCardIds: string[];
  cpuDefeatedCount: number;
  playerDeckPower: number;
  opponentDeckPower: number;
  fauxLostCardId: string | null;
  opponent: BattleOpponentSnapshot;
}

/** useBattle が組み立てる結果（相手スナップショットは BattleSetupScreen が付与） */
export type BattleOutcomeCore = Omit<BattleOutcome, 'opponent'>;

/** 対戦履歴（最大20件・localStorage 永続化） */
export interface BattleHistoryEntry {
  id: string;
  playedAt: string;
  winner: 'player' | 'cpu';
  opponentName: string;
  opponentLevel: number;
  opponentDeckPower: number;
  playerDeckPower: number;
  opponentDeck: Card[];
}

export interface SaveData {
  user: UserProfile | null;
  deck: Card[];
  battleHistory?: BattleHistoryEntry[];
}

/** アプリ画面（ルーターなし・state で切替） */
export type ScreenId =
  | 'title'
  | 'setup'
  | 'deck'
  | 'battleHub'
  | 'records'
  | 'shop'
  | 'settings'
  | 'editor'
  | 'battleSetup'
  | 'battle';

export interface NavigationState {
  screen: ScreenId;
  /** 戦闘セットアップ・戦闘へ渡す選択中のカード ID（最大3） */
  selectedCardIds?: string[];
}
