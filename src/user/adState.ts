import { BATTLE_DAILY_RESET_TIMEZONE } from '../config/economy';
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
    historyRematchStarts: 0,
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
  const historyRematchStarts = normalizeNonNegativeInt(
    candidate.historyRematchStarts,
  );
  const historyRematchRulesDismissedDayKey =
    typeof candidate.historyRematchRulesDismissedDayKey === 'string' &&
    candidate.historyRematchRulesDismissedDayKey.length > 0
      ? candidate.historyRematchRulesDismissedDayKey
      : undefined;

  const todayKey = getBattlesDayKey(date);
  const resetBattlesToday = battlesDayKey !== todayKey ? 0 : battlesToday;
  const rulesDismissedToday =
    historyRematchRulesDismissedDayKey === todayKey
      ? todayKey
      : undefined;

  return {
    hasEverCompletedBattleDeck,
    battlesToday: resetBattlesToday,
    battlesDayKey: todayKey,
    historyRematchStarts,
    ...(rulesDismissedToday != null
      ? { historyRematchRulesDismissedDayKey: rulesDismissedToday }
      : {}),
    ...(creativeAdCounter != null ? { creativeAdCounter } : {}),
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

/** 次の履歴再戦のバトル開始でリワード広告が必要か（3回に1回） */
export function shouldRequireHistoryRematchAd(
  historyRematchStarts: number,
): boolean {
  return (historyRematchStarts + 1) % 3 === 0;
}
