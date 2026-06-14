import { describe, expect, it } from 'vitest';
import {
  createInitialAdState,
  getBattlesDayKey,
  normalizeAdState,
} from './adState';

describe('ad state', () => {
  it('creates initial ad state with JST day key', () => {
    const date = new Date('2026-06-14T15:00:00.000Z');
    expect(createInitialAdState(date)).toEqual({
      hasEverCompletedBattleDeck: false,
      battlesToday: 0,
      battlesDayKey: '2026-06-15',
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
    });
  });
});
