import { describe, expect, it } from 'vitest';
import {
  applyLimitBreakToCard,
  canLimitBreakCard,
  describeLimitBreakCost,
  describeLimitBreakSpendPlan,
  formatLimitBreakStars,
  getLimitBreakAttrSpendRange,
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
    name: 'test',
    pixels: [[ '#ff0000' ]],
    canvasSize: 1,
    attribute: 'attack',
    bp: 50,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('formatLimitBreakStars', () => {
  it('★数に応じた表示', () => {
    expect(formatLimitBreakStars(0)).toBe('☆☆☆');
    expect(formatLimitBreakStars(1)).toBe('★☆☆');
    expect(formatLimitBreakStars(2)).toBe('★★☆');
    expect(formatLimitBreakStars(3)).toBe('★★★');
  });
});

describe('getLimitBreakStarColor', () => {
  it('獲得★はレア枠色、未獲得はグレー', () => {
    expect(getLimitBreakStarColor(true, 'SR')).toBe('#9a7815');
    expect(getLimitBreakStarColor(false, 'SR')).toBe('#c8ced8');
  });
});

describe('planLimitBreakShardSpend', () => {
  it('専用+汎用の合計10で消費内訳を決める', () => {
    expect(planLimitBreakShardSpend(10, 0)).toEqual({ attrSpend: 10, universalSpend: 0 });
    expect(planLimitBreakShardSpend(5, 5)).toEqual({ attrSpend: 5, universalSpend: 5 });
    expect(planLimitBreakShardSpend(0, 10)).toEqual({ attrSpend: 0, universalSpend: 10 });
    expect(planLimitBreakShardSpend(7, 5)).toEqual({ attrSpend: 7, universalSpend: 3 });
    expect(planLimitBreakShardSpend(5, 4)).toBeNull();
  });
});

describe('getLimitBreakAttrSpendRange', () => {
  it('専用かけらの選択可能範囲', () => {
    expect(getLimitBreakAttrSpendRange(10, 0)).toEqual({ min: 10, max: 10 });
    expect(getLimitBreakAttrSpendRange(5, 5)).toEqual({ min: 5, max: 5 });
    expect(getLimitBreakAttrSpendRange(7, 5)).toEqual({ min: 5, max: 7 });
    expect(getLimitBreakAttrSpendRange(5, 4)).toBeNull();
  });
});

describe('isValidLimitBreakShardSpend', () => {
  it('合計10かつ所持以内のみ有効', () => {
    expect(isValidLimitBreakShardSpend({ attrSpend: 5, universalSpend: 5 }, 5, 5)).toBe(true);
    expect(isValidLimitBreakShardSpend({ attrSpend: 3, universalSpend: 7 }, 5, 7)).toBe(true);
    expect(isValidLimitBreakShardSpend({ attrSpend: 6, universalSpend: 4 }, 5, 5)).toBe(false);
    expect(isValidLimitBreakShardSpend({ attrSpend: 5, universalSpend: 4 }, 5, 5)).toBe(false);
  });
});

describe('describeLimitBreakSpendPlan', () => {
  it('選択内訳の表示', () => {
    expect(describeLimitBreakSpendPlan('剣', { attrSpend: 3, universalSpend: 7 })).toBe(
      '剣のかけら 3 + 汎用 7',
    );
  });
});

describe('describeLimitBreakCost', () => {
  it('消費内容の表示', () => {
    expect(describeLimitBreakCost('剣', 10, 0)).toBe('剣のかけら 10');
    expect(describeLimitBreakCost('剣', 5, 5)).toBe('剣のかけら 5 + 汎用 5');
    expect(describeLimitBreakCost('剣', 0, 10)).toBe('汎用 10');
  });
});

describe('limit break rules', () => {
  it('SR★3 は上限', () => {
    const card = makeCard({ rarity: 'SR', stars: 3 });
    expect(isLimitBreakCapReached(card)).toBe(true);
    expect(canLimitBreakCard(card)).toBe(false);
  });

  it('N★0 は ★アップ', () => {
    const card = makeCard({ rarity: 'N', stars: 0 });
    expect(getLimitBreakOutcomeKind(card)).toBe('star');
    const next = applyLimitBreakToCard(card, 10);
    expect(next.stars).toBe(1);
    expect(next.rarity).toBe('N');
    expect(next.bp).toBeGreaterThanOrEqual(card.bp);
  });

  it('N★0 から SR★3 まで各段階でBP増加量が均等', () => {
    let card = makeCard({ rarity: 'N', stars: 0, bp: 100 });
    const gains: number[] = [];
    for (let step = 0; step < 11; step += 1) {
      const prev = card.bp;
      card = applyLimitBreakToCard(card, 10);
      gains.push(card.bp - prev);
    }
    expect(card.rarity).toBe('SR');
    expect(card.stars).toBe(3);
    expect(gains.every((gain) => gain === gains[0])).toBe(true);
    expect(gains[0]).toBeGreaterThanOrEqual(1);
  });

  it('N★3 はレア昇格', () => {
    const card = makeCard({ rarity: 'N', stars: 3, bp: 109 });
    expect(getLimitBreakOutcomeKind(card)).toBe('rarity');
    const next = applyLimitBreakToCard(card, 10);
    expect(next.rarity).toBe('R');
    expect(next.stars).toBe(0);
    expect(next.bp).toBeGreaterThanOrEqual(card.bp);
  });

  it('R★3 はレア昇格でBPが下がらない', () => {
    const card = makeCard({ rarity: 'R', stars: 3, bp: 118 });
    const next = applyLimitBreakToCard(card, 10);
    expect(next.rarity).toBe('SR');
    expect(next.stars).toBe(0);
    expect(next.bp).toBeGreaterThanOrEqual(card.bp);
  });

  it('ロストカードは不可', () => {
    expect(canLimitBreakCard(makeCard({ status: 'lost' }))).toBe(false);
  });
});
