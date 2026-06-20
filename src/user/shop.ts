import {
  getJewelPackById,
  getSubscriptionPlanById,
  getUniversalShardPackById,
  SUBSCRIPTION_PERIOD_MS,
  calcProratedMonthlyGrantDelta,
  calcProratedUpgradePriceYen,
  calcSubscriptionRemainingDays,
  calcSubscriptionRemainingRatio,
  totalJewelsInPack,
  totalShardsInPack,
  type JewelPackId,
  type SubscriptionPlanId,
  type UniversalShardPackId,
} from '../config/shop';
import { SHOP_TALISMAN_PX } from '../config/economy';
import {
  formatSubscriptionPlanLabel,
  getActiveSubscriptionPlan,
  isSubscriptionActive,
} from './subscription';
import type { ShopPurchaseState, UserEconomy, UserInventory, UserSubscription } from '../types';
import { getBattlesDayKey } from './adState';
import { addFreePixels, addJewels, spendFreePixels } from './economy';
import { addInventoryCount } from './inventory';

export function createInitialShopPurchaseState(): ShopPurchaseState {
  return {};
}

export function createInitialSubscription(): UserSubscription {
  return { plan: 'none' };
}

export function normalizeShopPurchaseState(raw: unknown): ShopPurchaseState {
  if (!raw || typeof raw !== 'object') return createInitialShopPurchaseState();
  const candidate = raw as Partial<ShopPurchaseState>;
  const shopShardPurchasesDayKey =
    typeof candidate.shopShardPurchasesDayKey === 'string' &&
    candidate.shopShardPurchasesDayKey.length > 0
      ? candidate.shopShardPurchasesDayKey
      : undefined;
  const purchases = candidate.shopShardPurchasesToday;
  const shopShardPurchasesToday =
    purchases && typeof purchases === 'object'
      ? {
          shard10: normalizePurchaseCount(purchases.shard10),
          shard25: normalizePurchaseCount(purchases.shard25),
          shard55: normalizePurchaseCount(purchases.shard55),
        }
      : undefined;

  return {
    ...(candidate.jewelPack200FirstBonusUsed === true
      ? { jewelPack200FirstBonusUsed: true }
      : {}),
    ...(shopShardPurchasesDayKey != null ? { shopShardPurchasesDayKey } : {}),
    ...(shopShardPurchasesToday != null ? { shopShardPurchasesToday } : {}),
  };
}

function normalizePurchaseCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.min(1, Math.floor(value));
}

export function normalizeUserSubscription(raw: unknown, now = Date.now()): UserSubscription {
  if (!raw || typeof raw !== 'object') return createInitialSubscription();
  const candidate = raw as Partial<UserSubscription>;
  const plan: SubscriptionPlanId =
    candidate.plan === 'light' || candidate.plan === 'premium'
      ? candidate.plan
      : 'none';
  if (plan === 'none') return { plan: 'none' };

  const expiresAt =
    typeof candidate.expiresAt === 'string' && candidate.expiresAt.length > 0
      ? candidate.expiresAt
      : undefined;
  if (expiresAt != null && Date.parse(expiresAt) <= now) {
    return { plan: 'none' };
  }

  const nextGrantAt =
    typeof candidate.nextGrantAt === 'string' && candidate.nextGrantAt.length > 0
      ? candidate.nextGrantAt
      : undefined;

  return {
    plan,
    ...(expiresAt != null ? { expiresAt } : {}),
    ...(nextGrantAt != null ? { nextGrantAt } : {}),
  };
}

function resetShardPurchasesForToday(
  state: ShopPurchaseState,
  date: Date,
): ShopPurchaseState {
  const todayKey = getBattlesDayKey(date);
  if (state.shopShardPurchasesDayKey === todayKey) return state;
  return {
    ...state,
    shopShardPurchasesDayKey: todayKey,
    shopShardPurchasesToday: { shard10: 0, shard25: 0, shard55: 0 },
  };
}

