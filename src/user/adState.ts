import { BATTLE_DAILY_RESET_TIMEZONE, LOST_MIN_USER_LEVEL } from '../config/economy';
import type { AdState } from '../types';

function normalizeNonNegativeInt(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

/** JST 基準の日次キー "YYYY-MM-DD" */
export function getBattlesDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BATTLE_DAILY_RESET_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function createInitialAdState(date: Date = new Date()): AdState {
  return {
    hasEverCompletedBattleDeck: false,
    battlesToday: 0,
    battlesDayKey: getBattlesDayKey(date),
    battleStarts: 0,
  };
}

export function normalizeAdState(raw: unknown, date: Date = new Date()): AdState {
  if (!raw || typeof raw !== 'object') return createInitialAdState(date);
  const candidate = raw as Partial<AdState>;
  const hasEverCompletedBattleDeck = candidate.hasEverCompletedBattleDeck === true;
  const battlesToday = normalizeNonNegativeInt(candidate.battlesToday);
  const battlesDayKey =
    typeof candidate.battlesDayKey === 'string' && candidate.battlesDayKey.length > 0
      ? candidate.battlesDayKey
      : getBattlesDayKey(date);
  const creativeAdCounter =
    typeof candidate.creativeAdCounter === 'number' &&
    Number.isFinite(candidate.creativeAdCounter) &&
    candidate.creativeAdCounter >= 0
      ? Math.floor(candidate.creativeAdCounter)
      : undefined;
  const battleStarts =
    candidate.battleStarts !== undefined
      ? normalizeNonNegativeInt(candidate.battleStarts)
      : normalizeNonNegativeInt(candidate.normalBattleStarts) +
        normalizeNonNegativeInt(candidate.historyRematchStarts);
  const historyRematchRulesDismissedDayKey =
    typeof candidate.historyRematchRulesDismissedDayKey === 'string' &&
    candidate.historyRematchRulesDismissedDayKey.length > 0
      ? candidate.historyRematchRulesDismissedDayKey
      : undefined;
  const lostCardDeckNoticeDismissedDayKey =
    typeof candidate.lostCardDeckNoticeDismissedDayKey === 'string' &&
    candidate.lostCardDeckNoticeDismissedDayKey.length > 0
      ? candidate.lostCardDeckNoticeDismissedDayKey
      : undefined;

  const todayKey = getBattlesDayKey(date);
  const resetBattlesToday = battlesDayKey !== todayKey ? 0 : battlesToday;
  const rulesDismissedToday =
    historyRematchRulesDismissedDayKey === todayKey
      ? todayKey
      : undefined;
  const lostCardNoticeDismissedToday =
    lostCardDeckNoticeDismissedDayKey === todayKey
      ? todayKey
      : undefined;
  const mockAdsWatchedTotal =
    candidate.mockAdsWatchedTotal !== undefined
      ? normalizeNonNegativeInt(candidate.mockAdsWatchedTotal)
      : undefined;

  return {
    hasEverCompletedBattleDeck,
    battlesToday: resetBattlesToday,
    battlesDayKey: todayKey,
    battleStarts,
    ...(rulesDismissedToday != null
      ? { historyRematchRulesDismissedDayKey: rulesDismissedToday }
      : {}),
    ...(lostCardNoticeDismissedToday != null
      ? { lostCardDeckNoticeDismissedDayKey: lostCardNoticeDismissedToday }
      : {}),
    ...(creativeAdCounter != null ? { creativeAdCounter } : {}),
    ...(mockAdsWatchedTotal != null && mockAdsWatchedTotal > 0
      ? { mockAdsWatchedTotal }
      : {}),
  };
}

/** 再戦ルールモーダルを表示するか（当日スキップ未設定なら表示） */
export function shouldShowHistoryRematchRulesModal(
  adState: AdState,
  date: Date = new Date(),
): boolean {
  const todayKey = getBattlesDayKey(date);
  return adState.historyRematchRulesDismissedDayKey !== todayKey;
}

export function dismissHistoryRematchRulesForToday(
  adState: AdState,
  date: Date = new Date(),
): AdState {
  return {
    ...adState,
    historyRematchRulesDismissedDayKey: getBattlesDayKey(date),
  };
}

/** ロストカード案内モーダルを表示するか（当日スキップ未設定なら表示） */
export function shouldShowLostCardDeckNoticeModal(
  adState: AdState,
  date: Date = new Date(),
): boolean {
  const todayKey = getBattlesDayKey(date);
  return adState.lostCardDeckNoticeDismissedDayKey !== todayKey;
}

export function dismissLostCardDeckNoticeForToday(
  adState: AdState,
  date: Date = new Date(),
): AdState {
  return {
    ...adState,
    lostCardDeckNoticeDismissedDayKey: getBattlesDayKey(date),
  };
}

/** 通常バトルで広告を表示するユーザーレベルか（Lv.5 以上） */
export function isNormalBattleAdsEnabledAtUserLevel(userLevel: number): boolean {
  return Math.max(1, Math.floor(userLevel)) >= LOST_MIN_USER_LEVEL;
}

/** 次のバトル開始でリワード広告が必要か（通常・履歴再戦共通・3回に1回） */
export function shouldRequireBattleStartAd(battleStarts: number): boolean {
  return (battleStarts + 1) % 3 === 0;
}

export function getMockAdsWatchedTotal(adState: AdState): number {
  return normalizeNonNegativeInt(adState.mockAdsWatchedTotal);
}

/** 開発テスト用: モック広告の視聴完了を1回記録 */
export function recordMockAdWatched(adState: AdState): AdState {
  return {
    ...adState,
    mockAdsWatchedTotal: getMockAdsWatchedTotal(adState) + 1,
  };
}
