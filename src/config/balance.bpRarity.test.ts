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

  it('力は攻撃の128%', () => {
    expect(getUserBaseBp(10, 'power')).toBe(128);
  });

  it('弓は攻撃の52%', () => {
    expect(getUserBaseBp(10, 'bow')).toBe(52);
  });

  it('毒は攻撃の85%', () => {
    expect(getUserBaseBp(10, 'poison')).toBe(85);
  });

  it('癒は攻撃の60%', () => {
    expect(getUserBaseBp(10, 'heal')).toBe(60);
    expect(getUserBaseBp(50, 'heal')).toBe(300);
  });

  it('氷は攻撃の88%', () => {
    expect(getUserBaseBp(10, 'ice')).toBe(88);
  });

  it('嵐は攻撃の68%', () => {
    expect(getUserBaseBp(10, 'storm')).toBe(68);
    expect(getUserBaseBp(40, 'storm')).toBe(272);
  });

  it('カードBPレンジは±15%', () => {
    const range = getCardBaseBpRange(10, 'attack');
    expect(range.min).toBe(85);
    expect(range.max).toBe(115);
  });

  it('力属性のBPレンジは±15%', () => {
    const range = getCardBaseBpRange(10, 'power');
    expect(range.min).toBe(109);
    expect(range.max).toBe(147);
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
