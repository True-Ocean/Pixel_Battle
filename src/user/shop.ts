import {
  getJewelPackById,
  getSubscriptionPlanById,
  getUniversalShardPackById,
  SUBSCRIPTION_PERIOD_MS,
  totalJewelsInPack,
  totalShardsInPack,
  type JewelPackId,
  type SubscriptionPlanId,
  type UniversalShardPackId,
} from '../config/shop';
import { SHOP_TALISMAN_PX } from '../config/economy';
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

export function mockSubscribe(
  economy: UserEconomy,
  inventory: UserInventory,
  shopPurchase: ShopPurchaseState,
  _subscription: UserSubscription,
  planId: Exclude<SubscriptionPlanId, 'none'>,
  now = Date.now(),
): ShopPurchaseResult {
  const plan = getSubscriptionPlanById(planId);
  const expiresAt = new Date(now + SUBSCRIPTION_PERIOD_MS).toISOString();
  const nextGrantAt = new Date(now + SUBSCRIPTION_PERIOD_MS).toISOString();
  const granted = applySubscriptionMonthlyGrant(economy, inventory, planId);

  return {
    ...granted,
    shopPurchase,
    subscription: {
      plan: planId,
      expiresAt,
      nextGrantAt,
    },
    message: `${plan.label}に加入しました（${plan.priceYen}円・モック）。月次特典を付与しました。`,
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
  if (subscription.plan === 'none') return null;
  const plan = getSubscriptionPlanById(subscription.plan);
  const expiresLabel =
    subscription.expiresAt != null
      ? new Date(subscription.expiresAt).toLocaleDateString('ja-JP')
      : '—';
  if (subscription.expiresAt != null && Date.parse(subscription.expiresAt) <= now) {
    return null;
  }
  return `${plan.label}（有効期限: ${expiresLabel}）`;
}
