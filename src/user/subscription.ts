import {
  SUBSCRIPTION_PERIOD_MS,
  getSubscriptionPlanById,
} from '../config/shop';
import type { SubscriptionPlan, UserSubscription } from '../types';

export function isSubscriptionActive(
  subscription: UserSubscription,
  now = Date.now(),
): boolean {
  if (subscription.plan === 'none') return false;
  if (subscription.expiresAt != null) {
    const expiresMs = Date.parse(subscription.expiresAt);
    if (Number.isFinite(expiresMs) && expiresMs <= now) return false;
  }
  return true;
}

export function getActiveSubscriptionPlan(
  subscription: UserSubscription,
  now = Date.now(),
): SubscriptionPlan {
  if (!isSubscriptionActive(subscription, now)) return 'none';
  return subscription.plan;
}

/** ライト / プレ: CPU 戦・履歴再戦の 3回に1回 CM をスキップ */
export function skipsBattleStartAd(
  subscription: UserSubscription,
  now = Date.now(),
): boolean {
  const plan = getActiveSubscriptionPlan(subscription, now);
  return plan === 'light' || plan === 'premium';
}

/** ライト / プレ: 創作（編集入室）CM をスキップ */
export function skipsCreativeAd(
  subscription: UserSubscription,
  now = Date.now(),
): boolean {
  const plan = getActiveSubscriptionPlan(subscription, now);
  return plan === 'light' || plan === 'premium';
}

/** プレ: 勝利2倍 CM なし・常時2倍 */
export function hasPremiumAlwaysDouble(
  subscription: UserSubscription,
  now = Date.now(),
): boolean {
  return getActiveSubscriptionPlan(subscription, now) === 'premium';
}

export function formatSubscriptionPlanLabel(
  subscription: UserSubscription,
  now = Date.now(),
): string {
  const plan = getActiveSubscriptionPlan(subscription, now);
  if (plan === 'none') return '未加入';
  const def = getSubscriptionPlanById(plan);
  const expiresLabel =
    subscription.expiresAt != null
      ? new Date(subscription.expiresAt).toLocaleDateString('ja-JP')
      : null;
  if (expiresLabel != null) {
    return `${def.label}（${expiresLabel}まで）`;
  }
  return def.label;
}

export function devSetSubscriptionPlan(
  plan: SubscriptionPlan,
  now = Date.now(),
): UserSubscription {
  if (plan === 'none') return { plan: 'none' };
  const expiresAt = new Date(now + SUBSCRIPTION_PERIOD_MS).toISOString();
  return {
    plan,
    expiresAt,
    nextGrantAt: expiresAt,
  };
}
