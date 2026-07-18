import { describe, expect, it } from 'vitest';
import { createEmptyDeckSlots } from '../deckSlots';
import { SAVE_SCHEMA_VERSION, normalizeSaveData } from './index';
import { createInitialAdState } from '../user/adState';
import { createInitialInventory } from '../user/inventory';
import type { SaveData, UserEconomy } from '../types';

function baseSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    user: null,
    economy: { freePixels: 1200 } as UserEconomy,
    decks: createEmptyDeckSlots(),
    activeDeckIndex: 0,
    lastBattleDeckIndex: 0,
    unlockedDeckCount: 1,
    ...overrides,
  };
}

describe('normalizeSaveData', () => {
  it('economy と inventory を正規化する', () => {
    const normalized = normalizeSaveData(baseSave());
    expect(normalized.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(normalized.economy).toEqual({ freePixels: 1200, jewels: 0 });
    expect(normalized.inventory).toEqual(createInitialInventory());
    expect(normalized.adState).toEqual(createInitialAdState());
  });

  it('レベル10以上のユーザーはデッキスロット2を解放する', () => {
    const normalized = normalizeSaveData(
      baseSave({
        user: {
          username: 'hero',
          level: 12,
          exp: 0,
          battleWins: 0,
          battleLosses: 0,
          cpuBattleWins: 0,
          cpuBattleLosses: 0,
          offlinePvpBattleWins: 0,
          offlinePvpBattleLosses: 0,
        },
        unlockedDeckCount: 1,
      }),
    );
    expect(normalized.unlockedDeckCount).toBe(2);
  });

  it('解放済みデッキ数を2未満に下げない', () => {
    const normalized = normalizeSaveData(
      baseSave({
        user: {
          username: 'hero',
          level: 15,
          exp: 0,
          battleWins: 0,
          battleLosses: 0,
          cpuBattleWins: 0,
          cpuBattleLosses: 0,
          offlinePvpBattleWins: 0,
          offlinePvpBattleLosses: 0,
        },
        unlockedDeckCount: 3,
      }),
    );
    expect(normalized.unlockedDeckCount).toBe(3);
  });
});
