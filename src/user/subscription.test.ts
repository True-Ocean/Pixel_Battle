import { describe, expect, it } from 'vitest';
import {
  devSetSubscriptionPlan,
  formatSubscriptionPlanLabel,
  getActiveSubscriptionPlan,
  hasPremiumAlwaysDouble,
  isSubscriptionActive,
  skipsBattleStartAd,
  skipsCreativeAd,
} from './subscription';

const NOW = Date.parse('2026-06-20T12:00:00+09:00');

describe('subscription benefits', () => {
  it('treats expired plans as inactive', () => {
    const subscription = {
      plan: 'premium' as const,
      expiresAt: '2026-06-19T12:00:00+09:00',
    };
    expect(isSubscriptionActive(subscription, NOW)).toBe(false);
    expect(getActiveSubscriptionPlan(subscription, NOW)).toBe('none');
  });

  it('light skips battle and creative ads but not always double', () => {
    const subscription = devSetSubscriptionPlan('light', NOW);
    expect(skipsBattleStartAd(subscription, NOW)).toBe(true);
    expect(skipsCreativeAd(subscription, NOW)).toBe(true);
    expect(hasPremiumAlwaysDouble(subscription, NOW)).toBe(false);
  });

  it('premium skips battle/creative ads and enables always double', () => {
    const subscription = devSetSubscriptionPlan('premium', NOW);
    expect(skipsBattleStartAd(subscription, NOW)).toBe(true);
    expect(skipsCreativeAd(subscription, NOW)).toBe(true);
    expect(hasPremiumAlwaysDouble(subscription, NOW)).toBe(true);
  });

  it('none plan has no benefits', () => {
    const subscription = { plan: 'none' as const };
    expect(skipsBattleStartAd(subscription, NOW)).toBe(false);
    expect(skipsCreativeAd(subscription, NOW)).toBe(false);
    expect(hasPremiumAlwaysDouble(subscription, NOW)).toBe(false);
    expect(formatSubscriptionPlanLabel(subscription, NOW)).toBe('未加入');
  });

  it('formats active plan label with expiry', () => {
    const subscription = devSetSubscriptionPlan('light', NOW);
    expect(formatSubscriptionPlanLabel(subscription, NOW)).toMatch(
      /^ライトプラン（.+まで）$/,
    );
  });
});
