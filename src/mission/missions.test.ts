import { describe, expect, it } from 'vitest';
import { createInitialEconomy } from '../user/economy';
import { getBattlesDayKey } from '../user/adState';
import { createInitialMissionState } from '../user/missionState';
import {
  applyMissionEvents,
  claimAllMissions,
  claimMission,
  claimMissionsInCategory,
  getMissionById,
  reportMissionEvent,
} from '../mission';
import { applyMissionResets, getMissionWeekKey } from '../mission/reset';
import { isMissionClaimable } from '../mission/progress';

const monday = new Date('2026-06-14T15:00:00.000Z'); // JST 2026-06-15 Mon
const tuesday = new Date('2026-06-15T15:00:00.000Z'); // JST 2026-06-16 Tue
const nextMonday = new Date('2026-06-21T15:00:00.000Z'); // JST 2026-06-22 Mon

describe('mission reset', () => {
  it('uses JST day key and Monday week key', () => {
    expect(getBattlesDayKey(monday)).toBe('2026-06-15');
    expect(getMissionWeekKey(monday)).toBe('2026-06-15');
    expect(getMissionWeekKey(tuesday)).toBe('2026-06-15');
    expect(getMissionWeekKey(nextMonday)).toBe('2026-06-22');
  });

  it('clears daily progress when day changes', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'battle_win', 1, monday).state;
    expect(state.entries.daily_battle_win?.progress).toBe(1);

    state = applyMissionResets(state, tuesday);
    expect(state.entries.daily_battle_win).toBeUndefined();
    expect(state.dailyDayKey).toBe('2026-06-16');
  });
});

describe('mission progress and claim', () => {
  it('records app_open once per day', () => {
    let state = createInitialMissionState(monday);
    const first = reportMissionEvent(state, 'app_open', 1, monday);
    expect(first.newlyCompleted.map((m) => m.id)).toEqual(['daily_login']);
    const second = reportMissionEvent(first.state, 'app_open', 1, monday);
    expect(second.state.entries.daily_login?.progress).toBe(1);
    expect(second.newlyCompleted).toEqual([]);
  });

  it('applies multiple events in one call', () => {
    let state = createInitialMissionState(monday);
    const result = applyMissionEvents(state, [
      { type: 'battle_play' },
      { type: 'battle_win' },
    ], monday);
    expect(result.state.entries.daily_battle_win?.progress).toBe(1);
    expect(result.state.entries.weekly_battle_play?.progress).toBe(1);
    expect(result.state.entries.weekly_battle_win?.progress).toBe(1);
    expect(result.newlyCompleted.map((m) => m.id)).toEqual(['daily_battle_win']);
  });

  it('claims reward and prevents double claim', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'app_open', 1, monday).state;
    const economy = createInitialEconomy();

    const claimed = claimMission(state, economy, 'daily_login', monday);
    expect(claimed).not.toBeNull();
    expect(claimed!.pxGranted).toBe(50);
    expect(claimed!.economy.freePixels).toBe(50);
    expect(claimed!.state.entries.daily_login?.claimedAt).toBeTruthy();

    const again = claimMission(claimed!.state, claimed!.economy, 'daily_login', monday);
    expect(again).toBeNull();
  });

  it('bulk claim sums rewards for all claimable missions', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'app_open', 1, monday).state;
    state = reportMissionEvent(state, 'card_created', 1, monday).state;

    const economy = createInitialEconomy();
    const bulk = claimAllMissions(state, economy, monday);
    expect(bulk.missionIds.sort()).toEqual(
      ['beginner_create_card', 'daily_card_create', 'daily_login'].sort(),
    );
    expect(bulk.pxGranted).toBe(260);
    expect(bulk.jewelsGranted).toBe(5);
    expect(isMissionClaimable(bulk.state, getMissionById('daily_login')!)).toBe(false);
  });

  it('bulk claim only claims missions in the given category', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'app_open', 1, monday).state;
    state = reportMissionEvent(state, 'card_created', 1, monday).state;

    const economy = createInitialEconomy();
    const bulk = claimMissionsInCategory(state, economy, 'daily', monday);
    expect(bulk.missionIds.sort()).toEqual(['daily_card_create', 'daily_login'].sort());
    expect(bulk.pxGranted).toBe(110);
    expect(isMissionClaimable(bulk.state, getMissionById('beginner_create_card')!)).toBe(true);
  });

  it('unlocks beginner missions sequentially after claim', () => {
    let state = createInitialMissionState(monday);
    let economy = createInitialEconomy();

    state = reportMissionEvent(state, 'card_edit_saved', 1, monday).state;
    expect(state.entries.beginner_edit_card).toBeUndefined();

    state = reportMissionEvent(state, 'card_created', 1, monday).state;
    expect(state.entries.beginner_create_card?.completedAt).toBeTruthy();

    const claimCreate = claimMission(state, economy, 'beginner_create_card', monday)!;
    state = claimCreate.state;
    economy = claimCreate.economy;

    state = reportMissionEvent(state, 'card_edit_saved', 1, monday).state;
    expect(state.entries.beginner_edit_card?.progress).toBe(1);
  });

  it('marks beginnerCompleted when all beginner missions are claimed', () => {
    let state = createInitialMissionState(monday);
    let economy = createInitialEconomy();

    const steps: Array<[Parameters<typeof reportMissionEvent>[1], number]> = [
      ['card_created', 1],
      ['card_edit_saved', 1],
      ['battle_play', 1],
      ['battle_win', 1],
    ];

    for (const [eventType, amount] of steps) {
      state = reportMissionEvent(state, eventType, amount, monday).state;
      const claimable = ['beginner_create_card', 'beginner_edit_card', 'beginner_battle_play', 'beginner_battle_win']
        .find((id) => isMissionClaimable(state, { id } as never));
      if (claimable) {
        const result = claimMission(state, economy, claimable, monday)!;
        state = result.state;
        economy = result.economy;
      }
    }

    expect(state.beginnerCompleted).toBe(true);
  });
});
