import { describe, expect, it } from 'vitest';
import {
  applyLimitBreakToCard,
  canAffordLimitBreakUpgrade,
  canLimitBreakCard,
  describeLimitBreakCost,
  describeLimitBreakRaritySuccessTitle,
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
  it('専用+汎用の合計が必要数以上なら消費内訳を決める', () => {
    expect(planLimitBreakShardSpend(10, 0, 10)).toEqual({
      attrSpend: 10,
      universalSpend: 0,
    });
    expect(planLimitBreakShardSpend(5, 5, 10)).toEqual({
      attrSpend: 5,
      universalSpend: 5,
    });
    expect(planLimitBreakShardSpend(0, 10, 10)).toEqual({
      attrSpend: 0,
      universalSpend: 10,
    });
    expect(planLimitBreakShardSpend(7, 5, 10)).toEqual({
      attrSpend: 7,
      universalSpend: 3,
    });
    expect(planLimitBreakShardSpend(5, 4, 10)).toBeNull();
  });

  it('レア度に応じた必要数で判定する', () => {
    expect(planLimitBreakShardSpend(15, 0, 15)).toEqual({
      attrSpend: 15,
      universalSpend: 0,
    });
    expect(planLimitBreakShardSpend(10, 4, 15)).toBeNull();
    expect(planLimitBreakShardSpend(12, 8, 20)).toEqual({
      attrSpend: 12,
      universalSpend: 8,
    });
  });
});

describe('getLimitBreakAttrSpendRange', () => {
  it('専用かけらの選択可能範囲', () => {
    expect(getLimitBreakAttrSpendRange(10, 0, 10)).toEqual({ min: 10, max: 10 });
    expect(getLimitBreakAttrSpendRange(5, 5, 10)).toEqual({ min: 5, max: 5 });
    expect(getLimitBreakAttrSpendRange(7, 5, 10)).toEqual({ min: 5, max: 7 });
    expect(getLimitBreakAttrSpendRange(5, 4, 10)).toBeNull();
    expect(getLimitBreakAttrSpendRange(20, 0, 20)).toEqual({ min: 20, max: 20 });
  });
});

describe('isValidLimitBreakShardSpend', () => {
  it('必要数合計かつ所持以内のみ有効', () => {
    expect(
      isValidLimitBreakShardSpend({ attrSpend: 5, universalSpend: 5 }, 5, 5, 10),
    ).toBe(true);
    expect(
      isValidLimitBreakShardSpend({ attrSpend: 3, universalSpend: 7 }, 5, 7, 10),
    ).toBe(true);
    expect(
      isValidLimitBreakShardSpend({ attrSpend: 6, universalSpend: 4 }, 5, 5, 10),
    ).toBe(false);
    expect(
      isValidLimitBreakShardSpend({ attrSpend: 5, universalSpend: 4 }, 5, 5, 10),
    ).toBe(false);
    expect(
      isValidLimitBreakShardSpend({ attrSpend: 10, universalSpend: 5 }, 15, 5, 15),
    ).toBe(true);
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
    expect(describeLimitBreakCost('剣', 10, 0, 10)).toBe('剣のかけら 10');
    expect(describeLimitBreakCost('剣', 5, 5, 10)).toBe('剣のかけら 5 + 汎用 5');
    expect(describeLimitBreakCost('剣', 0, 10, 10)).toBe('汎用 10');
    expect(describeLimitBreakCost('剣', 0, 20, 20)).toBe('汎用 20');
  });
});

describe('limit break rules', () => {
  it('UR★3 は上限', () => {
    const card = makeCard({ rarity: 'UR', stars: 3 });
    expect(isLimitBreakCapReached(card)).toBe(true);
    expect(canLimitBreakCard(card)).toBe(false);
  });

  it('SR★3 はレア昇格可能', () => {
    const card = makeCard({ rarity: 'SR', stars: 3 });
    expect(isLimitBreakCapReached(card)).toBe(false);
    expect(getLimitBreakOutcomeKind(card)).toBe('rarity');
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

  it('SR★3 は UR に昇格', () => {
    const card = makeCard({ rarity: 'SR', stars: 3, bp: 130 });
    const next = applyLimitBreakToCard(card, 10);
    expect(next.rarity).toBe('UR');
    expect(next.stars).toBe(0);
    expect(next.bp).toBeGreaterThanOrEqual(card.bp);
  });

  it('レア昇格はジュエル所持が必要', () => {
    const card = makeCard({ rarity: 'N', stars: 3 });
    expect(canAffordLimitBreakUpgrade(card, 10, 0, 9)).toBe(false);
    expect(canAffordLimitBreakUpgrade(card, 10, 0, 10)).toBe(true);
    expect(canAffordLimitBreakUpgrade(card, 5, 5, 10)).toBe(true);
  });

  it('★アップはジュエル不要', () => {
    const card = makeCard({ rarity: 'N', stars: 0 });
    expect(canAffordLimitBreakUpgrade(card, 10, 0, 0)).toBe(true);
  });

  it('レア昇格成功メッセージ', () => {
    const card = makeCard({ rarity: 'N', stars: 3 });
    expect(describeLimitBreakRaritySuccessTitle(card)).toBe(
      '限界突破！NからRになりました！',
    );
  });

  it('ロストカードは不可', () => {
    expect(canLimitBreakCard(makeCard({ status: 'lost' }))).toBe(false);
  });
});