export function getUniversalShardPurchasesToday(
  state: ShopPurchaseState,
  date: Date = new Date(),
): ShopPurchaseState {
  return resetShardPurchasesForToday(state, date);
}

export function canPurchaseUniversalShardPackToday(
  state: ShopPurchaseState,
  packId: UniversalShardPackId,
  date: Date = new Date(),
): boolean {
  const normalized = resetShardPurchasesForToday(state, date);
  return (normalized.shopShardPurchasesToday?.[packId] ?? 0) < 1;
}

export function resolveJewelPackGrantAmount(
  packId: JewelPackId,
  shopPurchase: ShopPurchaseState,
): { jewels: number; consumesFirstBonus: boolean } {
  const pack = getJewelPackById(packId);
  const total = totalJewelsInPack(pack);
  if (
    pack.firstPurchaseDouble === true &&
    packId === 'pack200' &&
    shopPurchase.jewelPack200FirstBonusUsed !== true
  ) {
    return { jewels: total * 2, consumesFirstBonus: true };
  }
  return { jewels: total, consumesFirstBonus: false };
}

export interface ShopPurchaseResult {
  economy: UserEconomy;
  inventory: UserInventory;
  shopPurchase: ShopPurchaseState;
  subscription: UserSubscription;
  message: string;
}

export type SubscriptionPlanButtonState =
  | { kind: 'join'; priceYen: number; buttonLabel: string }
  | {
      kind: 'upgrade';
      priceYen: number;
      remainingDays: number;
      buttonLabel: string;
    }
  | { kind: 'active'; buttonLabel: string }
  | { kind: 'unavailable'; buttonLabel: string };

export type MockSubscribeResult =
  | { ok: true; result: ShopPurchaseResult }
  | { ok: false; message: string };

export function resolveSubscriptionPlanButtonState(
  subscription: UserSubscription,
  planId: Exclude<SubscriptionPlanId, 'none'>,
  now = Date.now(),
): SubscriptionPlanButtonState {
  const active = getActiveSubscriptionPlan(subscription, now);
  const plan = getSubscriptionPlanById(planId);

  if (active === planId) {
    return { kind: 'active', buttonLabel: '加入中' };
  }

  if (active === 'premium' && planId === 'light') {
    return { kind: 'unavailable', buttonLabel: 'プレミアム加入中' };
  }

  if (active === 'light' && planId === 'premium') {
    const ratio = calcSubscriptionRemainingRatio(subscription, now);
    const remainingDays = calcSubscriptionRemainingDays(subscription, now);
    if (ratio <= 0 || remainingDays == null) {
      return { kind: 'unavailable', buttonLabel: 'アップグレード不可' };
    }
    return {
      kind: 'upgrade',
      priceYen: calcProratedUpgradePriceYen(ratio),
      remainingDays,
      buttonLabel: 'プレミアムにアップグレード',
    };
  }

  return {
    kind: 'join',
    priceYen: plan.priceYen,
    buttonLabel: '加入する（モック）',
  };
}

export function mockPurchaseJewelPack(
  economy: UserEconomy,
  inventory: UserInventory,
  shopPurchase: ShopPurchaseState,
  subscription: UserSubscription,
  packId: JewelPackId,
): ShopPurchaseResult {
  const { jewels, consumesFirstBonus } = resolveJewelPackGrantAmount(
    packId,
    shopPurchase,
  );
  const pack = getJewelPackById(packId);
  let nextShopPurchase = shopPurchase;
  if (consumesFirstBonus) {
    nextShopPurchase = { ...nextShopPurchase, jewelPack200FirstBonusUsed: true };
  }
  return {
    economy: addJewels(economy, jewels),
    inventory,
    shopPurchase: nextShopPurchase,
    subscription,
    message: `${jewels.toLocaleString()} を獲得しました（${pack.priceYen}円・モック）`,
  };
}

