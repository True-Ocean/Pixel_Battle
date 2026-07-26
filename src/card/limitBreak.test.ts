import { describe, expect, it } from 'vitest';
import {
  applyLimitBreakToCard,
  canAffordLimitBreakUpgrade,
  canLimitBreakCard,
  describeLimitBreakCost,
  describeLimitBreakRaritySuccessTitle,
  describeLimitBreakResult,
  describeLimitBreakSpendPlan,
  formatLimitBreakStars,
  getLimitBreakOutcomeKind,
  getLimitBreakStarColor,
  isLimitBreakCapReached,
  isValidLimitBreakShardSpend,
  planLimitBreakShardSpend,
} from './limitBreak';
import type { Card } from '../types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    name: 'テスト',
    pixels: [],
    canvasSize: 16,
    attribute: 'attack',
    rarity: 'N',
    stars: 0,
    bp: 100,
    paintedCount: 10,
    createdAt: 0,
    updatedAt: 0,
    status: 'active',
    ...overrides,
  };
}

describe('formatLimitBreakStars', () => {
  it('formats stars', () => {
    expect(formatLimitBreakStars(0)).toBe('☆☆☆');
    expect(formatLimitBreakStars(1)).toBe('★☆☆');
    expect(formatLimitBreakStars(2)).toBe('★★☆');
    expect(formatLimitBreakStars(3)).toBe('★★★');
  });
});

describe('getLimitBreakStarColor', () => {
  it('returns filled and empty colors', () => {
    expect(getLimitBreakStarColor(true, 'SR')).toBe('#9a7815');
    expect(getLimitBreakStarColor(false, 'SR')).toBe('#c8ced8');
  });
});

describe('planLimitBreakShardSpend', () => {
  it('uses attribute shards only', () => {
    expect(planLimitBreakShardSpend(10, 10)).toEqual({
      attrSpend: 10,
      universalSpend: 0,
    });
    expect(planLimitBreakShardSpend(15, 10)).toEqual({
      attrSpend: 10,
      universalSpend: 0,
    });
    expect(planLimitBreakShardSpend(9, 10)).toBeNull();
    expect(planLimitBreakShardSpend(0, 10)).toBeNull();
  });
});

describe('isValidLimitBreakShardSpend', () => {
  it('requires exact attribute spend and zero universal', () => {
    expect(isValidLimitBreakShardSpend({ attrSpend: 10, universalSpend: 0 }, 10, 10)).toBe(
      true,
    );
    expect(isValidLimitBreakShardSpend({ attrSpend: 10, universalSpend: 0 }, 15, 10)).toBe(
      true,
    );
    expect(isValidLimitBreakShardSpend({ attrSpend: 9, universalSpend: 0 }, 10, 10)).toBe(
      false,
    );
    expect(
      isValidLimitBreakShardSpend(
        { attrSpend: 5, universalSpend: 0 as 0 },
        10,
        10,
      ),
    ).toBe(false);
  });
});

describe('describeLimitBreakSpendPlan', () => {
  it('describes attribute-only spend', () => {
    expect(
      describeLimitBreakSpendPlan('剣', { attrSpend: 10, universalSpend: 0 }),
    ).toBe('剣のかけら 10');
  });
});

describe('describeLimitBreakCost', () => {
  it('describes attribute-only cost', () => {
    expect(describeLimitBreakCost('剣', 10, 10)).toBe('剣のかけら 10');
    expect(describeLimitBreakCost('剣', 9, 10)).toBe('');
  });
});

describe('limit break outcomes', () => {
  it('detects cap and star/rarity outcomes', () => {
    const capped = makeCard({ rarity: 'UR', stars: 3 });
    expect(isLimitBreakCapReached(capped)).toBe(true);
    expect(canLimitBreakCard(capped)).toBe(false);

    const starCard = makeCard({ rarity: 'N', stars: 1 });
    expect(isLimitBreakCapReached(starCard)).toBe(false);
    expect(getLimitBreakOutcomeKind(starCard)).toBe('star');

    const rarityCard = makeCard({ rarity: 'N', stars: 3 });
    expect(getLimitBreakOutcomeKind(rarityCard)).toBe('rarity');
  });

  it('applies star then rarity upgrades', () => {
    let card = makeCard({ rarity: 'N', stars: 0, bp: 100 });
    card = applyLimitBreakToCard(card, 10);
    expect(card.stars).toBe(1);
    expect(card.bp).toBeGreaterThan(100);

    card = makeCard({ rarity: 'N', stars: 3, bp: 100 });
    const next = applyLimitBreakToCard(card, 10);
    expect(next.rarity).toBe('R');
    expect(next.stars).toBe(0);
  });

  it('describes results and rarity titles', () => {
    const card = makeCard({ rarity: 'N', stars: 3 });
    expect(describeLimitBreakResult(card)).toBe('N★3 → R★0');
    expect(describeLimitBreakRaritySuccessTitle(card)).toBe(
      '限界突破！NからRになりました！',
    );
  });

  it('checks affordability with attribute shards and jewels', () => {
    const rarityCard = makeCard({ rarity: 'N', stars: 3 });
    expect(canAffordLimitBreakUpgrade(rarityCard, 10, 49)).toBe(false);
    expect(canAffordLimitBreakUpgrade(rarityCard, 10, 50)).toBe(true);
    expect(canAffordLimitBreakUpgrade(rarityCard, 9, 50)).toBe(false);

    const starCard = makeCard({ rarity: 'N', stars: 0 });
    expect(canAffordLimitBreakUpgrade(starCard, 10, 0)).toBe(true);
  });

  it('blocks lost cards', () => {
    expect(canLimitBreakCard(makeCard({ status: 'lost' }))).toBe(false);
  });
});
