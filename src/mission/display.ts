import { ALL_PERMANENT_COUNTER_SPECS } from '../config/permanentMissions';
import { PERMANENT_ACHIEVEMENT_TRACK_IDS } from '../config/permanentAchievements';
import type { MissionCategory, MissionDefinition, MissionState } from './types';
import {
  getMissionProgress,
  isMissionClaimable,
  isMissionClaimed,
} from './progress';

function getMissionDisplayRank(
  state: MissionState,
  mission: MissionDefinition,
): number {
  if (isMissionClaimable(state, mission)) return 0;
  if (isMissionClaimed(state, mission)) return 2;
  return 1;
}

function getPermanentRemaining(
  state: MissionState,
  mission: MissionDefinition,
): number {
  const progress = getMissionProgress(state, mission).progress;
  return Math.max(0, mission.goal - progress);
}

/** カウンター系: 未受取の達成分 → なければ次の未受取段階を1件 */
function pickPermanentCounterMission(
  missions: readonly MissionDefinition[],
  state: MissionState,
  idPrefix: string,
): MissionDefinition | null {
  const categoryMissions = missions
    .filter((mission) => mission.id.startsWith(`${idPrefix}_`))
    .slice()
    .sort((a, b) => a.goal - b.goal);

  const claimable = categoryMissions.find((mission) =>
    isMissionClaimable(state, mission),
  );
  if (claimable) return claimable;

  const next = categoryMissions.find((mission) => !isMissionClaimed(state, mission));
  return next ?? null;
}

/** 達成型: トラックごとに未受取を1件（受取済みトラックは非表示） */
function pickPermanentAchievementMission(
  missions: readonly MissionDefinition[],
  state: MissionState,
  trackId: string,
): MissionDefinition | null {
  const mission = missions.find((item) => item.displayTrackId === trackId);
  if (!mission) return null;
  if (isMissionClaimed(state, mission)) return null;

  if (isMissionClaimable(state, mission)) return mission;
  return mission;
}

/** 常設: 各カテゴリ1件（未受取達成分優先、なければ次の段階） */
export function filterMissionsForDisplay(
  missions: readonly MissionDefinition[],
  state: MissionState,
  category: MissionCategory,
): MissionDefinition[] {
  if (category !== 'permanent') {
    return [...missions];
  }

  const picked: MissionDefinition[] = [];

  for (const spec of ALL_PERMANENT_COUNTER_SPECS) {
    const mission = pickPermanentCounterMission(missions, state, spec.idPrefix);
    if (mission) picked.push(mission);
  }

  for (const trackId of PERMANENT_ACHIEVEMENT_TRACK_IDS) {
    const mission = pickPermanentAchievementMission(missions, state, trackId);
    if (mission) picked.push(mission);
  }

  return picked
    .slice()
    .sort((a, b) => {
      const rankDiff =
        getMissionDisplayRank(state, a) - getMissionDisplayRank(state, b);
      if (rankDiff !== 0) return rankDiff;
      return getPermanentRemaining(state, a) - getPermanentRemaining(state, b);
    });
}

/** デイリー・ウィークリー・常設は未完了を上、受取済みを下へ。ビギナーは STEP 順を維持 */
export function sortMissionsForDisplay(
  missions: readonly MissionDefinition[],
  state: MissionState,
  category: MissionCategory,
): MissionDefinition[] {
  if (category === 'beginner') {
    return [...missions];
  }

  const visible = filterMissionsForDisplay(missions, state, category);

  return visible
    .map((mission, index) => ({ mission, index }))
    .sort((a, b) => {
      const rankDiff =
        getMissionDisplayRank(state, a.mission) -
        getMissionDisplayRank(state, b.mission);
      if (rankDiff !== 0) return rankDiff;
      if (category === 'permanent') {
        return (
          getPermanentRemaining(state, a.mission) -
          getPermanentRemaining(state, b.mission)
        );
      }
      return a.index - b.index;
    })
    .map(({ mission }) => mission);
}
