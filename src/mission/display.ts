import type { MissionCategory, MissionDefinition, MissionState } from './types';
import { isMissionClaimable, isMissionClaimed } from './progress';

function getMissionDisplayRank(
  state: MissionState,
  mission: MissionDefinition,
): number {
  if (isMissionClaimable(state, mission)) return 0;
  if (isMissionClaimed(state, mission)) return 2;
  return 1;
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

  return missions
    .map((mission, index) => ({ mission, index }))
    .sort((a, b) => {
      const rankDiff =
        getMissionDisplayRank(state, a.mission) -
        getMissionDisplayRank(state, b.mission);
      if (rankDiff !== 0) return rankDiff;
      return a.index - b.index;
    })
    .map(({ mission }) => mission);
}
