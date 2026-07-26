import { describe, expect, it } from 'vitest';
import { getBeginnerMissions, getMissionsByCategory } from '../config/missions';
import { createInitialMissionState } from '../user/missionState';
import { filterMissionsForDisplay, sortMissionsForDisplay } from './display';

const monday = new Date('2026-06-14T15:00:00.000Z');

describe('sortMissionsForDisplay', () => {
  it('puts claimed beginner missions last, preserving STEP order within groups', () => {
    const missions = getBeginnerMissions();
    let state = createInitialMissionState(monday);
    state = {
      ...state,
      entries: {
        ...state.entries,
        beginner_create_card: {
          progress: 1,
          completedAt: monday.toISOString(),
          claimedAt: monday.toISOString(),
        },
        beginner_edit_card: {
          progress: 1,
          completedAt: monday.toISOString(),
          claimedAt: monday.toISOString(),
        },
      },
    };

    const sorted = sortMissionsForDisplay(missions, state, 'beginner').map(
      (m) => m.id,
    );
    const unclaimed = missions
      .filter((m) => m.id !== 'beginner_create_card' && m.id !== 'beginner_edit_card')
      .map((m) => m.id);
    expect(sorted).toEqual([
      ...unclaimed,
      'beginner_create_card',
      'beginner_edit_card',
    ]);
  });

  it('puts claimable missions first, claimed last, preserving config order within groups', () => {
    const missions = getMissionsByCategory('daily');
    const state = createInitialMissionState(monday);
    const withProgress = {
      ...state,
      entries: {
        daily_login: {
          progress: 1,
          completedAt: monday.toISOString(),
          claimedAt: monday.toISOString(),
        },
        daily_cpu_battle_win_1: {
          progress: 1,
          completedAt: monday.toISOString(),
        },
      },
    };

    expect(
      sortMissionsForDisplay(missions, withProgress, 'daily').map((m) => m.id),
    ).toEqual([
      'daily_cpu_battle_win_1',
      'daily_cpu_battle_win_3',
      'daily_cpu_battle_win_5',
      'daily_login',
    ]);
  });

  it('applies the same ordering to weekly missions', () => {
    const weekly = getMissionsByCategory('weekly');
    const state = createInitialMissionState(monday);
    const withProgress = {
      ...state,
      entries: {
        weekly_limit_break: {
          progress: 1,
          completedAt: monday.toISOString(),
          claimedAt: monday.toISOString(),
        },
      },
    };

    expect(
      sortMissionsForDisplay(weekly, withProgress, 'weekly').map((m) => m.id),
    ).toEqual([
      'weekly_login_5',
      'weekly_cpu_battle_win_10',
      'weekly_cpu_battle_win_20',
      'weekly_attribute_gacha',
      'weekly_limit_break',
    ]);
  });

  it('shows offline pvp daily missions instead of cpu 5-win at level 10', () => {
    const missions = getMissionsByCategory('daily', undefined, 10);
    expect(missions.map((m) => m.id)).toEqual([
      'daily_login',
      'daily_cpu_battle_win_1',
      'daily_cpu_battle_win_3',
      'daily_offline_pvp_battle_win_1',
      'daily_offline_pvp_battle_win_3',
    ]);
  });

  it('shows one next permanent mission per counter category and achievement track', () => {
    const state = createInitialMissionState(monday);
    const permanent = getMissionsByCategory('permanent', state, 1);

    const visible = filterMissionsForDisplay(permanent, state, 'permanent');
    expect(visible.map((m) => m.id)).toEqual(
      expect.arrayContaining([
        'permanent_cpu_battle_win_10',
        'permanent_offline_pvp_battle_win_10',
        'permanent_card_created_10',
        'permanent_limit_break_5',
        'permanent_memory_album_saved_1',
        'permanent_card_revived_3',
        'permanent_own_rarity_r_1',
        'permanent_win_with_rarity_r_1',
        'permanent_own_rarity_sr_1',
        'permanent_win_with_rarity_sr_1',
      ]),
    );
    expect(
      visible.find((mission) => mission.id.startsWith('permanent_own_attribute_')),
    ).toBeUndefined();

    const level6Permanent = getMissionsByCategory('permanent', state, 6);
    const level6Visible = filterMissionsForDisplay(level6Permanent, state, 'permanent');
    expect(level6Visible.map((m) => m.id)).toEqual(
      expect.arrayContaining([
        'permanent_own_attribute_power',
        'permanent_win_with_attribute_power',
      ]),
    );

    const withProgress = {
      ...state,
      entries: {
        permanent_cpu_battle_win_10: {
          progress: 10,
          completedAt: monday.toISOString(),
        },
        permanent_cpu_battle_win_20: {
          progress: 12,
        },
      },
    };

    expect(
      filterMissionsForDisplay(permanent, withProgress, 'permanent').find((m) =>
        m.id.startsWith('permanent_cpu_battle_win_'),
      )?.id,
    ).toBe('permanent_cpu_battle_win_10');

    const afterClaim = {
      ...withProgress,
      entries: {
        ...withProgress.entries,
        permanent_cpu_battle_win_10: {
          progress: 10,
          completedAt: monday.toISOString(),
          claimedAt: monday.toISOString(),
        },
      },
    };

    expect(
      filterMissionsForDisplay(permanent, afterClaim, 'permanent').find((m) =>
        m.id.startsWith('permanent_cpu_battle_win_'),
      )?.id,
    ).toBe('permanent_cpu_battle_win_20');
  });
});
