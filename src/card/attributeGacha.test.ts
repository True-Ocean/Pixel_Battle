import { describe, expect, it } from 'vitest';
import {
  getAttributeGachaPixelCost,
  tallyUnusedGachaShards,
} from './attributeGacha';

describe('attributeGacha', () => {
  it('resolves pixel costs', () => {
    expect(getAttributeGachaPixelCost(1)).toBe(200);
    expect(getAttributeGachaPixelCost(5)).toBe(950);
    expect(getAttributeGachaPixelCost(10)).toBe(1800);
  });

  it('tallies unused rolls as shards', () => {
    expect(
      tallyUnusedGachaShards(['attack', 'defense', 'attack', 'ice'], 1, 'power'),
    ).toEqual({ attack: 2, ice: 1, power: 1 });
    expect(
      tallyUnusedGachaShards(['attack', 'defense', 'ice'], null, 'power'),
    ).toEqual({ attack: 1, defense: 1, ice: 1 });
  });

  it('does not shard previous when picked roll matches previous', () => {
    expect(
      tallyUnusedGachaShards(['attack', 'defense'], 0, 'attack'),
    ).toEqual({ defense: 1 });
  });

  it('shards previous when adopting a different roll', () => {
    expect(
      tallyUnusedGachaShards(['ice'], 0, 'attack'),
    ).toEqual({ attack: 1 });
  });
});
