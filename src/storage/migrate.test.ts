import { describe, expect, it } from 'vitest';
import { createEmptyDeckSlots } from '../deckSlots';
import { SAVE_SCHEMA_VERSION, applyProgressionMigrations } from './index';
import { createInitialAdState } from '../user/adState';
import { createInitialEconomy } from '../user/economy';
import { createInitialInventory } from '../user/inventory';
import type { SaveData } from '../types';

function baseSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    schemaVersion: 1,
    user: null,
    economy: { freePixels: 1200 },
    decks: createEmptyDeckSlots(),
    activeDeckIndex: 0,
    lastBattleDeckIndex: 0,
    unlockedDeckCount: 1,
    ...overrides,
  };
}

describe('applyProgressionMigrations', () => {
  it('migrates schema v1 economy to v2 with jewels and empty inventory', () => {
    const migrated = applyProgressionMigrations(baseSave());
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(migrated.economy).toEqual({ freePixels: 1200, jewels: 0 });
    expect(migrated.inventory).toEqual(createInitialInventory());
    expect(migrated.adState).toEqual(createInitialAdState());
  });

  it('unlocks deck slot 2 for users already at level 10', () => {
    const migrated = applyProgressionMigrations(
      baseSave({
        user: {
          username: 'hero',
          level: 12,
          exp: 0,
          battleWins: 0,
          battleLosses: 0,
        },
        unlockedDeckCount: 1,
      }),
    );
    expect(migrated.unlockedDeckCount).toBe(2);
  });

  it('does not reduce unlocked deck count above 2', () => {
    const migrated = applyProgressionMigrations(
      baseSave({
        user: {
          username: 'hero',
          level: 15,
          exp: 0,
          battleWins: 0,
          battleLosses: 0,
        },
        unlockedDeckCount: 3,
      }),
    );
    expect(migrated.unlockedDeckCount).toBe(3);
  });
});