export function mockPurchaseTalisman(
  economy: UserEconomy,
  inventory: UserInventory,
  shopPurchase: ShopPurchaseState,
  subscription: UserSubscription,
): ShopPurchaseResult | null {
  const spent = spendFreePixels(economy, SHOP_TALISMAN_PX);
  if (!spent) return null;
  return {
    economy: spent,
    inventory: addInventoryCount(inventory, 'talisman', 1),
    shopPurchase,
    subscription,
    message: `護符を1枚購入しました（${SHOP_TALISMAN_PX.toLocaleString()}px）`,
  };
}

export function mockPurchaseUniversalShardPack(
  economy: UserEconomy,
  inventory: UserInventory,
  shopPurchase: ShopPurchaseState,
  subscription: UserSubscription,
  packId: UniversalShardPackId,
  date: Date = new Date(),
): ShopPurchaseResult | null {
  const normalized = resetShardPurchasesForToday(shopPurchase, date);
  if (!canPurchaseUniversalShardPackToday(normalized, packId, date)) return null;

  const pack = getUniversalShardPackById(packId);
  const spent = spendFreePixels(economy, pack.pixelCost);
  if (!spent) return null;

  const shards = totalShardsInPack(pack);
  const counts = normalized.shopShardPurchasesToday ?? {
    shard10: 0,
    shard25: 0,
    shard55: 0,
  };

  return {
    economy: spent,
    inventory: addInventoryCount(inventory, 'limitBreakUniversal', shards),
    shopPurchase: {
      ...normalized,
      shopShardPurchasesToday: { ...counts, [packId]: 1 },
    },
    subscription,
    message: `汎用かけら${shards}個を購入しました（${pack.pixelCost.toLocaleString()}px）`,
  };
}

function applySubscriptionMonthlyGrant(
  economy: UserEconomy,
  inventory: UserInventory,
  planId: Exclude<SubscriptionPlanId, 'none'>,
): { economy: UserEconomy; inventory: UserInventory } {
  const plan = getSubscriptionPlanById(planId);
  let nextEconomy = addFreePixels(economy, plan.monthlyPixels);
  nextEconomy = addJewels(nextEconomy, plan.monthlyJewels);
  let nextInventory = inventory;
  if (plan.monthlyTalismans > 0) {
    nextInventory = addInventoryCount(
      nextInventory,
      'talisman',
      plan.monthlyTalismans,
    );
  }
  return { economy: nextEconomy, inventory: nextInventory };
}

function applyProratedSubscriptionGrantDelta(
  economy: UserEconomy,
  inventory: UserInventory,
  from: Exclude<SubscriptionPlanId, 'none'>,
  to: Exclude<SubscriptionPlanId, 'none'>,
  ratio: number,
): { economy: UserEconomy; inventory: UserInventory } {
  const delta = calcProratedMonthlyGrantDelta(from, to, ratio);
  let nextEconomy = economy;
  if (delta.pixels > 0) {
    nextEconomy = addFreePixels(nextEconomy, delta.pixels);
  }
  if (delta.jewels > 0) {
    nextEconomy = addJewels(nextEconomy, delta.jewels);
  }
  let nextInventory = inventory;
  if (delta.talismans > 0) {
    nextInventory = addInventoryCount(nextInventory, 'talisman', delta.talismans);
  }
  return { economy: nextEconomy, inventory: nextInventory };
}

