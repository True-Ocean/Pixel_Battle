import { describe, expect, it } from 'vitest';
import {
  computeCardPower,
  computeDeckPower,
  getCardPowerWeight,
} from './power';

describe('getCardPowerWeight', () => {
  it('uses rarity for attack', () => {
    expect(getCardPowerWeight('attack', 'N')).toBe(1);
    expect(getCardPowerWeight('attack', 'R')).toBe(7 / 5);
    expect(getCardPowerWeight('attack', 'SR')).toBe(9 / 5);
    expect(getCardPowerWeight('attack', 'UR')).toBe(9 / 5);
  });

  it('uses attribute weights for non-attack', () => {
    expect(getCardPowerWeight('defense')).toBe(5 / 3);
    expect(getCardPowerWeight('dual')).toBe(5 / 4);
    expect(getCardPowerWeight('poison')).toBe(7 / 5);
    expect(getCardPowerWeight('power')).toBe(1);
  });
});

describe('computeCardPower', () => {
  it('uses BP × weight for N attack', () => {
    expect(computeCardPower({ attribute: 'attack', bp: 85, rarity: 'N' })).toBe(
      85,
    );
  });

  it('applies SR attack pierce weight', () => {
    expect(
      computeCardPower({ attribute: 'attack', bp: 575, rarity: 'SR' }),
    ).toBe(1035);
  });

  it('applies defense weight without flatBonus', () => {
    expect(computeCardPower({ attribute: 'defense', bp: 475 })).toBe(792);
  });
});

describe('computeDeckPower', () => {
  it('sums card power with weights', () => {
    const deck = [
      { attribute: 'attack' as const, bp: 80, rarity: 'N' as const },
      { attribute: 'defense' as const, bp: 70 },
    ];
    expect(computeDeckPower(deck)).toBe(80 + Math.round(70 * (5 / 3)));
  });
});
