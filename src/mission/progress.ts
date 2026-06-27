import {
  getBeginnerMissions,
  getMissionById,
  getMissionDefinitions,
} from '../config/missions';
import { getBattlesDayKey } from '../user/adState';
import { applyMissionResets } from './reset';
import type {
  MissionDefinition,
  MissionEventResult,
  MissionEventType,
  MissionProgressEntry,
  MissionState,
} from './types';

function emptyEntry(): MissionProgressEntry {
  return { progress: 0 };
}

function getEntry(state: MissionState, missionId: string): MissionProgressEntry {
  return state.entries[missionId] ?? emptyEntry();
}

function isBeginnerTrackComplete(state: MissionState): boolean {
  if (state.beginnerCompleted) return true;
  const missions = getBeginnerMissions();
  if (missions.length === 0) return true;
  return missions.every((mission) => getEntry(state, mission.id).claimedAt != null);
}

function isBeginnerMissionUnlocked(
  mission: MissionDefinition,
  state: MissionState,
): boolean {
  if (!mission.unlockAfter) return true;
  return getEntry(state, mission.unlockAfter).claimedAt != null;
}

function isMissionActive(mission: MissionDefinition, state: MissionState): boolean {
  if (mission.category === 'beginner') {
    if (state.beginnerCompleted || isBeginnerTrackComplete(state)) return false;
    return isBeginnerMissionUnlocked(mission, state);
  }
  return true;
}

function isMissionProgressable(
  mission: MissionDefinition,
  entry: MissionProgressEntry,
): boolean {
  if (entry.claimedAt != null) return false;
  if (mission.category === 'permanent' && entry.completedAt != null) {
    return entry.claimedAt == null;
  }
  if (entry.completedAt != null) return false;
  return true;
}

function updateBeginnerCompleted(state: MissionState): MissionState {
  if (state.beginnerCompleted) return state;
  if (!isBeginnerTrackComplete(state)) return state;
  return { ...state, beginnerCompleted: true };
}

/** ミッション定義と進捗から表示用ステータス */
export function getMissionProgress(
  state: MissionState,
  mission: MissionDefinition,
): MissionProgressEntry {
  return getEntry(state, mission.id);
}

export function isMissionCompleted(
  state: MissionState,
  mission: MissionDefinition,
): boolean {
  const entry = getEntry(state, mission.id);
  return entry.progress >= mission.goal || entry.completedAt != null;
}

export function isMissionClaimed(
  state: MissionState,
  mission: MissionDefinition,
): boolean {
  return getEntry(state, mission.id).claimedAt != null;
}

export function isMissionClaimable(
  state: MissionState,
  mission: MissionDefinition,
): boolean {
  const entry = getEntry(state, mission.id);
  return entry.completedAt != null && entry.claimedAt == null;
}

export function countUnclaimedMissions(state: MissionState): number {
  return getMissionDefinitions(state).filter((mission) => {
    if (mission.category === 'beginner' && state.beginnerCompleted) return false;
    return isMissionClaimable(state, mission);
  }).length;
}

/** ゲーム内イベントを報告し進捗を更新 */
export function reportMissionEvent(
  state: MissionState,
  eventType: MissionEventType,
  amount: number = 1,
  date: Date = new Date(),
): MissionEventResult {
  const delta = Math.max(0, Math.floor(amount));
  if (delta === 0) {
    return { state: applyMissionResets(state, date), newlyCompleted: [] };
  }

  let next = applyMissionResets(state, date);
  const dailyDayKey = getBattlesDayKey(date);
  const newlyCompleted: MissionDefinition[] = [];

  if (eventType === 'app_open') {
    if (next.appOpenDayKey === dailyDayKey) {
      return { state: next, newlyCompleted };
    }
    next = { ...next, appOpenDayKey: dailyDayKey };
  }

  const nextEntries = { ...next.entries };

  for (const mission of getMissionDefinitions(next)) {
    if (mission.eventType !== eventType) continue;
    if (!isMissionActive(mission, next)) continue;

    const entry = getEntry(next, mission.id);
    if (!isMissionProgressable(mission, entry)) continue;

    const progress = Math.min(mission.goal, entry.progress + delta);
    const completedAt =
      progress >= mission.goal && entry.completedAt == null
        ? date.toISOString()
        : entry.completedAt;

    nextEntries[mission.id] = {
      progress,
      ...(completedAt ? { completedAt } : {}),
      ...(entry.claimedAt ? { claimedAt: entry.claimedAt } : {}),
    };

    if (completedAt && entry.completedAt == null) {
      newlyCompleted.push(mission);
    }
  }

  next = updateBeginnerCompleted({ ...next, entries: nextEntries });
  return { state: next, newlyCompleted };
}

/** 複数イベントを順に適用 */
export function applyMissionEvents(
  state: MissionState,
  events: ReadonlyArray<{ type: MissionEventType; amount?: number }>,
  date: Date = new Date(),
): MissionEventResult {
  let next = state;
  const newlyCompleted: MissionDefinition[] = [];
  for (const { type, amount = 1 } of events) {
    const result = reportMissionEvent(next, type, amount, date);
    next = result.state;
    newlyCompleted.push(...result.newlyCompleted);
  }
  return { state: next, newlyCompleted };
}

/** ビギナータブを表示するか */
export function shouldShowBeginnerMissions(state: MissionState): boolean {
  return !state.beginnerCompleted && !isBeginnerTrackComplete(state);
}

/** ビギナーミッションが現在進行可能か（1件ずつ） */
export function isCurrentBeginnerMission(
  state: MissionState,
  mission: MissionDefinition,
): boolean {
  if (mission.category !== 'beginner') return false;
  if (!shouldShowBeginnerMissions(state)) return false;
  if (!isBeginnerMissionUnlocked(mission, state)) return false;
  if (isMissionClaimed(state, mission)) return false;
  if (isMissionCompleted(state, mission)) return true;

  const missions = getBeginnerMissions();
  for (const candidate of missions) {
    if (!isBeginnerMissionUnlocked(candidate, state)) continue;
    if (!isMissionClaimed(state, candidate)) {
      return candidate.id === mission.id;
    }
  }
  return false;
}

export function isBeginnerMissionLocked(
  state: MissionState,
  mission: MissionDefinition,
): boolean {
  if (mission.category !== 'beginner') return false;
  if (!shouldShowBeginnerMissions(state)) return false;
  return !isBeginnerMissionUnlocked(mission, state);
}
