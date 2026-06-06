import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_POWER } from '../config/balance';
import { computeCardPower, computeDeckPower } from './power';

describe('computeCardPower', () => {
  it('uses HP only for attack cards', () => {
    expect(
      computeCardPower({ attribute: 'attack', hp: 85 }),
    ).toBe(85);
  });

  it('adds flat bonus for defense cards', () => {
    expect(
      computeCardPower({ attribute: 'defense', hp: 70 }),
    ).toBe(70 + ATTRIBUTE_POWER.defense.flatBonus);
  });
});

describe('computeDeckPower', () => {
  it('sums card power across the deck', () => {
    const deck = [
      { attribute: 'attack' as const, hp: 80 },
      { attribute: 'defense' as const, hp: 70 },
    ];
    expect(computeDeckPower(deck)).toBe(
      computeCardPower(deck[0]!) + computeCardPower(deck[1]!),
    );
  });
});
