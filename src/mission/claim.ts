import { getMissionById, MISSION_DEFINITIONS } from '../config/missions';
import { addFreePixels, addJewels } from '../user/economy';
import type { UserEconomy } from '../types';
import {
  isMissionClaimable,
} from './progress';
import type {
  MissionBulkClaimResult,
  MissionClaimResult,
  MissionDefinition,
  MissionCategory,
  MissionReward,
  MissionState,
} from './types';
import { getBeginnerMissions } from '../config/missions';

function sumRewards(rewards: MissionReward[]): { px: number; jewels: number } {
  let px = 0;
  let jewels = 0;
  for (const reward of rewards) {
    px += reward.px ?? 0;
    jewels += reward.jewels ?? 0;
  }
  return { px, jewels };
}

function applyRewardToEconomy(
  economy: UserEconomy,
  reward: MissionReward,
): { economy: UserEconomy; pxGranted: number; jewelsGranted: number } {
  let next = economy;
  let pxGranted = 0;
  let jewelsGranted = 0;

  if (reward.px != null && reward.px > 0) {
    next = addFreePixels(next, reward.px);
    pxGranted += reward.px;
  }
  if (reward.jewels != null && reward.jewels > 0) {
    next = addJewels(next, reward.jewels);
    jewelsGranted += reward.jewels;
  }

  return { economy: next, pxGranted, jewelsGranted };
}

function markClaimed(
  state: MissionState,
  mission: MissionDefinition,
  date: Date,
): MissionState {
  const entry = state.entries[mission.id] ?? { progress: mission.goal };
  const nextEntries = {
    ...state.entries,
    [mission.id]: {
      ...entry,
      progress: Math.max(entry.progress, mission.goal),
      completedAt: entry.completedAt ?? date.toISOString(),
      claimedAt: date.toISOString(),
    },
  };

  let next: MissionState = { ...state, entries: nextEntries };

  if (mission.category === 'beginner') {
    const allClaimed = getBeginnerMissions().every(
      (item) => next.entries[item.id]?.claimedAt != null,
    );
    if (allClaimed) {
      next = { ...next, beginnerCompleted: true };
    }
  }

  return next;
}

export function claimMission(
  state: MissionState,
  economy: UserEconomy,
  missionId: string,
  date: Date = new Date(),
): MissionClaimResult | null {
  const mission = getMissionById(missionId);
  if (!mission) return null;
  if (!isMissionClaimable(state, mission)) return null;

  const { economy: nextEconomy, pxGranted, jewelsGranted } = applyRewardToEconomy(
    economy,
    mission.reward,
  );

  return {
    state: markClaimed(state, mission, date),
    economy: nextEconomy,
    pxGranted,
    jewelsGranted,
    missionId,
  };
}

/** 受取可能ミッション一覧 */
export function listClaimableMissions(state: MissionState): MissionDefinition[] {
  return MISSION_DEFINITIONS.filter((mission) => {
    if (mission.category === 'beginner' && state.beginnerCompleted) return false;
    return isMissionClaimable(state, mission);
  });
}

/** カテゴリ内の受取可能ミッション一覧 */
export function listClaimableMissionsInCategory(
  state: MissionState,
  category: MissionCategory,
): MissionDefinition[] {
  return listClaimableMissions(state).filter((mission) => mission.category === category);
}

function claimMissionList(
  state: MissionState,
  economy: UserEconomy,
  claimable: MissionDefinition[],
  date: Date,
): MissionBulkClaimResult {
  if (claimable.length === 0) {
    return {
      state,
      economy,
      pxGranted: 0,
      jewelsGranted: 0,
      missionIds: [],
    };
  }

  const totals = sumRewards(claimable.map((mission) => mission.reward));
  let nextEconomy = economy;
  if (totals.px > 0) nextEconomy = addFreePixels(nextEconomy, totals.px);
  if (totals.jewels > 0) nextEconomy = addJewels(nextEconomy, totals.jewels);

  let nextState = state;
  for (const mission of claimable) {
    nextState = markClaimed(nextState, mission, date);
  }

  return {
    state: nextState,
    economy: nextEconomy,
    pxGranted: totals.px,
    jewelsGranted: totals.jewels,
    missionIds: claimable.map((mission) => mission.id),
  };
}

export function claimAllMissions(
  state: MissionState,
  economy: UserEconomy,
  date: Date = new Date(),
): MissionBulkClaimResult {
  const claimable = listClaimableMissions(state);
  return claimMissionList(state, economy, claimable, date);
}

export function claimMissionsInCategory(
  state: MissionState,
  economy: UserEconomy,
  category: MissionCategory,
  date: Date = new Date(),
): MissionBulkClaimResult {
  const claimable = listClaimableMissionsInCategory(state, category);
  return claimMissionList(state, economy, claimable, date);
}

/** 達成済みだが未受取があるか */
export function hasUnclaimedRewards(state: MissionState): boolean {
  return listClaimableMissions(state).length > 0;
}
