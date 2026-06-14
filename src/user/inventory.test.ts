import { describe, expect, it } from 'vitest';
import {
  addInventoryCount,
  addLimitBreakShards,
  createInitialInventory,
  normalizeUserInventory,
  spendInventoryCount,
  spendLimitBreakShards,
} from './inventory';

describe('user inventory', () => {
  it('creates empty inventory', () => {
    expect(createInitialInventory()).toEqual({
      talisman: 0,
      limitBreakUniversal: 0,
      limitBreakShards: {},
    });
  });

  it('normalizes invalid and partial values', () => {
    expect(normalizeUserInventory(null)).toEqual(createInitialInventory());
    expect(
      normalizeUserInventory({
        talisman: 2.8,
        limitBreakUniversal: -1,
        limitBreakShards: { attack: 3, unknown: 99, poison: 1.2 },
      }),
    ).toEqual({
      talisman: 2,
      limitBreakUniversal: 0,
      limitBreakShards: { attack: 3, poison: 1 },
    });
  });

  it('adds and spends talisman and universal items', () => {
    const inventory = addInventoryCount(createInitialInventory(), 'talisman', 2);
    expect(spendInventoryCount(inventory, 'talisman', 1)).toEqual({
      talisman: 1,
      limitBreakUniversal: 0,
      limitBreakShards: {},
    });
    expect(spendInventoryCount(inventory, 'talisman', 3)).toBeNull();
  });

  it('adds and spends attribute shards', () => {
    const withShards = addLimitBreakShards(createInitialInventory(), 'ice', 12);
    expect(withShards.limitBreakShards.ice).toBe(12);
    expect(spendLimitBreakShards(withShards, 'ice', 10)).toEqual({
      talisman: 0,
      limitBreakUniversal: 0,
      limitBreakShards: { ice: 2 },
    });
    expect(spendLimitBreakShards(withShards, 'ice', 12)).toEqual({
      talisman: 0,
      limitBreakUniversal: 0,
      limitBreakShards: {},
    });
  });
});
