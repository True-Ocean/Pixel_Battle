import { describe, expect, it } from 'vitest';
import {
  applyRarityToBp,
  computeCardBaseBp,
  getCardBaseBpRange,
  getUserBaseBp,
} from './balance';

describe('user level base BP', () => {
  it('基本BPはレベル×10（攻撃）', () => {
    expect(getUserBaseBp(1, 'attack')).toBe(10);
    expect(getUserBaseBp(10, 'attack')).toBe(100);
    expect(getUserBaseBp(30, 'attack')).toBe(300);
  });

  it('防御は攻撃の85%', () => {
    expect(getUserBaseBp(10, 'defense')).toBe(85);
  });

  it('カードBPレンジは±15%', () => {
    const range = getCardBaseBpRange(10, 'attack');
    expect(range.min).toBe(85);
    expect(range.max).toBe(115);
  });
});

describe('applyRarityToBp', () => {
  const level = 10;

  it('raises BP for R and SR above the same base N value', () => {
    expect(applyRarityToBp(76, 'defense', 'N', level)).toBe(76);
    expect(applyRarityToBp(76, 'defense', 'R', level)).toBe(82);
    expect(applyRarityToBp(76, 'defense', 'SR', level)).toBe(87);
  });

  it('enforces SR attack minimum so high rarity feels stronger', () => {
    expect(applyRarityToBp(76, 'attack', 'SR', level)).toBe(98);
    expect(applyRarityToBp(87, 'attack', 'SR', level)).toBe(100);
  });

  it('clamps to level-scaled attribute max', () => {
    expect(applyRarityToBp(100, 'attack', 'SR', level)).toBe(115);
    expect(applyRarityToBp(85, 'defense', 'SR', level)).toBe(98);
  });

  it('Lv1は低いBP帯になる', () => {
    const base = computeCardBaseBp(0.5, 1, 'attack');
    expect(applyRarityToBp(base, 'attack', 'N', 1)).toBeGreaterThanOrEqual(8);
    expect(applyRarityToBp(base, 'attack', 'N', 1)).toBeLessThanOrEqual(12);
  });
});
