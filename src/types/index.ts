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

/** カードの利用状態 */
export type CardStatus = 'active' | 'lost';

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
  /** 未設定セーブは active */
  status?: CardStatus;
  createdAt: string;
}

/** 固定5スロットのデッキ配置（null = 空きスロット） */
export type DeckLayout = (Card | null)[];

export interface UserEconomy {
  /** 無償ピクセル（ショップ通貨） */
  freePixels: number;
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
  /** その戦で墓地へ送られた相手カード（勝利時の戦利品選択用） */
  defeatedCpuCards: Card[];
  /** その戦で生存した自軍カード（勝利時の生存報酬表示用） */
  survivorPlayerCards: Card[];
  playerDeckPower: number;
  opponentDeckPower: number;
  /** その戦で墓地へ送られた自軍カード（敗北時のロスト抽選用） */
  defeatedPlayerCards: Card[];
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
  /** 出撃時点の自軍デッキ（5枚スナップショット） */
  playerDeck?: Card[];
  /** 出撃時点のユーザーレベル */
  playerLevel?: number;
}

export interface SaveData {
  /** セーブ形式（0=legacy, 1=economy 追加） */
  schemaVersion?: number;
  user: UserProfile | null;
  economy?: UserEconomy;
  /** デッキスロット（最大5）。各スロットは固定5枠（null = 空き） */
  decks: DeckLayout[];
  /** 現在選択中のデッキスロット（0〜4） */
  activeDeckIndex: number;
  /** 直近 CPU 戦で使用したデッキスロット（0〜4） */
  lastBattleDeckIndex: number;
  /** 解放済みデッキスロット数（1〜5） */
  unlockedDeckCount: number;
  /** 将来: デッキ名。未設定時はタブ番号を表示 */
  deckNames?: string[];
  battleHistory?: BattleHistoryEntry[];
  /** 開発: 設定画面のテスト用レベルをファイル上書きより優先 */
  devPreferSavedLevel?: boolean;
  /** 開発: テスト用レベル適用時の DEV_USER_LEVEL_OVERRIDE スナップショット */
  devFileOverrideLevel?: number | null;
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
