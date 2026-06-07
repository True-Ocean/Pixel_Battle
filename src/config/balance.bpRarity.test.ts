import { describe, expect, it } from 'vitest';
import { applyRarityToBp } from '../config/balance';

describe('applyRarityToBp', () => {
  it('raises BP for R and SR above the same base N value', () => {
    expect(applyRarityToBp(76, 'defense', 'N')).toBe(76);
    expect(applyRarityToBp(76, 'defense', 'R')).toBe(82);
    expect(applyRarityToBp(76, 'defense', 'SR')).toBe(85);
  });

  it('enforces SR attack minimum so high rarity feels stronger', () => {
    expect(applyRarityToBp(76, 'attack', 'SR')).toBe(90);
    expect(applyRarityToBp(87, 'attack', 'SR')).toBe(100);
  });

  it('clamps to attribute max', () => {
    expect(applyRarityToBp(100, 'attack', 'SR')).toBe(100);
    expect(applyRarityToBp(85, 'defense', 'SR')).toBe(85);
  });
});
