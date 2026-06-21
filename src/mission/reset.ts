import { BATTLE_DAILY_RESET_TIMEZONE } from '../config/economy';
import { getBattlesDayKey } from '../user/adState';
import { getMissionsByCategory } from '../config/missions';
import type { MissionCategory, MissionState } from './types';

const JST_WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function addDaysToDayKey(dayKey: string, deltaDays: number): string {
  const anchor = new Date(`${dayKey}T12:00:00+09:00`);
  anchor.setDate(anchor.getDate() + deltaDays);
  return getBattlesDayKey(anchor);
}

/** 月曜 JST 0:00 基準の週次キー（その週の月曜日 YYYY-MM-DD） */
export function getMissionWeekKey(date: Date = new Date()): string {
  const dayKey = getBattlesDayKey(date);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: BATTLE_DAILY_RESET_TIMEZONE,
    weekday: 'short',
  }).format(date);
  const dow = JST_WEEKDAY[weekday] ?? 0;
  const daysFromMonday = (dow + 6) % 7;
  return addDaysToDayKey(dayKey, -daysFromMonday);
}

function clearCategoryProgress(
  state: MissionState,
  category: MissionCategory,
): MissionState {
  const nextEntries = { ...state.entries };
  for (const mission of getMissionsByCategory(category)) {
    delete nextEntries[mission.id];
  }
  return { ...state, entries: nextEntries };
}

/** 日次・週次リセットを適用 */
export function applyMissionResets(
  state: MissionState,
  date: Date = new Date(),
): MissionState {
  const dailyDayKey = getBattlesDayKey(date);
  const weeklyWeekKey = getMissionWeekKey(date);

  let next: MissionState = {
    ...state,
    dailyDayKey,
    weeklyWeekKey,
  };

  if (state.dailyDayKey !== dailyDayKey) {
    next = clearCategoryProgress(next, 'daily');
    next.dailyDayKey = dailyDayKey;
    if (state.appOpenDayKey != null && state.appOpenDayKey !== dailyDayKey) {
      next.appOpenDayKey = undefined;
    }
  }

  if (state.weeklyWeekKey !== weeklyWeekKey) {
    next = clearCategoryProgress(next, 'weekly');
    next.weeklyWeekKey = weeklyWeekKey;
  }

  return next;
}
