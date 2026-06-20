import { describe, expect, it } from 'vitest';
import {
  collectLevelUpRewards,
  getLevelUpRewardsAtLevel,
} from './progressionUnlocks';

describe('progressionUnlocks', () => {
  it('Lv2〜4 は px とジュエルのみ', () => {
    expect(getLevelUpRewardsAtLevel(3).map((reward) => reward.kind)).toEqual([
      'pixels',
      'jewels',
    ]);
  });

  it('Lv5 は色・Lost解禁・護符', () => {
    expect(getLevelUpRewardsAtLevel(5).map((reward) => reward.kind)).toEqual([
      'pixels',
      'jewels',
      'palette',
      'talisman',
      'lost_unlock',
      'lost_encouragement',
    ]);
    expect(getLevelUpRewardsAtLevel(6).map((reward) => reward.kind)).toEqual([
      'pixels',
      'jewels',
      'attribute',
    ]);
  });

  it('Lv10 はデッキ2解放', () => {
    const rewards = getLevelUpRewardsAtLevel(10);
    expect(rewards.some((reward) => reward.kind === 'deck_unlock')).toBe(true);
    expect(rewards.some((reward) => reward.kind === 'talisman')).toBe(false);
  });

  it('Lv9 は汎用かけら', () => {
    const rewards = getLevelUpRewardsAtLevel(9);
    expect(rewards.some((reward) => reward.kind === 'limit_break')).toBe(true);
    expect(rewards.filter((reward) => reward.kind === 'jewels').length).toBe(1);
  });

  it('collectLevelUpRewards は到達レベルごとに返す', () => {
    const groups = collectLevelUpRewards(19, 21);
    expect(groups.map((group) => group.level)).toEqual([20, 21]);
    expect(groups[0]?.rewards.some((reward) => reward.kind === 'talisman')).toBe(
      true,
    );
    expect(groups[1]?.rewards.some((reward) => reward.kind === 'attribute')).toBe(
      true,
    );
  });
});
