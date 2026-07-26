import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTE_MELT_FEE_PX_PER_UNIVERSAL,
  ATTRIBUTE_TO_UNIVERSAL_SHARD_RATIO,
  UNIVERSAL_TO_ATTRIBUTE_SHARD_RATIO,
} from '../config/economy';
import { createInitialEconomy } from './economy';
import { createInitialInventory } from './inventory';
import {
  calcAttributeMeltOutcome,
  calcUniversalCostForAttributeShards,
  exchangeUniversalToAttribute,
  meltAttributeToUniversal,
} from './shardExchange';

describe('shardExchange', () => {
  it('calculates 2:1 and 1:2 rates with melt fee', () => {
    expect(UNIVERSAL_TO_ATTRIBUTE_SHARD_RATIO).toBe(2);
    expect(ATTRIBUTE_TO_UNIVERSAL_SHARD_RATIO).toBe(2);
    expect(ATTRIBUTE_MELT_FEE_PX_PER_UNIVERSAL).toBe(10);
    expect(calcUniversalCostForAttributeShards(20)).toBe(40);
    expect(calcAttributeMeltOutcome(20)).toEqual({
      universalGained: 40,
      pixelFee: 400,
    });
  });

  it('exchanges universal to attribute shards', () => {
    const base = {
      ...createInitialInventory(),
      limitBreakUniversal: 40,
    };
    expect(exchangeUniversalToAttribute(base, 'attack', 20)).toEqual({
      talisman: 0,
      limitBreakUniversal: 0,
      limitBreakShards: { attack: 20 },
    });
    expect(exchangeUniversalToAttribute(base, 'attack', 21)).toBeNull();
    expect(exchangeUniversalToAttribute(base, 'attack', 0)).toBeNull();
  });

  it('melts attribute to universal with px fee', () => {
    const inventory = {
      ...createInitialInventory(),
      limitBreakShards: { attack: 20 },
    };
    const economy = { ...createInitialEconomy(), freePixels: 400 };
    expect(meltAttributeToUniversal(inventory, economy, 'attack', 20)).toEqual({
      inventory: {
        talisman: 0,
        limitBreakUniversal: 40,
        limitBreakShards: {},
      },
      economy: { freePixels: 0, jewels: 0 },
    });
    expect(
      meltAttributeToUniversal(inventory, { freePixels: 399, jewels: 0 }, 'attack', 20),
    ).toBeNull();
  });

  it('round-trip restores attribute count and only spends px', () => {
    const start = {
      ...createInitialInventory(),
      limitBreakShards: { attack: 20 },
    };
    const melted = meltAttributeToUniversal(
      start,
      { freePixels: 400, jewels: 0 },
      'attack',
      20,
    );
    expect(melted).not.toBeNull();
    const restored = exchangeUniversalToAttribute(
      melted!.inventory,
      'defense',
      20,
    );
    expect(restored).toEqual({
      talisman: 0,
      limitBreakUniversal: 0,
      limitBreakShards: { defense: 20 },
    });
    expect(melted!.economy.freePixels).toBe(0);
  });
});
