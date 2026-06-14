import { describe, expect, it } from 'vitest';
import {
  collectLevelUpRewards,
  getLevelUpRewardsAtLevel,
} from './progressionUnlocks';

describe('progressionUnlocks', () => {
  it('Lv2〜4 は無償ピクセルのみ', () => {
    expect(getLevelUpRewardsAtLevel(3).map((reward) => reward.kind)).toEqual([
      'pixels',
    ]);
  });

  it('Lv5 は色、Lv6 は属性', () => {
    expect(getLevelUpRewardsAtLevel(5).map((reward) => reward.kind)).toEqual([
      'pixels',
      'palette',
    ]);
    expect(getLevelUpRewardsAtLevel(6).map((reward) => reward.kind)).toEqual([
      'pixels',
      'attribute',
    ]);
  });

  it('Lv10 は限界突破（準備中）', () => {
    const rewards = getLevelUpRewardsAtLevel(10);
    expect(rewards.some((reward) => reward.kind === 'limit_break')).toBe(true);
    expect(
      rewards.find((reward) => reward.kind === 'limit_break')?.pending,
    ).toBe(true);
  });

  it('Lv9 は試供品（準備中）', () => {
    const rewards = getLevelUpRewardsAtLevel(9);
    expect(rewards.some((reward) => reward.kind === 'shop_sample')).toBe(true);
    expect(
      rewards.find((reward) => reward.kind === 'shop_sample')?.pending,
    ).toBe(true);
  });

  it('collectLevelUpRewards は到達レベルごとに返す', () => {
    const groups = collectLevelUpRewards(19, 21);
    expect(groups.map((group) => group.level)).toEqual([20, 21]);
    expect(groups[0]?.rewards.some((reward) => reward.kind === 'limit_break')).toBe(
      true,
    );
    expect(groups[1]?.rewards.some((reward) => reward.kind === 'attribute')).toBe(
      true,
    );
  });
});
