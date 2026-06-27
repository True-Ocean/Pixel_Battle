import { describe, expect, it } from 'vitest';
import { createInitialEconomy } from '../user/economy';
import { createInitialInventory } from '../user/inventory';
import { getBattlesDayKey } from '../user/adState';
import { createInitialMissionState } from '../user/missionState';
import {
  applyMissionEvents,
  claimAllMissions,
  claimMission,
  claimMissionsInCategory,
  getBeginnerMissions,
  getMissionById,
  reportMissionEvent,
} from '../mission';
import type { MissionEventType } from '../mission';
import { applyMissionResets, getMissionWeekKey, hasMissionPeriodExpired } from '../mission/reset';
import {
  isCurrentBeginnerMission,
  isMissionClaimable,
} from '../mission/progress';

const monday = new Date('2026-06-14T15:00:00.000Z'); // JST 2026-06-15 Mon
const tuesday = new Date('2026-06-15T15:00:00.000Z'); // JST 2026-06-16 Tue
const nextMonday = new Date('2026-06-21T15:00:00.000Z'); // JST 2026-06-22 Mon

const BEGINNER_MISSION_EVENTS: Array<[MissionEventType, number]> = [
  ['card_created', 1],
  ['card_created', 4],
  ['card_edit_saved', 1],
  ['deck_reordered', 1],
  ['attribute_battle_guide_viewed', 1],
  ['attribute_retouch', 1],
  ['battle_play', 1],
  ['battle_log_viewed', 1],
  ['battle_win', 1],
  ['history_opponent_detail_viewed', 1],
  ['history_rematch_play', 1],
  ['limit_break', 1],
];

function claimNextBeginnerMission(
  state: ReturnType<typeof createInitialMissionState>,
  economy: ReturnType<typeof createInitialEconomy>,
  inventory: ReturnType<typeof createInitialInventory>,
) {
  for (const mission of getBeginnerMissions()) {
    if (isMissionClaimable(state, mission)) {
      return claimMission(state, economy, inventory, mission.id, monday)!;
    }
  }
  return null;
}

