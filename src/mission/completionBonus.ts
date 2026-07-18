import { getMissionsByCategory } from '../config/missions';
import type { MissionCategory, MissionReward, MissionState } from './types';

export type CompletionBonusCategory = Extract<
  MissionCategory,
  'daily' | 'weekly'
>;

interface CompletionBonusDefinition {
  id: string;
  reward: MissionReward;
}

const COMPLETION_BONUSES: Record<
  CompletionBonusCategory,
  CompletionBonusDefinition
> = {
  daily: {
    id: 'daily_completion_bonus',
    reward: { jewels: 2 },
  },
  weekly: {
    id: 'weekly_completion_bonus',
    reward: { jewels: 5 },
  },
};

export function isCompletionBonusCategory(
  category: MissionCategory,
): category is CompletionBonusCategory {
  return category === 'daily' || category === 'weekly';
}

export function getCompletionBonusDefinition(
  category: CompletionBonusCategory,
): CompletionBonusDefinition {
  return COMPLETION_BONUSES[category];
}

export function getCompletionBonusClaimedAt(
  state: MissionState,
  category: CompletionBonusCategory,
): string | undefined {
  return category === 'daily'
    ? state.dailyCompletionBonusClaimedAt
    : state.weeklyCompletionBonusClaimedAt;
}

export function getCompletionBonusProgress(
  state: MissionState,
  category: CompletionBonusCategory,
  userLevel: number = 1,
): { completed: number; total: number } {
  const missions = getMissionsByCategory(category, state, userLevel);
  return {
    completed: missions.filter((mission) => {
      const entry = state.entries[mission.id];
      return (entry?.progress ?? 0) >= mission.goal || entry?.completedAt != null;
    }).length,
    total: missions.length,
  };
}

export function isCompletionBonusClaimable(
  state: MissionState,
  category: CompletionBonusCategory,
  userLevel: number = 1,
): boolean {
  if (getCompletionBonusClaimedAt(state, category) != null) return false;
  const { completed, total } = getCompletionBonusProgress(state, category, userLevel);
  return total > 0 && completed === total;
}

export function markCompletionBonusClaimed(
  state: MissionState,
  category: CompletionBonusCategory,
  date: Date,
): MissionState {
  const claimedAt = date.toISOString();
  return category === 'daily'
    ? { ...state, dailyCompletionBonusClaimedAt: claimedAt }
    : { ...state, weeklyCompletionBonusClaimedAt: claimedAt };
}
