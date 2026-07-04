import { describe, expect, it } from 'vitest';
import { computeDeckPower } from './card';
import { prepareHistoryOpponentDeck } from './historyRematch';
import type { Card } from './types';

function stubCard(
  id: string,
  bp: number,
  attribute: Card['attribute'] = 'attack',
): Card {
  return {
    id,
    name: id,
    pixels: [],
    canvasSize: 16,
    attribute,
    bp,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '',
  };
}

describe('prepareHistoryOpponentDeck', () => {
  it('scales opponent BP so deck power approaches player power', () => {
    const player = [
      stubCard('p1', 100),
      stubCard('p2', 100),
      stubCard('p3', 100),
      stubCard('p4', 100),
      stubCard('p5', 100),
    ];
    const opponent = [
      stubCard('o1', 400),
      stubCard('o2', 400),
      stubCard('o3', 400),
      stubCard('o4', 400),
      stubCard('o5', 400),
    ];

    const playerPower = computeDeckPower(player);
    const before = computeDeckPower(opponent);
    expect(before).toBeGreaterThan(playerPower);

    const scaled = prepareHistoryOpponentDeck(opponent, player);
    const after = computeDeckPower(scaled);

    expect(Math.abs(after - playerPower)).toBeLessThan(
      Math.abs(before - playerPower),
    );
    expect(Math.abs(after - playerPower) / playerPower).toBeLessThan(0.05);
  });

  it('preserves attributes, pixels, rarity, and relative BP order', () => {
    const player = [stubCard('p1', 200)];
    const opponent = [stubCard('weak', 50), stubCard('strong', 200)];

    const scaled = prepareHistoryOpponentDeck(opponent, player);

    expect(scaled[0].attribute).toBe(opponent[0].attribute);
    expect(scaled[0].pixels).toEqual(opponent[0].pixels);
    expect(scaled[0].rarity).toBe(opponent[0].rarity);
    expect(scaled[0].name).toBe('weak');
    expect(scaled[1].bp).toBeGreaterThan(scaled[0].bp);
  });

  it('does not mutate the source deck', () => {
    const player = [stubCard('p1', 100)];
    const opponent = [stubCard('o1', 400)];
    const originalBp = opponent[0].bp;

    prepareHistoryOpponentDeck(opponent, player);

    expect(opponent[0].bp).toBe(originalBp);
  });

  it('returns a clone unchanged when powers already match', () => {
    const player = [stubCard('p1', 120)];
    const opponent = [stubCard('o1', 120)];

    const scaled = prepareHistoryOpponentDeck(opponent, player);

    expect(computeDeckPower(scaled)).toBe(computeDeckPower(player));
    expect(scaled[0].bp).toBe(120);
    expect(scaled).not.toBe(opponent);
  });

  it('returns a clone when opponent power is zero', () => {
    const player = [stubCard('p1', 100)];
    const opponent = [stubCard('o1', 0)];

    const scaled = prepareHistoryOpponentDeck(opponent, player);

    expect(scaled[0].bp).toBe(0);
    expect(scaled).not.toBe(opponent);
  });
});
