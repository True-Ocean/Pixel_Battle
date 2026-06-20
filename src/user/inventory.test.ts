import { describe, expect, it } from 'vitest';
import {
  addInventoryCount,
  addLimitBreakShards,
  canAffordLimitBreak,
  createInitialInventory,
  fillAllLimitBreakShards,
  getUniformAttributeShardsCount,
  normalizeUserInventory,
  setAllAttributeLimitBreakShards,
  setTalismanCount,
  setUniversalLimitBreakShards,
  spendInventoryCount,
  spendLimitBreakShards,
  spendLimitBreakResources,
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

  it('canAffordLimitBreak: 専用+汎用の合計が必要数以上', () => {
    expect(canAffordLimitBreak(10, 0, 10)).toBe(true);
    expect(canAffordLimitBreak(5, 5, 10)).toBe(true);
    expect(canAffordLimitBreak(0, 10, 10)).toBe(true);
    expect(canAffordLimitBreak(5, 4, 10)).toBe(false);
    expect(canAffordLimitBreak(5, 0, 10)).toBe(false);
    expect(canAffordLimitBreak(0, 0, 10)).toBe(false);
    expect(canAffordLimitBreak(15, 0, 15)).toBe(true);
    expect(canAffordLimitBreak(14, 0, 15)).toBe(false);
  });

  it('spendLimitBreakResources: 指定内訳で消費する', () => {
    const combinedBase = {
      ...createInitialInventory(),
      limitBreakUniversal: 7,
      limitBreakShards: { attack: 5, ice: 12 },
    };
    expect(
      spendLimitBreakResources(
        combinedBase,
        'attack',
        { attrSpend: 5, universalSpend: 5 },
        10,
      ),
    ).toEqual({
      talisman: 0,
      limitBreakUniversal: 2,
      limitBreakShards: { ice: 12 },
    });
    expect(
      spendLimitBreakResources(
        combinedBase,
        'attack',
        { attrSpend: 3, universalSpend: 7 },
        10,
      ),
    ).toEqual({
      talisman: 0,
      limitBreakUniversal: 0,
      limitBreakShards: { attack: 2, ice: 12 },
    });

    const attrOnlyBase = {
      ...createInitialInventory(),
      limitBreakUniversal: 2,
      limitBreakShards: { ice: 12 },
    };
    expect(
      spendLimitBreakResources(
        attrOnlyBase,
        'ice',
        { attrSpend: 10, universalSpend: 0 },
        10,
      ),
    ).toEqual({
      talisman: 0,
      limitBreakUniversal: 2,
      limitBreakShards: { ice: 2 },
    });

    const universalOnlyBase = {
      ...createInitialInventory(),
      limitBreakUniversal: 12,
      limitBreakShards: { attack: 5, ice: 12 },
    };
    expect(
      spendLimitBreakResources(
        universalOnlyBase,
        'attack',
        { attrSpend: 0, universalSpend: 10 },
        10,
      ),
    ).toEqual({
      talisman: 0,
      limitBreakUniversal: 2,
      limitBreakShards: { attack: 5, ice: 12 },
    });

    expect(
      spendLimitBreakResources(
        combinedBase,
        'attack',
        { attrSpend: 5, universalSpend: 4 },
        10,
      ),
    ).toBeNull();
  });

  it('fillAllLimitBreakShards: 汎用と全属性を指定数に揃える', () => {
    const filled = fillAllLimitBreakShards(createInitialInventory(), 10);
    expect(filled.limitBreakUniversal).toBe(10);
    expect(filled.limitBreakShards.attack).toBe(10);
    expect(filled.limitBreakShards.ninja).toBe(10);
    expect(Object.keys(filled.limitBreakShards)).toHaveLength(10);
  });

  it('属性かけらと汎用かけらを個別に設定できる', () => {
    const withAttributes = setAllAttributeLimitBreakShards(
      createInitialInventory(),
      30,
    );
    expect(withAttributes.limitBreakUniversal).toBe(0);
    expect(withAttributes.limitBreakShards.attack).toBe(30);

    const withUniversal = setUniversalLimitBreakShards(withAttributes, 7);
    expect(withUniversal.limitBreakUniversal).toBe(7);
    expect(withUniversal.limitBreakShards.attack).toBe(30);
    expect(getUniformAttributeShardsCount(withUniversal)).toBe(30);

    const withTalisman = setTalismanCount(withUniversal, 3);
    expect(withTalisman.talisman).toBe(3);
    expect(withTalisman.limitBreakUniversal).toBe(7);
  });
});
