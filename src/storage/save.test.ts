import { describe, expect, it, beforeEach } from 'vitest';
import { createEmptyDeckSlots } from '../deckSlots';
import { createInitialEconomy } from '../user/economy';
import { createInitialInventory } from '../user/inventory';
import { createInitialAdState } from '../user/adState';
import { saveSave, loadSave, SAVE_SCHEMA_VERSION } from './index';
import type { Card } from '../types';

function makeCard(name: string, bp: number): Card {
  return {
    id: 'card-restore-test',
    name,
    pixels: [[ '#ff0000' ]],
    canvasSize: 1,
    attribute: 'attack',
    bp,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'SR',
    stars: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

const STORAGE_KEY = 'dot5-battle-save-v1';

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
  };
}

function baseSave() {
  return {
    schemaVersion: 1,
    user: {
      username: 'hero',
      level: 10,
      exp: 0,
      battleWins: 0,
      battleLosses: 0,
    },
    economy: createInitialEconomy(),
    inventory: createInitialInventory(),
    adState: createInitialAdState(),
    decks: createEmptyDeckSlots(),
    activeDeckIndex: 0,
    lastBattleDeckIndex: 0,
    unlockedDeckCount: 1,
    battleHistory: [],
  };
}

describe('saveSave merge', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock();
  });

  it('keeps subscription and palette unlocks when saving partial battle data', () => {
    saveSave({
      ...baseSave(),
      paletteShopUnlocks: [8, 12],
      subscription: {
        plan: 'light',
        expiresAt: '2099-01-01T00:00:00.000Z',
        nextGrantAt: '2099-01-01T00:00:00.000Z',
      },
    });

    saveSave({
      ...baseSave(),
      economy: { freePixels: 999, jewels: 5 },
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.paletteShopUnlocks).toEqual([8, 12]);
    expect(stored.subscription).toEqual({
      plan: 'light',
      expiresAt: '2099-01-01T00:00:00.000Z',
      nextGrantAt: '2099-01-01T00:00:00.000Z',
    });
  });
});

describe('loadSave', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock();
  });

  it('旧 schemaVersion のセーブを読み込み、カードと BP を維持して schema 1 に書き戻す', () => {
    const card = makeCard('復元テスト', 432);
    const decks = createEmptyDeckSlots();
    decks[0]![0] = card;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...baseSave(),
        schemaVersion: 13,
        decks,
      }),
    );

    const loaded = loadSave();
    expect(loaded.decks[0]![0]?.name).toBe('復元テスト');
    expect(loaded.decks[0]![0]?.bp).toBe(432);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(stored.decks[0][0].bp).toBe(432);
  });
});
