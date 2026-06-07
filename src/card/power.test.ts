import { describe, expect, it } from 'vitest';
import { computeCardPower, computeDeckPower } from './power';

describe('computeCardPower', () => {
  it('uses BP only for attack cards', () => {
    expect(
      computeCardPower({ attribute: 'attack', bp: 85 }),
    ).toBe(85);
  });

  it('adds flat bonus for defense cards', () => {
    expect(
      computeCardPower({ attribute: 'defense', bp: 70 }),
    ).toBe(90);
  });
});

describe('computeDeckPower', () => {
  it('sums card power', () => {
    const deck = [
      { attribute: 'attack' as const, bp: 80 },
      { attribute: 'defense' as const, bp: 70 },
    ];
    expect(computeDeckPower(deck)).toBe(80 + 90);
  });
});
