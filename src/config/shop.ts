/** ジュエルパック ID */
export type JewelPackId =
  | 'pack200'
  | 'pack500'
  | 'pack1000'
  | 'pack2000'
  | 'pack4000';

/** 汎用かけら px パック ID */
export type UniversalShardPackId = 'shard10' | 'shard25' | 'shard55';

/** サブスクリプションプラン（none = 未加入） */
export type SubscriptionPlanId = 'none' | 'light' | 'premium';

export type ShopTabId = 'jewels' | 'items' | 'subscription';

export interface JewelPackDefinition {
  id: JewelPackId;
  priceYen: number;
  baseJewels: number;
  bonusJewels: number;
  /** 初回2倍対象（200円パックのみ） */
  firstPurchaseDouble?: boolean;
}

export interface UniversalShardPackDefinition {
  id: UniversalShardPackId;
  pixelCost: number;
  baseShards: number;
  bonusShards: number;
}

export interface SubscriptionPlanDefinition {
  id: Exclude<SubscriptionPlanId, 'none'>;
  priceYen: number;
  monthlyPixels: number;
  monthlyJewels: number;
  monthlyTalismans: number;
  label: string;
  description: string;
}

export const JEWEL_PACKS: readonly JewelPackDefinition[] = [
  {
    id: 'pack200',
    priceYen: 200,
    baseJewels: 100,
    bonusJewels: 0,
    firstPurchaseDouble: true,
  },
  { id: 'pack500', priceYen: 500, baseJewels: 250, bonusJewels: 30 },
  { id: 'pack1000', priceYen: 1000, baseJewels: 500, bonusJewels: 80 },
  { id: 'pack2000', priceYen: 2000, baseJewels: 1000, bonusJewels: 200 },
  { id: 'pack4000', priceYen: 4000, baseJewels: 2000, bonusJewels: 500 },
] as const;

export const UNIVERSAL_SHARD_PACKS: readonly UniversalShardPackDefinition[] = [
  { id: 'shard10', pixelCost: 1000, baseShards: 10, bonusShards: 0 },
  { id: 'shard25', pixelCost: 2000, baseShards: 20, bonusShards: 5 },
  { id: 'shard55', pixelCost: 4000, baseShards: 40, bonusShards: 15 },
] as const;

export const SUBSCRIPTION_PLANS: readonly SubscriptionPlanDefinition[] = [
  {
    id: 'light',
    priceYen: 500,
    monthlyPixels: 1000,
    monthlyJewels: 250,
    monthlyTalismans: 1,
    label: 'ライトプラン',
    description:
      'バトル・創作の CM 解除。勝利2倍 CM は任意のまま。毎月 1,000px・💎250・護符1枚。',
  },
  {
    id: 'premium',
    priceYen: 800,
    monthlyPixels: 2000,
    monthlyJewels: 500,
    monthlyTalismans: 2,
    label: 'プレミアムプラン',
    description:
      '全 CM 解除・常時バトル報酬2倍。毎月 2,000px・💎500・護符2枚。',
  },
] as const;

/** ライト→プレミアムのアップグレード差額（800−500） */
export const SUBSCRIPTION_UPGRADE_LIGHT_TO_PREMIUM_YEN = 300;

/** サブスク1周期（30日） */
export const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calcSubscriptionRemainingMs(
  subscription: { expiresAt?: string },
  now = Date.now(),
): number | null {
  if (subscription.expiresAt == null) return null;
  const expiresMs = Date.parse(subscription.expiresAt);
  if (!Number.isFinite(expiresMs)) return null;
  return Math.max(0, expiresMs - now);
}

/** 契約満了までの残り比率（0〜1）。`expiresAt` 未設定時は 1（満期間） */
export function calcSubscriptionRemainingRatio(
  subscription: { expiresAt?: string },
  now = Date.now(),
): number {
  if (subscription.expiresAt == null) return 1;
  const remainingMs = calcSubscriptionRemainingMs(subscription, now);
  if (remainingMs == null || remainingMs <= 0) return 0;
  return Math.min(1, remainingMs / SUBSCRIPTION_PERIOD_MS);
}

/** UI 表示用の残り日数（1日未満は1日として切り上げ） */
export function calcSubscriptionRemainingDays(
  subscription: { expiresAt?: string },
  now = Date.now(),
): number | null {
  if (subscription.expiresAt == null) {
    return Math.round(SUBSCRIPTION_PERIOD_MS / MS_PER_DAY);
  }
  const remainingMs = calcSubscriptionRemainingMs(subscription, now);
  if (remainingMs == null || remainingMs <= 0) return null;
  return Math.max(1, Math.ceil(remainingMs / MS_PER_DAY));
}

/** ライト→プレのアップグレード料金（日割り・切り上げ、最低1円） */
export function calcProratedUpgradePriceYen(ratio: number): number {
  if (ratio <= 0) return 0;
  return Math.max(
    1,
    Math.ceil(SUBSCRIPTION_UPGRADE_LIGHT_TO_PREMIUM_YEN * ratio),
  );
}

export function getSubscriptionPlanById(
  id: Exclude<SubscriptionPlanId, 'none'>,
): SubscriptionPlanDefinition {
  const plan = SUBSCRIPTION_PLANS.find((entry) => entry.id === id);
  if (!plan) throw new Error(`Unknown subscription plan: ${id}`);
  return plan;
}

/** プラン間の月次付与差分（ライト→プレアップグレード用） */
export function subscriptionMonthlyGrantDelta(
  from: Exclude<SubscriptionPlanId, 'none'>,
  to: Exclude<SubscriptionPlanId, 'none'>,
): { pixels: number; jewels: number; talismans: number } {
  const fromPlan = getSubscriptionPlanById(from);
  const toPlan = getSubscriptionPlanById(to);
  return {
    pixels: toPlan.monthlyPixels - fromPlan.monthlyPixels,
    jewels: toPlan.monthlyJewels - fromPlan.monthlyJewels,
    talismans: toPlan.monthlyTalismans - fromPlan.monthlyTalismans,
  };
}

export function getJewelPackById(id: JewelPackId): JewelPackDefinition {
  const pack = JEWEL_PACKS.find((entry) => entry.id === id);
  if (!pack) throw new Error(`Unknown jewel pack: ${id}`);
  return pack;
}

export function getUniversalShardPackById(
  id: UniversalShardPackId,
): UniversalShardPackDefinition {
  const pack = UNIVERSAL_SHARD_PACKS.find((entry) => entry.id === id);
  if (!pack) throw new Error(`Unknown shard pack: ${id}`);
  return pack;
}

export function totalJewelsInPack(pack: JewelPackDefinition): number {
  return pack.baseJewels + pack.bonusJewels;
}

export function totalShardsInPack(pack: UniversalShardPackDefinition): number {
  return pack.baseShards + pack.bonusShards;
}

export function formatJewelPackLabel(pack: JewelPackDefinition): string {
  if (pack.bonusJewels > 0) {
    return `${pack.baseJewels.toLocaleString()}個+おまけ${pack.bonusJewels.toLocaleString()}個`;
  }
  return `${pack.baseJewels.toLocaleString()}個`;
}

export function formatShardPackLabel(pack: UniversalShardPackDefinition): string {
  if (pack.bonusShards > 0) {
    return `${pack.baseShards}個+おまけ${pack.bonusShards}個`;
  }
  return `${pack.baseShards}個`;
}
