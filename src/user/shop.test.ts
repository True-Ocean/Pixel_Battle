import { describe, expect, it } from 'vitest';
import { SHOP_TALISMAN_PX } from '../config/economy';
import {
  totalJewelsInPack,
  totalShardsInPack,
  getJewelPackById,
  getUniversalShardPackById,
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
    const result = mockSubscribe(
      economy,
      inventory,
      {},
      { plan: 'none' },
      'light',
      now,
    );
    expect(result.economy.freePixels).toBe(1000);
    expect(result.economy.jewels).toBe(250);
    expect(result.inventory.talisman).toBe(1);
    expect(result.subscription.plan).toBe('light');
    expect(result.subscription.nextGrantAt).toBeTruthy();
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
