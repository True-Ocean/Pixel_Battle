import {
  getMissionById,
  getMissionDefinitions,
} from '../config/missions';
import { expandPermanentTierCapAfterClaim } from '../config/permanentMissions';
import { addFreePixels, addJewels } from '../user/economy';
import { addInventoryCount } from '../user/inventory';
import type { UserEconomy, UserInventory } from '../types';
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

function sumRewards(rewards: MissionReward[]): {
  px: number;
  jewels: number;
  universalShards: number;
} {
  let px = 0;
  let jewels = 0;
  let universalShards = 0;
  for (const reward of rewards) {
    px += reward.px ?? 0;
    jewels += reward.jewels ?? 0;
    universalShards += reward.universalShards ?? 0;
  }
  return { px, jewels, universalShards };
}

function applyReward(
  economy: UserEconomy,
  inventory: UserInventory,
  reward: MissionReward,
): {
  economy: UserEconomy;
  inventory: UserInventory;
  pxGranted: number;
  jewelsGranted: number;
  universalShardsGranted: number;
} {
  let nextEconomy = economy;
  let nextInventory = inventory;
  let pxGranted = 0;
  let jewelsGranted = 0;
  let universalShardsGranted = 0;

  if (reward.px != null && reward.px > 0) {
    nextEconomy = addFreePixels(nextEconomy, reward.px);
    pxGranted += reward.px;
  }
  if (reward.jewels != null && reward.jewels > 0) {
    nextEconomy = addJewels(nextEconomy, reward.jewels);
    jewelsGranted += reward.jewels;
  }
  if (reward.universalShards != null && reward.universalShards > 0) {
    nextInventory = addInventoryCount(
      nextInventory,
      'limitBreakUniversal',
      reward.universalShards,
    );
    universalShardsGranted += reward.universalShards;
  }

  return {
    economy: nextEconomy,
    inventory: nextInventory,
    pxGranted,
    jewelsGranted,
    universalShardsGranted,
  };
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

  if (mission.category === 'permanent') {
    next = expandPermanentTierCapAfterClaim(next, mission, date);
  }

  return next;
}

export function claimMission(
  state: MissionState,
  economy: UserEconomy,
  inventory: UserInventory,
  missionId: string,
  date: Date = new Date(),
): MissionClaimResult | null {
  const mission = getMissionById(missionId, state);
  if (!mission) return null;
  if (!isMissionClaimable(state, mission)) return null;

  const {
    economy: nextEconomy,
    inventory: nextInventory,
    pxGranted,
    jewelsGranted,
    universalShardsGranted,
  } = applyReward(economy, inventory, mission.reward);

  return {
    state: markClaimed(state, mission, date),
    economy: nextEconomy,
    inventory: nextInventory,
    pxGranted,
    jewelsGranted,
    universalShardsGranted,
    missionId,
  };
}

/** 受取可能ミッション一覧 */
export function listClaimableMissions(state: MissionState): MissionDefinition[] {
  return getMissionDefinitions(state).filter((mission) => {
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
  inventory: UserInventory,
  claimable: MissionDefinition[],
  date: Date,
): MissionBulkClaimResult {
  if (claimable.length === 0) {
    return {
      state,
      economy,
      inventory,
      pxGranted: 0,
      jewelsGranted: 0,
      universalShardsGranted: 0,
      missionIds: [],
    };
  }

  const totals = sumRewards(claimable.map((mission) => mission.reward));
  let nextEconomy = economy;
  let nextInventory = inventory;
  if (totals.px > 0) nextEconomy = addFreePixels(nextEconomy, totals.px);
  if (totals.jewels > 0) nextEconomy = addJewels(nextEconomy, totals.jewels);
  if (totals.universalShards > 0) {
    nextInventory = addInventoryCount(
      nextInventory,
      'limitBreakUniversal',
      totals.universalShards,
    );
  }

  let nextState = state;
  for (const mission of claimable) {
    nextState = markClaimed(nextState, mission, date);
  }

  return {
    state: nextState,
    economy: nextEconomy,
    inventory: nextInventory,
    pxGranted: totals.px,
    jewelsGranted: totals.jewels,
    universalShardsGranted: totals.universalShards,
    missionIds: claimable.map((mission) => mission.id),
  };
}

export function claimAllMissions(
  state: MissionState,
  economy: UserEconomy,
  inventory: UserInventory,
  date: Date = new Date(),
): MissionBulkClaimResult {
  const claimable = listClaimableMissions(state);
  return claimMissionList(state, economy, inventory, claimable, date);
}

export function claimMissionsInCategory(
  state: MissionState,
  economy: UserEconomy,
  inventory: UserInventory,
  category: MissionCategory,
  date: Date = new Date(),
): MissionBulkClaimResult {
  const claimable = listClaimableMissionsInCategory(state, category);
  return claimMissionList(state, economy, inventory, claimable, date);
}

/** 達成済みだが未受取があるか */
export function hasUnclaimedRewards(state: MissionState): boolean {
  return listClaimableMissions(state).length > 0;
}
