import { describe, expect, it } from 'vitest';
import { compareActionOrder } from './attributePriority';

describe('compareActionOrder', () => {
  const base = {
    currentBp: 80,
    rarity: 'N' as const,
    stars: 0 as const,
  };

  it('currentBp が高い方を先にする', () => {
    expect(
      compareActionOrder(
        { ...base, currentBp: 90, attribute: 'attack' },
        { ...base, currentBp: 80, attribute: 'attack' },
      ),
    ).toBeLessThan(0);
  });

  it('同BPでは属性優先度が高い方を先にする', () => {
    expect(
      compareActionOrder(
        { ...base, attribute: 'storm' },
        { ...base, attribute: 'attack' },
      ),
    ).toBeLessThan(0);
  });

  it('同BP・同属性ではレアが高い方を先にする', () => {
    expect(
      compareActionOrder(
        { ...base, attribute: 'attack', rarity: 'SR' },
        { ...base, attribute: 'attack', rarity: 'N' },
      ),
    ).toBeLessThan(0);
  });

  it('同率時は random で決着する', () => {
    expect(
      compareActionOrder(
        { ...base, attribute: 'attack', stars: 0 },
        { ...base, attribute: 'attack', stars: 0 },
        { random: () => 0.1 },
      ),
    ).toBe(-1);
    expect(
      compareActionOrder(
        { ...base, attribute: 'attack', stars: 0 },
        { ...base, attribute: 'attack', stars: 0 },
        { random: () => 0.9 },
      ),
    ).toBe(1);
  });
});