export function mockSubscribe(
  economy: UserEconomy,
  inventory: UserInventory,
  shopPurchase: ShopPurchaseState,
  subscription: UserSubscription,
  planId: Exclude<SubscriptionPlanId, 'none'>,
  now = Date.now(),
): MockSubscribeResult {
  const active = getActiveSubscriptionPlan(subscription, now);
  const plan = getSubscriptionPlanById(planId);

  if (active === planId) {
    return { ok: false, message: 'すでにこのプランに加入しています。' };
  }

  if (active === 'premium' && planId === 'light') {
    return {
      ok: false,
      message: 'プレミアム加入中はライトプランへ変更できません。',
    };
  }

  if (active === 'light' && planId === 'premium') {
    const ratio = calcSubscriptionRemainingRatio(subscription, now);
    const remainingDays = calcSubscriptionRemainingDays(subscription, now);
    if (ratio <= 0 || remainingDays == null) {
      return {
        ok: false,
        message: '契約期間の残りがないためアップグレードできません。',
      };
    }

    const premium = getSubscriptionPlanById('premium');
    const upgradePriceYen = calcProratedUpgradePriceYen(ratio);
    const granted = applyProratedSubscriptionGrantDelta(
      economy,
      inventory,
      'light',
      'premium',
      ratio,
    );
    return {
      ok: true,
      result: {
        ...granted,
        shopPurchase,
        subscription: {
          plan: 'premium',
          expiresAt: subscription.expiresAt,
          nextGrantAt: subscription.nextGrantAt,
        },
        message:
          `${premium.label}にアップグレードしました（差額${upgradePriceYen.toLocaleString()}円・残り${remainingDays}日分・モック）。` +
          `次回更新以降は${premium.priceYen.toLocaleString()}円/月です。`,
      },
    };
  }

  const expiresAt = new Date(now + SUBSCRIPTION_PERIOD_MS).toISOString();
  const nextGrantAt = new Date(now + SUBSCRIPTION_PERIOD_MS).toISOString();
  const granted = applySubscriptionMonthlyGrant(economy, inventory, planId);

  return {
    ok: true,
    result: {
      ...granted,
      shopPurchase,
      subscription: {
        plan: planId,
        expiresAt,
        nextGrantAt,
      },
      message: `${plan.label}に加入しました（${plan.priceYen.toLocaleString()}円・モック）。月次特典を付与しました。`,
    },
  };
}

export function applyDueSubscriptionGrants(
  economy: UserEconomy,
  inventory: UserInventory,
  subscription: UserSubscription,
  now = Date.now(),
): {
  economy: UserEconomy;
  inventory: UserInventory;
  subscription: UserSubscription;
  grantsApplied: number;
} {
  if (subscription.plan === 'none') {
    return { economy, inventory, subscription, grantsApplied: 0 };
  }

  const expiresMs = subscription.expiresAt
    ? Date.parse(subscription.expiresAt)
    : NaN;
  if (Number.isFinite(expiresMs) && expiresMs <= now) {
    return {
      economy,
      inventory,
      subscription: { plan: 'none' },
      grantsApplied: 0,
    };
  }

  let nextEconomy = economy;
  let nextInventory = inventory;
  let nextSubscription = subscription;
  let grantsApplied = 0;

  while (true) {
    const nextGrantMs = nextSubscription.nextGrantAt
      ? Date.parse(nextSubscription.nextGrantAt)
      : NaN;
    if (!Number.isFinite(nextGrantMs) || nextGrantMs > now) break;
    if (nextSubscription.plan === 'none') break;

    const granted = applySubscriptionMonthlyGrant(
      nextEconomy,
      nextInventory,
      nextSubscription.plan,
    );
    nextEconomy = granted.economy;
    nextInventory = granted.inventory;
    grantsApplied += 1;
    nextSubscription = {
      ...nextSubscription,
      nextGrantAt: new Date(nextGrantMs + SUBSCRIPTION_PERIOD_MS).toISOString(),
    };
  }

  return {
    economy: nextEconomy,
    inventory: nextInventory,
    subscription: nextSubscription,
    grantsApplied,
  };
}

export function describeActiveSubscription(
  subscription: UserSubscription,
  now = Date.now(),
): string | null {
  if (!isSubscriptionActive(subscription, now)) return null;
  return formatSubscriptionPlanLabel(subscription, now);
}
