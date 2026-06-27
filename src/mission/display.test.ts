import { describe, expect, it } from 'vitest';
import { getBeginnerMissions, getMissionsByCategory } from '../config/missions';
import { createInitialMissionState } from '../user/missionState';
import { filterMissionsForDisplay, sortMissionsForDisplay } from './display';

const monday = new Date('2026-06-14T15:00:00.000Z');

describe('sortMissionsForDisplay', () => {
  it('keeps beginner missions in config order', () => {
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
      },
    };

    expect(sortMissionsForDisplay(missions, state, 'beginner').map((m) => m.id)).toEqual(
      missions.map((m) => m.id),
    );
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
      'daily_card_edit',
      'daily_history_rematch_win',
      'daily_login',
    ]);
  });

  it('applies the same ordering to weekly missions', () => {
    const weekly = getMissionsByCategory('weekly');
    const state = createInitialMissionState(monday);
    const withProgress = {
      ...state,
      entries: {
        weekly_cpu_battle_win_30: {
          progress: 30,
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
      'weekly_history_rematch_win_2',
      'weekly_attribute_retouch',
      'weekly_limit_break',
      'weekly_cpu_battle_win_30',
    ]);
  });

  it('shows one next permanent mission per counter category', () => {
    const state = createInitialMissionState(monday);
    const permanent = getMissionsByCategory('permanent', state);

    const visible = filterMissionsForDisplay(permanent, state, 'permanent');
    expect(visible).toHaveLength(13);
    expect(visible.map((m) => m.id)).toEqual(
      expect.arrayContaining([
        'permanent_cpu_battle_win_20',
        'permanent_card_created_20',
        'permanent_card_edit_saved_20',
        'permanent_attribute_retouch_20',
        'permanent_limit_break_20',
        'permanent_memory_album_saved_20',
        'permanent_card_revived_20',
        'permanent_card_deleted_20',
        'permanent_card_renamed_20',
        'permanent_card_note_saved_20',
        'permanent_canvas_resized_20',
        'permanent_attribute_selected_20',
        'permanent_attribute_collection_all',
      ]),
    );
    expect(visible.every((m) => m.goal === 20 || m.id === 'permanent_attribute_collection_all')).toBe(
      true,
    );

    const withProgress = {
      ...state,
      entries: {
        permanent_cpu_battle_win_20: {
          progress: 20,
          completedAt: monday.toISOString(),
        },
        permanent_cpu_battle_win_40: {
          progress: 25,
        },
      },
    };

    expect(
      filterMissionsForDisplay(permanent, withProgress, 'permanent').find(
        (m) => m.id.startsWith('permanent_cpu_battle_win_'),
      )?.id,
    ).toBe('permanent_cpu_battle_win_20');

    const afterClaim = {
      ...withProgress,
      entries: {
        ...withProgress.entries,
        permanent_cpu_battle_win_20: {
          progress: 20,
          completedAt: monday.toISOString(),
          claimedAt: monday.toISOString(),
        },
      },
    };

    expect(
      filterMissionsForDisplay(permanent, afterClaim, 'permanent').find(
        (m) => m.id.startsWith('permanent_cpu_battle_win_'),
      )?.id,
    ).toBe('permanent_cpu_battle_win_40');
  });
});
