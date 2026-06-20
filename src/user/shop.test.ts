import { describe, expect, it } from 'vitest';
import { SHOP_TALISMAN_PX } from '../config/economy';
import {
  totalJewelsInPack,
  totalShardsInPack,
  getJewelPackById,
  getUniversalShardPackById,
  SUBSCRIPTION_PERIOD_MS,
} from '../config/shop';
import { createInitialEconomy, createInitialInventory } from '../user';
import {
  applyDueSubscriptionGrants,
  canPurchaseUniversalShardPackToday,
  mockPurchaseJewelPack,
  mockPurchaseTalisman,
  mockPurchaseUniversalShardPack,
  mockSubscribe,
  resolveJewelPackGrantAmount,
  resolveSubscriptionPlanButtonState,
} from '../user/shop';

describe('resolveJewelPackGrantAmount', () => {
  it('doubles 200 yen pack on first purchase only', () => {
    const first = resolveJewelPackGrantAmount('pack200', {});
    expect(first.jewels).toBe(200);
    expect(first.consumesFirstBonus).toBe(true);

    const second = resolveJewelPackGrantAmount('pack200', {
      jewelPack200FirstBonusUsed: true,
    });
    expect(second.jewels).toBe(100);
    expect(second.consumesFirstBonus).toBe(false);
  });

  it('returns total jewels for other packs', () => {
    const pack = getJewelPackById('pack500');
    const result = resolveJewelPackGrantAmount('pack500', {});
    expect(result.jewels).toBe(totalJewelsInPack(pack));
  });
});

describe('mockPurchaseUniversalShardPack', () => {
  it('limits each tier to one purchase per day', () => {
    const economy = { freePixels: 10_000, jewels: 0 };
    const inventory = createInitialInventory();
    const subscription = { plan: 'none' as const };
    const date = new Date('2026-06-20T12:00:00+09:00');

    const first = mockPurchaseUniversalShardPack(
      economy,
      inventory,
      {},
      subscription,
      'shard10',
      date,
    );
    expect(first).not.toBeNull();
    expect(first!.inventory.limitBreakUniversal).toBe(
      totalShardsInPack(getUniversalShardPackById('shard10')),
    );

    const second = mockPurchaseUniversalShardPack(
      first!.economy,
      first!.inventory,
      first!.shopPurchase,
      subscription,
      'shard10',
      date,
    );
    expect(second).toBeNull();

    expect(
      canPurchaseUniversalShardPackToday(first!.shopPurchase, 'shard10', date),
    ).toBe(false);
    expect(
      canPurchaseUniversalShardPackToday(first!.shopPurchase, 'shard25', date),
    ).toBe(true);
  });
});

describe('mockPurchaseTalisman', () => {
  it('costs 1500px', () => {
    const economy = { freePixels: SHOP_TALISMAN_PX, jewels: 0 };
    const inventory = createInitialInventory();
    const result = mockPurchaseTalisman(economy, inventory, {}, { plan: 'none' });
    expect(result).not.toBeNull();
    expect(result!.economy.freePixels).toBe(0);
    expect(result!.inventory.talisman).toBe(1);
  });
});

