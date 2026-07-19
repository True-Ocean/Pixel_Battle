/** 公開デッキ戦（挑戦・デッキ公開）の解放ユーザーレベル */
export const OFFLINE_PVP_MIN_USER_LEVEL = 10;

export function isOfflinePvpUnlockedAtUserLevel(userLevel: number): boolean {
  return Math.floor(userLevel) >= OFFLINE_PVP_MIN_USER_LEVEL;
}
