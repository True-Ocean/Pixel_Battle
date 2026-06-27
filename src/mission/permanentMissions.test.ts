import { describe, expect, it } from 'vitest';
import { claimMission, reportMissionEvent } from '../mission';
import { getMissionById } from '../config/missions';
import { getPermanentTierCap } from '../config/permanentMissions';
import { createInitialEconomy } from '../user/economy';
import { createInitialInventory } from '../user/inventory';
import { createInitialMissionState } from '../user/missionState';

const monday = new Date('2026-06-14T15:00:00.000Z');

describe('permanent mission ladder', () => {
  it('completes tier at goal and grants px20', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'card_created', 20, monday).state;

    const mission = getMissionById('permanent_card_created_20', state)!;
    expect(mission).toBeTruthy();

    const economy = createInitialEconomy();
    const inventory = createInitialInventory();
    const claimed = claimMission(
      state,
      economy,
      inventory,
      'permanent_card_created_20',
      monday,
    )!;

    expect(claimed.pxGranted).toBe(20);
    expect(claimed.jewelsGranted).toBe(0);
    expect(claimed.state.entries.permanent_card_created_40?.progress).toBe(20);
  });

  it('grants jewels10 at 100 and 200 milestones', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'limit_break', 100, monday).state;

    const economy = createInitialEconomy();
    const inventory = createInitialInventory();
    const claimed = claimMission(
      state,
      economy,
      inventory,
      'permanent_limit_break_100',
      monday,
    )!;

    expect(claimed.pxGranted).toBe(0);
    expect(claimed.jewelsGranted).toBe(10);
  });

  it('adds the next 100 tiers when claiming the current cap', () => {
    let state = createInitialMissionState(monday);
    state = reportMissionEvent(state, 'cpu_battle_win', 200, monday).state;

    const economy = createInitialEconomy();
    const inventory = createInitialInventory();
    const claimed = claimMission(
      state,
      economy,
      inventory,
      'permanent_cpu_battle_win_200',
      monday,
    )!;

    expect(getPermanentTierCap(claimed.state, 'permanent_cpu_battle_win')).toBe(
      300,
    );
    expect(
      getMissionById('permanent_cpu_battle_win_300', claimed.state),
    ).toBeTruthy();
    expect(claimed.state.entries.permanent_cpu_battle_win_220?.progress).toBe(
      200,
    );
  });
});
