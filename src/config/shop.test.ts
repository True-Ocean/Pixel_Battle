import { describe, expect, it } from 'vitest';
import {
  JEWEL_PACKS,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PERIOD_MS,
  SUBSCRIPTION_UPGRADE_LIGHT_TO_PREMIUM_YEN,
  UNIVERSAL_SHARD_PACKS,
  calcProratedMonthlyGrantDelta,
  calcProratedUpgradePriceYen,
  calcSubscriptionRemainingDays,
  calcSubscriptionRemainingRatio,
  formatJewelPackLabel,
  formatShardPackLabel,
  subscriptionMonthlyGrantDelta,
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
    expect(formatJewelPackLabel(JEWEL_PACKS[0]!)).toBe('100個');
    expect(formatJewelPackLabel(JEWEL_PACKS[1]!)).toBe('250個+おまけ30個');
    expect(formatShardPackLabel(UNIVERSAL_SHARD_PACKS[0]!)).toBe('10個');
    expect(formatShardPackLabel(UNIVERSAL_SHARD_PACKS[1]!)).toBe('20個+おまけ5個');
  });

  it('defines subscription plans', () => {
    expect(SUBSCRIPTION_PLANS.map((p) => p.id)).toEqual(['light', 'premium']);
    expect(SUBSCRIPTION_PLANS[0]!.monthlyJewels).toBe(250);
    expect(SUBSCRIPTION_PLANS[1]!.monthlyTalismans).toBe(2);
    expect(SUBSCRIPTION_UPGRADE_LIGHT_TO_PREMIUM_YEN).toBe(300);
    expect(subscriptionMonthlyGrantDelta('light', 'premium')).toEqual({
      pixels: 1000,
      jewels: 250,
      talismans: 1,
    });
  });

  it('prorates upgrade price and grant delta by remaining period', () => {
    const ratio = 5 / 30;
    expect(calcProratedUpgradePriceYen(ratio)).toBe(50);
    expect(calcProratedUpgradePriceYen(1)).toBe(300);
    expect(calcProratedMonthlyGrantDelta('light', 'premium', ratio)).toEqual({
      pixels: 166,
      jewels: 41,
      talismans: 0,
    });
  });

  it('calculates remaining ratio from expiresAt', () => {
    const now = Date.parse('2026-06-20T00:00:00+09:00');
    const expiresAt = new Date(now + 5 * 86_400_000).toISOString();
    expect(calcSubscriptionRemainingRatio({ expiresAt }, now)).toBeCloseTo(
      5 / 30,
      5,
    );
    expect(calcSubscriptionRemainingDays({ expiresAt }, now)).toBe(5);
    expect(
      calcSubscriptionRemainingRatio(
        { expiresAt: new Date(now + SUBSCRIPTION_PERIOD_MS).toISOString() },
        now,
      ),
    ).toBe(1);
  });
});
