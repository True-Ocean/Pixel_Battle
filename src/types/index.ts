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
  /** 護符装備（ロスト1回免れ。装備時に inventory から消費） */
  talismanEquipped?: boolean;
  /** 有償リネームの実行回数（0 = 初回リネームは px） */
  renameCount?: number;
  createdAt: string;
}

/** 固定5スロットのデッキ配置（null = 空きスロット） */
export type DeckLayout = (Card | null)[];

/** 思い出アルバム（閲覧専用アーカイブ） */
export interface MemoryAlbumState {
  cards: Card[];
  /** 解放済み行数（1行 = 5枠） */
  unlockedRows: number;
}

export interface UserEconomy {
  /** px コイン（内部名: freePixels） */
  freePixels: number;
  /** 💎 ジュエル（課金・レベル報酬・その場消費） */
  jewels: number;
}

export interface UserInventory {
  /** 護符（ロスト1回免れ） */
  talisman: number;
  /** 汎用かけら（任意属性の限界突破に消費） */
  limitBreakUniversal: number;
  /** 属性別かけら */
  limitBreakShards: Partial<Record<Attribute, number>>;
}

export interface AdState {
  /** 初回バトル可能デッキ完成後は創作保存前に広告ゲート */
  hasEverCompletedBattleDeck: boolean;
  /** 当日のバトル開始回数（非会員 cap 用） */
  battlesToday: number;
  /** 日次リセット判定用 "YYYY-MM-DD"（JST） */
  battlesDayKey: string;
  /** ライト会員: 創作広告カウンタ（将来） */
  creativeAdCounter?: number;
  /** バトル開始回数（通常・履歴再戦共通。3回に1回の広告判定用） */
  battleStarts?: number;
  /** 再戦ルールモーダルを非表示にした日（JST "YYYY-MM-DD"） */
  historyRematchRulesDismissedDayKey?: string;
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
  /** セーブ形式（0=legacy, 1=freePixels, 2=jewels+inventory+adState） */
  schemaVersion?: number;
  user: UserProfile | null;
  economy?: UserEconomy;
  inventory?: UserInventory;
  adState?: AdState;
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
  /** Lv5 到達時の初回護符を受け取り済みか（生涯1回） */
  talismanStarterGranted?: boolean;
  /** ショップで解放済みのパレット index（8〜19） */
  paletteShopUnlocks?: number[];
  /** 思い出アルバム */
  memoryAlbum?: MemoryAlbumState;
}

/** アプリ画面（ルーターなし・state で切替） */
export type ScreenId =
  | 'title'
  | 'setup'
  | 'deck'
  | 'memoryAlbum'
  | 'battleHub'
  | 'records'
  | 'shop'
  | 'inventory'
  | 'settings'
  | 'editor'
  | 'battleSetup'
  | 'battle';

export interface NavigationState {
  screen: ScreenId;
  /** 戦闘セットアップ・戦闘へ渡す選択中のカード ID（最大3） */
  selectedCardIds?: string[];
}
