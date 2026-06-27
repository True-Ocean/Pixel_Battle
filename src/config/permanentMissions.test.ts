import { describe, expect, it } from 'vitest';
import { createInitialMissionState } from '../user/missionState';
import {
  PERMANENT_COUNTER_SPECS,
  PERMANENT_INITIAL_TIER_CAP,
  buildPermanentCounterMission,
  buildPermanentGoalsUpTo,
  expandPermanentTierCapAfterClaim,
  getActivePermanentCounterMissions,
  getPermanentTierCap,
  permanentRewardForGoal,
} from '../config/permanentMissions';

describe('permanentMissions', () => {
  it('starts with goals up to 200 per counter category', () => {
    const state = createInitialMissionState();
    const missions = getActivePermanentCounterMissions(state);
    expect(missions).toHaveLength(PERMANENT_COUNTER_SPECS.length * 10);
    expect(getPermanentTierCap(state, 'permanent_cpu_battle_win')).toBe(
      PERMANENT_INITIAL_TIER_CAP,
    );
    expect(buildPermanentGoalsUpTo(200)).toEqual([
      20, 40, 60, 80, 100, 120, 140, 160, 180, 200,
    ]);
  });

  it('uses px20 for most tiers and jewels10 at every 100', () => {
    expect(permanentRewardForGoal(20)).toEqual({ px: 20 });
    expect(permanentRewardForGoal(80)).toEqual({ px: 20 });
    expect(permanentRewardForGoal(100)).toEqual({ jewels: 10 });
    expect(permanentRewardForGoal(200)).toEqual({ jewels: 10 });
    expect(permanentRewardForGoal(300)).toEqual({ jewels: 10 });
  });

  it('expands tier cap by 100 when the current cap mission is claimed', () => {
    const monday = new Date('2026-06-14T15:00:00.000Z');
    let state = createInitialMissionState(monday);
    const mission = buildPermanentCounterMission(
      PERMANENT_COUNTER_SPECS[0]!,
      200,
    );

    state = {
      ...state,
      entries: {
        permanent_cpu_battle_win_200: {
          progress: 200,
          completedAt: monday.toISOString(),
          claimedAt: monday.toISOString(),
        },
      },
    };

    const expanded = expandPermanentTierCapAfterClaim(state, mission, monday);
    expect(getPermanentTierCap(expanded, 'permanent_cpu_battle_win')).toBe(300);
    expect(expanded.entries.permanent_cpu_battle_win_220?.progress).toBe(200);
    expect(expanded.entries.permanent_cpu_battle_win_300?.progress).toBe(200);

    const missions = getActivePermanentCounterMissions(expanded).filter((m) =>
      m.id.startsWith('permanent_cpu_battle_win_'),
    );
    expect(missions).toHaveLength(15);
    expect(missions.at(-1)?.goal).toBe(300);
  });
});
