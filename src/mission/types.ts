/** ミッションカテゴリ */
export type MissionCategory = 'daily' | 'weekly' | 'permanent' | 'beginner';

/** 進捗イベント種別 */
export type MissionEventType =
  | 'app_open'
  | 'battle_win'
  | 'cpu_battle_win'
  | 'history_rematch_win'
  | 'battle_play'
  | 'card_created'
  | 'card_edit_saved'
  | 'deck_reordered'
  | 'attribute_battle_guide_viewed'
  | 'attribute_retouch'
  | 'battle_log_viewed'
  | 'history_opponent_detail_viewed'
  | 'history_rematch_play'
  | 'limit_break'
  | 'card_deleted'
  | 'card_revived'
  | 'memory_album_saved'
  | 'card_renamed'
  | 'card_note_saved'
  | 'canvas_resized'
  | 'attribute_selected'
  | 'attribute_owned'
  | 'deck_win_with_attribute'
  | 'rarity_owned'
  | 'deck_win_with_rarity';

/** ミッション報酬 */
export interface MissionReward {
  px?: number;
  jewels?: number;
  /** 汎用かけら（限界突破素材） */
  universalShards?: number;
}

/** 常設達成型ミッションの追加条件 */
export interface MissionCondition {
  attribute?: import('../types').Attribute;
  rarity?: import('../types').CardRarity;
}

/** ミッション定義（config） */
export interface MissionDefinition {
  id: string;
  category: MissionCategory;
  title: string;
  description: string;
  eventType: MissionEventType;
  goal: number;
  reward: MissionReward;
  /** ビギナーのみ: 表示順（おすすめの流れ） */
  order?: number;
  /** 常設達成型: 表示トラック（1トラック1件表示） */
  displayTrackId?: string;
  /** 常設達成型: 達成条件 */
  condition?: MissionCondition;
}

/** 個別ミッションの進捗 */
export interface MissionProgressEntry {
  progress: number;
  /** 達成日時（ISO 8601） */
  completedAt?: string;
  /** 受取日時（ISO 8601） */
  claimedAt?: string;
}

/** 永続化するミッション状態 */
export interface MissionState {
  dailyDayKey: string;
  weeklyWeekKey: string;
  /** ビギナー枠をすべて受取済み */
  beginnerCompleted?: boolean;
  /** 当日初回起動を記録した日次キー */
  appOpenDayKey?: string;
  /** 常設カウンター: カテゴリ（idPrefix）ごとの現在 tier 上限（未設定時 200） */
  permanentTierCaps?: Partial<Record<string, number>>;
  entries: Record<string, MissionProgressEntry>;
}

export interface MissionClaimResult {
  state: MissionState;
  economy: import('../types').UserEconomy;
  inventory: import('../types').UserInventory;
  pxGranted: number;
  jewelsGranted: number;
  universalShardsGranted: number;
  missionId: string;
}

export interface MissionBulkClaimResult {
  state: MissionState;
  economy: import('../types').UserEconomy;
  inventory: import('../types').UserInventory;
  pxGranted: number;
  jewelsGranted: number;
  universalShardsGranted: number;
  missionIds: string[];
}

export interface MissionEventResult {
  state: MissionState;
  newlyCompleted: MissionDefinition[];
}
