/** オンライン対人の解放ユーザーレベル（オフライン対人と同じ） */
export const ONLINE_PVP_MIN_USER_LEVEL = 10;

/** 勝利報酬: 生存1枚あたりの px 移動量（敗者→勝者） */
export const ONLINE_PVP_PX_PER_SURVIVOR = 20;

/** 1 戦あたりの最大 px 移動量（5 枚生存 × 20） */
export const ONLINE_PVP_MAX_BATTLE_TRANSFER =
  ONLINE_PVP_PX_PER_SURVIVOR * 5;

/** 参加・続戦に必要な最低手持ち px */
export const ONLINE_PVP_MIN_WALLET_PX = ONLINE_PVP_MAX_BATTLE_TRANSFER;

/** @deprecated ルーム残高は廃止。canContinueOnlinePvpSession と同義 */
export const ONLINE_PVP_MIN_BALANCE_TO_PLAY = ONLINE_PVP_MIN_WALLET_PX;

/** ルームコード桁数 */
export const ONLINE_PVP_ROOM_CODE_LENGTH = 6;

/** ルーム有効期限（分） */
export const ONLINE_PVP_ROOM_TTL_MINUTES = 30;

/** 非アクティブルームを DB に残す時間（時間）。pg_cron の cleanup_stale_online_battle_rooms と一致 */
export const ONLINE_PVP_STALE_RETENTION_HOURS = 1;

/** @deprecated ONLINE_PVP_STALE_RETENTION_HOURS を使用 */
export const ONLINE_PVP_CLOSED_RETENTION_HOURS = ONLINE_PVP_STALE_RETENTION_HOURS;

/** 切断後の再接続猶予（秒） */
export const ONLINE_PVP_DISCONNECT_GRACE_SEC = 60;
