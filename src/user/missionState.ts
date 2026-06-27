import { getBattlesDayKey } from './adState';
import { getMissionWeekKey } from '../mission/reset';
import type { MissionProgressEntry, MissionState } from '../mission/types';

function normalizeProgressEntry(raw: unknown): MissionProgressEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<MissionProgressEntry>;
  const progress =
    typeof candidate.progress === 'number' &&
    Number.isFinite(candidate.progress) &&
    candidate.progress >= 0
      ? Math.floor(candidate.progress)
      : 0;
  const completedAt =
    typeof candidate.completedAt === 'string' && candidate.completedAt.length > 0
      ? candidate.completedAt
      : undefined;
  const claimedAt =
    typeof candidate.claimedAt === 'string' && candidate.claimedAt.length > 0
      ? candidate.claimedAt
      : undefined;
  return {
    progress,
    ...(completedAt ? { completedAt } : {}),
    ...(claimedAt ? { claimedAt } : {}),
  };
}

export function createInitialMissionState(date: Date = new Date()): MissionState {
  return {
    dailyDayKey: getBattlesDayKey(date),
    weeklyWeekKey: getMissionWeekKey(date),
    entries: {},
  };
}

export function normalizeMissionState(
  raw: unknown,
  date: Date = new Date(),
): MissionState {
  const dailyDayKey = getBattlesDayKey(date);
  const weeklyWeekKey = getMissionWeekKey(date);

  if (!raw || typeof raw !== 'object') {
    return createInitialMissionState(date);
  }

  const candidate = raw as Partial<MissionState>;
  const entries: Record<string, MissionProgressEntry> = {};

  if (candidate.entries && typeof candidate.entries === 'object') {
    for (const [key, value] of Object.entries(candidate.entries)) {
      const entry = normalizeProgressEntry(value);
      if (entry) entries[key] = entry;
    }
  }

  const storedDailyKey =
    typeof candidate.dailyDayKey === 'string' && candidate.dailyDayKey.length > 0
      ? candidate.dailyDayKey
      : dailyDayKey;
  const storedWeeklyKey =
    typeof candidate.weeklyWeekKey === 'string' && candidate.weeklyWeekKey.length > 0
      ? candidate.weeklyWeekKey
      : weeklyWeekKey;

  const appOpenDayKey =
    typeof candidate.appOpenDayKey === 'string' && candidate.appOpenDayKey.length > 0
      ? candidate.appOpenDayKey
      : undefined;

  const permanentTierCaps: MissionState['permanentTierCaps'] = {};
  if (
    candidate.permanentTierCaps &&
    typeof candidate.permanentTierCaps === 'object'
  ) {
    for (const [key, value] of Object.entries(candidate.permanentTierCaps)) {
      if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 200
      ) {
        permanentTierCaps[key] = Math.floor(value);
      }
    }
  }

  return {
    dailyDayKey: storedDailyKey,
    weeklyWeekKey: storedWeeklyKey,
    beginnerCompleted: candidate.beginnerCompleted === true,
    ...(appOpenDayKey ? { appOpenDayKey } : {}),
    ...(Object.keys(permanentTierCaps).length > 0
      ? { permanentTierCaps }
      : {}),
    entries,
  };
}
