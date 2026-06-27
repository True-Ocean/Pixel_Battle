import { describe, expect, it } from 'vitest';
import { createInitialMissionState } from '../user/missionState';
import {
  PERMANENT_COUNTER_SPECS,
  PERMANENT_INITIAL_TIER_CAP,
  buildPermanentCounterMission,
  buildPermanentGoalsUpTo,
  expandPermanentTierCapAfterClaim,
  getActivePermanentCounterMissions,
  getPermanentGoalStep,
  getPermanentTierCap,
  permanentRewardForGoal,
} from '../config/permanentMissions';

describe('permanentMissions', () => {
  it('starts with goals up to 200 per counter category', () => {
    const state = createInitialMissionState();
    const missions = getActivePermanentCounterMissions(state);
    const defaultSpecCount = PERMANENT_COUNTER_SPECS.filter(
      (spec) => getPermanentGoalStep(spec) === 10,
    ).length;
    expect(missions.length).toBeGreaterThan(defaultSpecCount * 10);
    expect(getPermanentTierCap(state, 'permanent_cpu_battle_win')).toBe(
      PERMANENT_INITIAL_TIER_CAP,
    );
    expect(buildPermanentGoalsUpTo(200, 10)).toEqual([
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180,
      190, 200,
    ]);
    expect(buildPermanentGoalsUpTo(200, 5)).toHaveLength(40);
    expect(buildPermanentGoalsUpTo(200, 3)).toHaveLength(66);
    expect(buildPermanentGoalsUpTo(200, 1)).toHaveLength(200);
  });

  it('uses px10 for most tiers and jewels10 at every 50', () => {
    expect(permanentRewardForGoal(10)).toEqual({ px: 10 });
    expect(permanentRewardForGoal(40)).toEqual({ px: 10 });
    expect(permanentRewardForGoal(50)).toEqual({ jewels: 10 });
    expect(permanentRewardForGoal(100)).toEqual({ jewels: 10 });
    expect(permanentRewardForGoal(150)).toEqual({ jewels: 10 });
    expect(permanentRewardForGoal(200)).toEqual({ jewels: 10 });
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
    expect(expanded.entries.permanent_cpu_battle_win_210?.progress).toBe(200);
    expect(expanded.entries.permanent_cpu_battle_win_300?.progress).toBe(200);

    const missions = getActivePermanentCounterMissions(expanded).filter((m) =>
      m.id.startsWith('permanent_cpu_battle_win_'),
    );
    expect(missions).toHaveLength(30);
    expect(missions.at(-1)?.goal).toBe(300);
  });
});
