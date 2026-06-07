import { describe, expect, it } from 'vitest';
import {
  EXP_UPSET_BONUS_MAX,
  EXP_UPSET_RATIO_TIER1,
  EXP_UPSET_RATIO_TIER2,
  EXP_UPSET_RATIO_TIER3,
} from '../config/balance';
import {
  calcBattleExpGain,
  calcUpsetExpBonus,
  expToNextLevel,
  getLevelProgress,
  levelFromTotalExp,
  totalExpForLevel,
} from './level';

describe('expToNextLevel', () => {
  it('increases with level', () => {
    expect(expToNextLevel(1)).toBe(11);
    expect(expToNextLevel(2)).toBe(12);
  });
});

describe('totalExpForLevel', () => {
  it('starts at 0 for level 1', () => {
    expect(totalExpForLevel(1)).toBe(0);
  });

  it('matches sum of expToNext spans', () => {
    expect(totalExpForLevel(2)).toBe(expToNextLevel(1));
    expect(totalExpForLevel(3)).toBe(
      expToNextLevel(1) + expToNextLevel(2),
    );
  });
});

describe('levelFromTotalExp', () => {
  it('derives level from cumulative exp', () => {
    expect(levelFromTotalExp(0)).toBe(1);
    expect(levelFromTotalExp(totalExpForLevel(2) - 1)).toBe(1);
    expect(levelFromTotalExp(totalExpForLevel(2))).toBe(2);
  });
});

describe('calcBattleExpGain', () => {
  it('adds level, kills, and optional upset bonus', () => {
    expect(calcBattleExpGain(3, 2)).toBe(5);
    expect(calcBattleExpGain(3, 2, 2)).toBe(7);
  });
});

describe('calcUpsetExpBonus', () => {
  it('returns 0 unless the player wins against a stronger deck', () => {
    expect(calcUpsetExpBonus('cpu', 400, 450)).toBe(0);
    expect(calcUpsetExpBonus('player', 450, 400)).toBe(0);
    expect(calcUpsetExpBonus('player', 0, 100)).toBe(0);
  });

  it('uses ratio tiers with a cap', () => {
    const playerPower = 400;
    const tier1 = Math.ceil(playerPower * EXP_UPSET_RATIO_TIER1);
    const tier2 = Math.ceil(playerPower * EXP_UPSET_RATIO_TIER2);
    const tier3 = Math.ceil(playerPower * EXP_UPSET_RATIO_TIER3);

    expect(calcUpsetExpBonus('player', playerPower, tier1)).toBe(1);
    expect(calcUpsetExpBonus('player', playerPower, tier2)).toBe(2);
    expect(calcUpsetExpBonus('player', playerPower, tier3)).toBe(
      EXP_UPSET_BONUS_MAX,
    );
  });
});

describe('getLevelProgress', () => {
  it('returns partial progress within a level', () => {
    const span = expToNextLevel(1);
    const { progress, isMaxLevel } = getLevelProgress({
      username: 'a',
      level: 1,
      exp: span / 2,
      battleWins: 0,
      battleLosses: 0,
    });
    expect(isMaxLevel).toBe(false);
    expect(progress).toBeCloseTo(0.5, 5);
  });
});
