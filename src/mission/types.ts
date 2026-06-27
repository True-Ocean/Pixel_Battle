/** ミッションカテゴリ */
export type MissionCategory = 'daily' | 'weekly' | 'permanent' | 'beginner';

/** 進捗イベント種別 */
export type MissionEventType =
  | 'app_open'
  | 'battle_win'
  | 'battle_play'
  | 'card_created'
  | 'card_edit_saved'
  | 'deck_reordered'
  | 'attribute_battle_guide_viewed'
  | 'attribute_retouch'
  | 'battle_log_viewed'
  | 'history_opponent_detail_viewed'
  | 'history_rematch_play'
  | 'limit_break';

/** ミッション報酬 */
export interface MissionReward {
  px?: number;
  jewels?: number;
  /** 汎用かけら（限界突破素材） */
  universalShards?: number;
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
  /** ビギナーのみ: 前ミッション ID（受取済みで解放） */
  unlockAfter?: string;
  /** ビギナーのみ: 表示順 */
  order?: number;
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
