import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import { applyCardSurvivalRecords } from './battleRecord';

function makeCard(id: string): Card {
  return {
    id,
    name: id,
    pixels: [[null]],
    attribute: 'attack',
    bp: 10,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('applyCardSurvivalRecords', () => {
  it('increments wins for survivors and losses for defeated cards', () => {
    const deck = [makeCard('a'), makeCard('b'), makeCard('c'), makeCard('d')];
    const next = applyCardSurvivalRecords(deck, ['a', 'b', 'c'], ['b']);

    expect(next[0]?.wins).toBe(1);
    expect(next[0]?.losses).toBe(0);
    expect(next[1]?.wins).toBe(0);
    expect(next[1]?.losses).toBe(1);
    expect(next[2]?.wins).toBe(1);
    expect(next[3]?.wins).toBe(0);
    expect(next[3]?.losses).toBe(0);
  });
});
