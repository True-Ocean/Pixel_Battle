import { describe, expect, it } from 'vitest';
import {
  USER_INITIAL_EXP,
  USER_INITIAL_LEVEL,
} from '../config/balance';
import {
  createInitialProfile,
  grantBattleExp,
  isProfileComplete,
  normalizeUserProfile,
  validateUsername,
} from './profile';
import { totalExpForLevel } from './level';

describe('validateUsername', () => {
  it('rejects empty names', () => {
    expect(validateUsername('')).toBe('ユーザー名を入力してください');
    expect(validateUsername('   ')).toBe('ユーザー名を入力してください');
  });
});

describe('createInitialProfile', () => {
  it('starts at level 1 with 0 exp', () => {
    const profile = createInitialProfile('ピクセル太郎');
    expect(profile).toEqual({
      username: 'ピクセル太郎',
      level: USER_INITIAL_LEVEL,
      exp: USER_INITIAL_EXP,
    });
  });
});

describe('normalizeUserProfile', () => {
  it('derives level from cumulative exp', () => {
    expect(
      normalizeUserProfile({
        username: 'a',
        exp: totalExpForLevel(3),
      }),
    ).toEqual({
      username: 'a',
      level: 3,
      exp: totalExpForLevel(3),
    });
  });
});

describe('isProfileComplete', () => {
  it('requires a username', () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(
      isProfileComplete({
        username: 'test',
        level: 1,
        exp: 0,
      }),
    ).toBe(true);
  });
});

describe('grantBattleExp', () => {
  const base = {
    username: 'test',
    level: 1,
    exp: 5,
  };

  it('adds level plus defeated count', () => {
    expect(
      grantBattleExp(base, {
        cpuDefeatedCount: 3,
        winner: 'cpu',
        playerDeckPower: 400,
        opponentDeckPower: 400,
      }),
    ).toEqual({
      ...base,
      exp: 5 + 1 + 3,
      level: 1,
    });
  });

  it('adds upset bonus when beating a stronger opponent', () => {
    const result = grantBattleExp(base, {
      cpuDefeatedCount: 0,
      winner: 'player',
      playerDeckPower: 400,
      opponentDeckPower: 500,
    });
    expect(result.exp).toBeGreaterThan(base.exp + 1);
  });
});
