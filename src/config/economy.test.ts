import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import {
  COLOR_DIVERSITY_MAX_MULTIPLIER,
  GRAVEYARD_SQRT_MULTIPLIER,
  LEVEL_UP_PIXELS_PER_LEVEL,
  CARD_DELETE_PIXEL_REFUND_RATE,
  PIXELS_PER_SURVIVOR,
  calcCardDeleteRefundPixels,
  calcColorDiversityMultiplier,
  calcGraveyardPixelReward,
  calcLevelUpPixels,
  calcLostSelectionWeight,
  calcSurvivorPixels,
  calcVictoryBattlePixels,
  countBattleSurvivors,
  pickWeightedLostCard,
} from './economy';

function makeCard(
  pixels: (string | null)[][],
  overrides: Partial<Card> = {},
): Card {
  return {
    id: 'test',
    name: 'Test',
    pixels,
    canvasSize: pixels.length,
    attribute: 'attack',
    bp: 10,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('economy constants', () => {
  it('uses agreed balance values', () => {
    expect(LEVEL_UP_PIXELS_PER_LEVEL).toBe(100);
    expect(PIXELS_PER_SURVIVOR).toBe(10);
    expect(GRAVEYARD_SQRT_MULTIPLIER).toBe(1);
  });
});

describe('calcLevelUpPixels', () => {
  it('returns Lv × 100', () => {
    expect(calcLevelUpPixels(5)).toBe(500);
    expect(calcLevelUpPixels(20)).toBe(2000);
  });
});

describe('calcColorDiversityMultiplier', () => {
  it('starts at 1.0 for one color', () => {
    expect(calcColorDiversityMultiplier(1)).toBe(1);
  });

  it('caps at 1.3', () => {
    expect(calcColorDiversityMultiplier(10)).toBe(COLOR_DIVERSITY_MAX_MULTIPLIER);
  });
});

describe('calcSurvivorPixels', () => {
  it('multiplies survivor count by 10', () => {
    expect(calcSurvivorPixels(3)).toBe(30);
    expect(calcSurvivorPixels(5)).toBe(50);
  });
});

describe('calcGraveyardPixelReward', () => {
  it('uses sqrt painted × color multiplier', () => {
    const filled = Array.from({ length: 16 }, () =>
      Array.from({ length: 16 }, () => '#ff0000'),
    );
    expect(calcGraveyardPixelReward(makeCard(filled))).toBe(16);
  });

  it('returns 0 for empty art', () => {
    const empty = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => null),
    );
    expect(calcGraveyardPixelReward(makeCard(empty))).toBe(0);
  });
});

describe('calcVictoryBattlePixels', () => {
  it('combines survivor and graveyard rewards', () => {
    const card = makeCard([
      ['#ff0000', '#00ff00'],
      ['#0000ff', null],
    ]);
    const result = calcVictoryBattlePixels(
      ['a', 'b', 'c', 'd', 'e'],
      ['a', 'b'],
      card,
    );
    expect(countBattleSurvivors(['a', 'b', 'c', 'd', 'e'], ['a', 'b'])).toBe(3);
    expect(result.survivorPixels).toBe(30);
    expect(result.graveyardPixels).toBe(1);
    expect(result.total).toBe(31);
  });
});

describe('lost economy helpers', () => {
  it('weights selection by px, rarity, and stars', () => {
    const base = makeCard([[ '#ff0000', null ], [ null, null ]]);
    const heavy = makeCard([[ '#ff0000', '#00ff00' ], [ '#0000ff', '#ffff00' ]], {
      rarity: 'SR',
      stars: 3,
    });

    expect(calcLostSelectionWeight(base)).toBeGreaterThan(0);
    expect(calcLostSelectionWeight(heavy)).toBeGreaterThan(calcLostSelectionWeight(base));
  });

  it('uses at least 1 px in lost weight even for empty art', () => {
    const empty = makeCard(Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => null)));
    expect(calcLostSelectionWeight(empty)).toBe(1);
  });

  it('picks weighted card deterministically with fixed random', () => {
    const cards = [
      makeCard([[ '#ff0000' ]], { id: 'a' }),
      makeCard([[ '#ff0000', '#00ff00' ]], { id: 'b', rarity: 'SR', stars: 3 }),
    ];
    expect(pickWeightedLostCard(cards, () => 0).id).toBe('a');
    expect(pickWeightedLostCard(cards, () => 0.999).id).toBe('b');
  });

  it('returns refund pixels as ceil of painted cells × rate', () => {
    const card = makeCard([
      ['#ff0000', '#00ff00'],
      ['#0000ff', null],
    ]);
    expect(CARD_DELETE_PIXEL_REFUND_RATE).toBe(0.01);
    expect(calcCardDeleteRefundPixels(card)).toBe(
      Math.ceil(3 * CARD_DELETE_PIXEL_REFUND_RATE),
    );
  });
});
