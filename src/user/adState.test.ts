import { describe, expect, it } from 'vitest';
import {
  createInitialAdState,
  getBattlesDayKey,
  isNormalBattleAdsEnabledAtUserLevel,
  normalizeAdState,
  shouldRequireHistoryRematchAd,
  shouldRequireNormalBattleAd,
  shouldShowHistoryRematchRulesModal,
} from './adState';

describe('ad state', () => {
  it('creates initial ad state with JST day key', () => {
    const date = new Date('2026-06-14T15:00:00.000Z');
    expect(createInitialAdState(date)).toEqual({
      hasEverCompletedBattleDeck: false,
      battlesToday: 0,
      battlesDayKey: '2026-06-15',
      historyRematchStarts: 0,
      normalBattleStarts: 0,
    });
    expect(getBattlesDayKey(date)).toBe('2026-06-15');
  });

  it('resets battlesToday when day key is stale', () => {
    const today = new Date('2026-06-14T15:00:00.000Z');
    expect(
      normalizeAdState(
        {
          hasEverCompletedBattleDeck: true,
          battlesToday: 7,
          battlesDayKey: '2026-06-13',
        },
        today,
      ),
    ).toEqual({
      hasEverCompletedBattleDeck: true,
      battlesToday: 0,
      battlesDayKey: '2026-06-15',
      historyRematchStarts: 0,
      normalBattleStarts: 0,
    });
  });

  it('keeps battlesToday for the same JST day', () => {
    const today = new Date('2026-06-14T15:00:00.000Z');
    expect(
      normalizeAdState(
        {
          hasEverCompletedBattleDeck: false,
          battlesToday: 4,
          battlesDayKey: '2026-06-15',
        },
        today,
      ),
    ).toEqual({
      hasEverCompletedBattleDeck: false,
      battlesToday: 4,
      battlesDayKey: '2026-06-15',
      historyRematchStarts: 0,
      normalBattleStarts: 0,
    });
  });

  it('requires normal battle ad every 3 starts', () => {
    expect(shouldRequireNormalBattleAd(0)).toBe(false);
    expect(shouldRequireNormalBattleAd(1)).toBe(false);
    expect(shouldRequireNormalBattleAd(2)).toBe(true);
    expect(shouldRequireNormalBattleAd(3)).toBe(false);
    expect(shouldRequireNormalBattleAd(5)).toBe(true);
  });

  it('enables normal battle ads from user level 5', () => {
    expect(isNormalBattleAdsEnabledAtUserLevel(4)).toBe(false);
    expect(isNormalBattleAdsEnabledAtUserLevel(5)).toBe(true);
    expect(isNormalBattleAdsEnabledAtUserLevel(10)).toBe(true);
  });

  it('requires history rematch ad every 3 starts', () => {
    expect(shouldRequireHistoryRematchAd(0)).toBe(false);
    expect(shouldRequireHistoryRematchAd(1)).toBe(false);
    expect(shouldRequireHistoryRematchAd(2)).toBe(true);
    expect(shouldRequireHistoryRematchAd(3)).toBe(false);
    expect(shouldRequireHistoryRematchAd(5)).toBe(true);
  });

  it('shows history rematch rules until dismissed for today', () => {
    const date = new Date('2026-06-14T15:00:00.000Z');
    const adState = createInitialAdState(date);
    expect(shouldShowHistoryRematchRulesModal(adState, date)).toBe(true);
    expect(
      shouldShowHistoryRematchRulesModal(
        { ...adState, historyRematchRulesDismissedDayKey: '2026-06-15' },
        date,
      ),
    ).toBe(false);
    expect(
      shouldShowHistoryRematchRulesModal(
        { ...adState, historyRematchRulesDismissedDayKey: '2026-06-14' },
        date,
      ),
    ).toBe(true);
  });
});