describe('mockSubscribe', () => {
  it('grants light plan monthly rewards immediately', () => {
    const economy = createInitialEconomy();
    const inventory = createInitialInventory();
    const now = Date.parse('2026-06-20T00:00:00+09:00');
    const outcome = mockSubscribe(
      economy,
      inventory,
      {},
      { plan: 'none' },
      'light',
      now,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.economy.freePixels).toBe(1000);
    expect(outcome.result.economy.jewels).toBe(250);
    expect(outcome.result.inventory.talisman).toBe(1);
    expect(outcome.result.subscription.plan).toBe('light');
    expect(outcome.result.subscription.nextGrantAt).toBeTruthy();
  });

  it('upgrades light to premium with prorated price and grant', () => {
    const now = Date.parse('2026-06-20T00:00:00+09:00');
    const expiresAt = new Date(now + 5 * 86_400_000).toISOString();
    const nextGrantAt = new Date(now + 15 * 86_400_000).toISOString();
    const lightJoin = mockSubscribe(
      createInitialEconomy(),
      createInitialInventory(),
      {},
      { plan: 'none' },
      'light',
      now,
    );
    expect(lightJoin.ok).toBe(true);
    if (!lightJoin.ok) return;

    const upgrade = mockSubscribe(
      lightJoin.result.economy,
      lightJoin.result.inventory,
      {},
      {
        plan: 'light',
        expiresAt,
        nextGrantAt,
      },
      'premium',
      now,
    );
    expect(upgrade.ok).toBe(true);
    if (!upgrade.ok) return;
    expect(upgrade.result.subscription.plan).toBe('premium');
    expect(upgrade.result.subscription.expiresAt).toBe(expiresAt);
    expect(upgrade.result.subscription.nextGrantAt).toBe(nextGrantAt);
    expect(upgrade.result.economy.freePixels).toBe(1166);
    expect(upgrade.result.economy.jewels).toBe(291);
    expect(upgrade.result.inventory.talisman).toBe(1);
    expect(upgrade.result.message).toContain('差額50');
    expect(upgrade.result.message).toContain('残り5日分');
  });

  it('charges full upgrade delta at start of period', () => {
    const now = Date.parse('2026-06-20T00:00:00+09:00');
    const expiresAt = new Date(now + SUBSCRIPTION_PERIOD_MS).toISOString();
    const lightJoin = mockSubscribe(
      createInitialEconomy(),
      createInitialInventory(),
      {},
      { plan: 'none' },
      'light',
      now,
    );
    expect(lightJoin.ok).toBe(true);
    if (!lightJoin.ok) return;

    const upgrade = mockSubscribe(
      lightJoin.result.economy,
      lightJoin.result.inventory,
      {},
      { plan: 'light', expiresAt },
      'premium',
      now,
    );
    expect(upgrade.ok).toBe(true);
    if (!upgrade.ok) return;
    expect(upgrade.result.economy.freePixels).toBe(2000);
    expect(upgrade.result.economy.jewels).toBe(500);
    expect(upgrade.result.inventory.talisman).toBe(2);
    expect(upgrade.result.message).toContain('差額300');
  });

  it('rejects duplicate subscribe', () => {
    const now = Date.parse('2026-06-20T00:00:00+09:00');
    const subscription = {
      plan: 'light' as const,
      expiresAt: new Date(now + 86_400_000).toISOString(),
      nextGrantAt: new Date(now + 86_400_000).toISOString(),
    };
    const outcome = mockSubscribe(
      createInitialEconomy(),
      createInitialInventory(),
      {},
      subscription,
      'light',
      now,
    );
    expect(outcome.ok).toBe(false);
  });
});

describe('resolveSubscriptionPlanButtonState', () => {
  const now = Date.parse('2026-06-20T00:00:00+09:00');

  it('shows prorated upgrade for premium when on light', () => {
    const state = resolveSubscriptionPlanButtonState(
      {
        plan: 'light',
        expiresAt: new Date(now + 5 * 86_400_000).toISOString(),
      },
      'premium',
      now,
    );
    expect(state).toEqual({
      kind: 'upgrade',
      priceYen: 50,
      remainingDays: 5,
      buttonLabel: 'プレミアムにアップグレード',
    });
  });

  it('shows full upgrade price at period start', () => {
    const state = resolveSubscriptionPlanButtonState(
      {
        plan: 'light',
        expiresAt: new Date(now + SUBSCRIPTION_PERIOD_MS).toISOString(),
      },
      'premium',
      now,
    );
    expect(state).toMatchObject({
      kind: 'upgrade',
      priceYen: 300,
      remainingDays: 30,
    });
  });

  it('disables light when already subscribed', () => {
    const state = resolveSubscriptionPlanButtonState(
      {
        plan: 'light',
        expiresAt: new Date(now + 86_400_000).toISOString(),
      },
      'light',
      now,
    );
    expect(state.kind).toBe('active');
  });
});

describe('applyDueSubscriptionGrants', () => {
  it('applies grant when nextGrantAt has passed', () => {
    const now = Date.parse('2026-07-25T00:00:00+09:00');
    const result = applyDueSubscriptionGrants(
      createInitialEconomy(),
      createInitialInventory(),
      {
        plan: 'light',
        expiresAt: new Date(now + 86_400_000).toISOString(),
        nextGrantAt: new Date(now - 1_000).toISOString(),
      },
      now,
    );
    expect(result.grantsApplied).toBe(1);
    expect(result.economy.freePixels).toBe(1000);
  });
});

describe('mockPurchaseJewelPack', () => {
  it('marks first bonus as used', () => {
    const result = mockPurchaseJewelPack(
      createInitialEconomy(),
      createInitialInventory(),
      {},
      { plan: 'none' },
      'pack200',
    );
    expect(result.shopPurchase.jewelPack200FirstBonusUsed).toBe(true);
    expect(result.economy.jewels).toBe(200);
  });
});
