import { describe, expect, it } from 'vitest';
import {
  EXP_DEFEAT_MULTIPLIER,
  EXP_RATE,
  expectedOpponentDeckPower,
} from '../config/balance';
import {
  calcBattleExpGain,
  expToNextLevel,
  getLevelProgress,
  levelFromTotalExp,
  totalExpForLevel,
} from './level';

describe('expectedOpponentDeckPower', () => {
  it('scales with level anchored at Lv21 ≈ 1000', () => {
    expect(expectedOpponentDeckPower(21)).toBe(1000);
    expect(expectedOpponentDeckPower(20)).toBe(952);
  });
});

describe('expToNextLevel', () => {
  it('requires about L wins against standard opponent at level L', () => {
    const level = 20;
    const refPower = expectedOpponentDeckPower(level);
    const need = expToNextLevel(level);
    const winGain = calcBattleExpGain(refPower, 'player');
    expect(need).toBe(Math.floor(refPower * EXP_RATE * level));
    expect(Math.round(need / winGain)).toBe(level);
  });

  it('requires at least 1 exp below max level', () => {
    expect(expToNextLevel(1)).toBeGreaterThanOrEqual(1);
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
  it('uses opponent power and win multiplier', () => {
    expect(calcBattleExpGain(1000, 'player')).toBe(20);
    expect(calcBattleExpGain(1000, 'cpu')).toBe(
      Math.floor(1000 * EXP_RATE * EXP_DEFEAT_MULTIPLIER),
    );
  });

  it('returns 0 for non-positive opponent power', () => {
    expect(calcBattleExpGain(0, 'player')).toBe(0);
  });
});

describe('getLevelProgress', () => {
  it('returns partial progress within a level', () => {
    const span = expToNextLevel(1);
    const expInLevelValue = Math.floor(span / 2);
    const { progress, isMaxLevel, expInLevel, expToNext } = getLevelProgress({
      username: 'a',
      level: 1,
      exp: expInLevelValue,
      battleWins: 0,
      battleLosses: 0,
    });
    expect(isMaxLevel).toBe(false);
    expect(progress).toBeCloseTo(expInLevelValue / span, 5);
    expect(expInLevel).toBe(expInLevelValue);
    expect(expToNext).toBe(span);
  });
});