describe('mission reset', () => {
  it('uses JST day key and Monday week key', () => {
    expect(getBattlesDayKey(monday)).toBe('2026-06-15');
    expect(getMissionWeekKey(monday)).toBe('2026-06-15');
    expect(getMissionWeekKey(tuesday)).toBe('2026-06-15');
    expect(getMissionWeekKey(nextMonday)).toBe('2026-06-22');
  });

  it('detects expired daily and weekly periods', () => {
    const state = createInitialMissionState(monday);
    expect(hasMissionPeriodExpired(state, monday)).toBe(false);
    expect(hasMissionPeriodExpired(state, tuesday)).toBe(true);
    expect(hasMissionPeriodExpired(state, nextMonday)).toBe(true);
  });

  it('clears daily progress when day changes', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'cpu_battle_win', 1, monday).state;
    expect(state.entries.daily_cpu_battle_win_1?.progress).toBe(1);

    state = applyMissionResets(state, tuesday);
    expect(state.entries.daily_cpu_battle_win_1).toBeUndefined();
    expect(state.dailyDayKey).toBe('2026-06-16');
  });

  it('clears weekly progress when week changes', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'cpu_battle_win', 3, tuesday).state;
    expect(state.entries.weekly_cpu_battle_win_10?.progress).toBe(3);

    state = applyMissionResets(state, nextMonday);
    expect(state.entries.weekly_cpu_battle_win_10).toBeUndefined();
    expect(state.weeklyWeekKey).toBe('2026-06-22');
  });

  it('drops unclaimed daily completion on day change', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'app_open', 1, monday).state;
    expect(isMissionClaimable(state, getMissionById('daily_login')!)).toBe(true);

    state = applyMissionResets(state, tuesday);
    expect(state.entries.daily_login).toBeUndefined();
    expect(isMissionClaimable(state, getMissionById('daily_login')!)).toBe(false);
  });

  it('keeps permanent progress across daily reset', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'cpu_battle_win', 5, monday).state;

    state = applyMissionResets(state, tuesday);
    expect(state.entries.permanent_cpu_battle_win_10?.progress).toBe(5);
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
      { type: 'cpu_battle_win' },
    ], monday);
    expect(result.state.entries.daily_cpu_battle_win_1?.progress).toBe(1);
    expect(result.state.entries.weekly_cpu_battle_win_10?.progress).toBe(1);
    expect(result.newlyCompleted.map((m) => m.id)).toEqual(['daily_cpu_battle_win_1']);
  });

  it('counts cpu and rematch wins separately for daily missions', () => {
    let state = createInitialMissionState(monday);

    state = applyMissionEvents(state, [
      { type: 'battle_play' },
      { type: 'battle_win' },
      { type: 'cpu_battle_win' },
    ], monday).state;
    expect(state.entries.daily_cpu_battle_win_1?.progress).toBe(1);
    expect(state.entries.daily_history_rematch_win).toBeUndefined();

    state = applyMissionEvents(state, [
      { type: 'battle_play' },
      { type: 'history_rematch_play' },
      { type: 'battle_win' },
      { type: 'history_rematch_win' },
    ], monday).state;
    expect(state.entries.daily_cpu_battle_win_1?.progress).toBe(1);
    expect(state.entries.daily_history_rematch_win?.progress).toBe(1);
  });

  it('grants jewel from daily cpu 5-win mission', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'cpu_battle_win', 5, monday).state;
    const economy = createInitialEconomy();
    const inventory = createInitialInventory();

    const claimed = claimMission(
      state,
      economy,
      inventory,
      'daily_cpu_battle_win_5',
      monday,
    )!;
    expect(claimed.pxGranted).toBe(15);
    expect(claimed.jewelsGranted).toBe(1);
    expect(claimed.economy.jewels).toBe(1);
  });

  it('advances tiered weekly cpu win missions together', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'cpu_battle_win', 10, monday).state;

    expect(state.entries.weekly_cpu_battle_win_10?.progress).toBe(10);
    expect(state.entries.weekly_cpu_battle_win_20?.progress).toBe(10);
    expect(state.entries.weekly_cpu_battle_win_30?.progress).toBe(10);
    expect(isMissionClaimable(state, getMissionById('weekly_cpu_battle_win_10')!)).toBe(
      true,
    );
    expect(isMissionClaimable(state, getMissionById('weekly_cpu_battle_win_20')!)).toBe(
      false,
    );
    expect(isMissionClaimable(state, getMissionById('weekly_cpu_battle_win_30')!)).toBe(
      false,
    );
  });

  it('claims reward and prevents double claim', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'app_open', 1, monday).state;
    const economy = createInitialEconomy();
    const inventory = createInitialInventory();

    const claimed = claimMission(state, economy, inventory, 'daily_login', monday);
    expect(claimed).not.toBeNull();
    expect(claimed!.pxGranted).toBe(5);
    expect(claimed!.economy.freePixels).toBe(5);
    expect(claimed!.state.entries.daily_login?.claimedAt).toBeTruthy();

    const again = claimMission(
      claimed!.state,
      claimed!.economy,
      claimed!.inventory,
      'daily_login',
      monday,
    );
    expect(again).toBeNull();
  });

  it('grants universal shards from mission reward', () => {
    let state = createInitialMissionState(monday);
    let economy = createInitialEconomy();
    let inventory = createInitialInventory();

    for (let i = 0; i < BEGINNER_MISSION_EVENTS.length - 1; i++) {
      const [eventType, amount] = BEGINNER_MISSION_EVENTS[i]!;
      state = reportMissionEvent(state, eventType, amount, monday).state;
      const claimResult = claimNextBeginnerMission(state, economy, inventory);
      if (claimResult) {
        state = claimResult.state;
        economy = claimResult.economy;
        inventory = claimResult.inventory;
      }
    }

    state = reportMissionEvent(state, 'limit_break', 1, monday).state;
    const claimed = claimMission(
      state,
      economy,
      inventory,
      'beginner_limit_break',
      monday,
    )!;
    expect(claimed.universalShardsGranted).toBe(10);
    expect(claimed.inventory.limitBreakUniversal).toBe(10);
  });

  it('bulk claim sums rewards for all claimable missions', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'app_open', 1, monday).state;
    state = reportMissionEvent(state, 'card_edit_saved', 1, monday).state;

    const economy = createInitialEconomy();
    const inventory = createInitialInventory();
    const bulk = claimAllMissions(state, economy, inventory, monday);
    expect(bulk.missionIds.sort()).toEqual(
      ['daily_card_edit', 'daily_login'].sort(),
    );
    expect(bulk.pxGranted).toBe(10);
    expect(bulk.jewelsGranted).toBe(0);
    expect(isMissionClaimable(bulk.state, getMissionById('daily_login')!)).toBe(false);
  });

  it('bulk claim only claims missions in the given category', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'app_open', 1, monday).state;
    state = reportMissionEvent(state, 'card_edit_saved', 1, monday).state;

    const economy = createInitialEconomy();
    const inventory = createInitialInventory();
    const bulk = claimMissionsInCategory(state, economy, inventory, 'daily', monday);
    expect(bulk.missionIds.sort()).toEqual(['daily_card_edit', 'daily_login'].sort());
    expect(bulk.pxGranted).toBe(10);
    expect(isMissionClaimable(bulk.state, getMissionById('beginner_create_card')!)).toBe(false);
  });

  it('unlocks beginner missions sequentially after claim', () => {
    let state = createInitialMissionState(monday);
    let economy = createInitialEconomy();
    let inventory = createInitialInventory();

    state = reportMissionEvent(state, 'card_edit_saved', 1, monday).state;
    expect(state.entries.beginner_edit_card).toBeUndefined();

    state = reportMissionEvent(state, 'card_created', 1, monday).state;
    expect(state.entries.beginner_create_card?.completedAt).toBeTruthy();

    const claimCreate = claimMission(
      state,
      economy,
      inventory,
      'beginner_create_card',
      monday,
    )!;
    state = claimCreate.state;
    economy = claimCreate.economy;
    inventory = claimCreate.inventory;

    state = reportMissionEvent(state, 'card_edit_saved', 1, monday).state;
    expect(state.entries.beginner_edit_card).toBeUndefined();

    state = reportMissionEvent(state, 'card_created', 4, monday).state;
    expect(state.entries.beginner_fill_deck?.progress).toBe(4);
  });

  it('tracks the single active beginner mission', () => {
    let state = createInitialMissionState(monday);
    const create = getMissionById('beginner_create_card')!;
    const fillDeck = getMissionById('beginner_fill_deck')!;

    expect(isCurrentBeginnerMission(state, create)).toBe(true);
    expect(isCurrentBeginnerMission(state, fillDeck)).toBe(false);

    state = reportMissionEvent(state, 'card_created', 1, monday).state;
    expect(isCurrentBeginnerMission(state, create)).toBe(true);

    const economy = createInitialEconomy();
    const inventory = createInitialInventory();
    state = claimMission(state, economy, inventory, 'beginner_create_card', monday)!.state;
    expect(isCurrentBeginnerMission(state, create)).toBe(false);
    expect(isCurrentBeginnerMission(state, fillDeck)).toBe(true);
  });

  it('marks beginnerCompleted when all beginner missions are claimed', () => {
    let state = createInitialMissionState(monday);
    let economy = createInitialEconomy();
    let inventory = createInitialInventory();

    for (const [eventType, amount] of BEGINNER_MISSION_EVENTS) {
      state = reportMissionEvent(state, eventType, amount, monday).state;
      const claimResult = claimNextBeginnerMission(state, economy, inventory);
      if (claimResult) {
        state = claimResult.state;
        economy = claimResult.economy;
        inventory = claimResult.inventory;
      }
    }

    expect(state.beginnerCompleted).toBe(true);
    expect(getBeginnerMissions()).toHaveLength(12);
  });
});
