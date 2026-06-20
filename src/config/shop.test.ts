import { describe, expect, it } from 'vitest';
import {
  JEWEL_PACKS,
  SUBSCRIPTION_PLANS,
  UNIVERSAL_SHARD_PACKS,
  formatJewelPackLabel,
  formatShardPackLabel,
  totalJewelsInPack,
  totalShardsInPack,
} from './shop';

describe('shop catalog', () => {
  it('defines five jewel packs with expected totals', () => {
    expect(JEWEL_PACKS).toHaveLength(5);
    expect(totalJewelsInPack(JEWEL_PACKS[0]!)).toBe(100);
    expect(totalJewelsInPack(JEWEL_PACKS[1]!)).toBe(280);
    expect(totalJewelsInPack(JEWEL_PACKS[4]!)).toBe(2500);
  });

  it('defines three universal shard packs', () => {
    expect(UNIVERSAL_SHARD_PACKS).toHaveLength(3);
    expect(totalShardsInPack(UNIVERSAL_SHARD_PACKS[0]!)).toBe(10);
    expect(totalShardsInPack(UNIVERSAL_SHARD_PACKS[2]!)).toBe(55);
  });

  it('formats bonus labels', () => {
    expect(formatJewelPackLabel(JEWEL_PACKS[1]!)).toBe('250+30');
    expect(formatShardPackLabel(UNIVERSAL_SHARD_PACKS[1]!)).toBe('20+5');
  });

  it('defines subscription plans', () => {
    expect(SUBSCRIPTION_PLANS.map((p) => p.id)).toEqual(['light', 'premium']);
    expect(SUBSCRIPTION_PLANS[0]!.monthlyJewels).toBe(250);
    expect(SUBSCRIPTION_PLANS[1]!.monthlyTalismans).toBe(2);
  });
});
