import { describe, expect, it } from 'vitest';
import { getBeginnerMissions, getMissionsByCategory } from '../config/missions';
import { createInitialMissionState } from '../user/missionState';
import { sortMissionsForDisplay } from './display';

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

  it('applies the same ordering to weekly and permanent categories', () => {
    const weekly = getMissionsByCategory('weekly');
    const state = createInitialMissionState(monday);
    const withProgress = {
      ...state,
      entries: {
        weekly_battle_win: {
          progress: 5,
          completedAt: monday.toISOString(),
          claimedAt: monday.toISOString(),
        },
      },
    };

    expect(
      sortMissionsForDisplay(weekly, withProgress, 'weekly').map((m) => m.id),
    ).toEqual(['weekly_battle_play', 'weekly_card_edit', 'weekly_battle_win']);
  });
});
