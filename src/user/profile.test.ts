import { describe, expect, it } from 'vitest';
import {
  DEV_FORCE_MAX_USER_LEVEL,
  MAX_USER_LEVEL,
  USER_INITIAL_EXP,
  USER_INITIAL_LEVEL,
} from '../config/balance';
import {
  applyDevMaxUserLevel,
  createInitialProfile,
  effectiveDevPreferSavedLevel,
  grantBattleExp,
  isProfileComplete,
  normalizeUserProfile,
  recordUserBattleOutcome,
  resolveDevUserProfileOnLoad,
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
      battleWins: 0,
      battleLosses: 0,
    });
  });
});

describe('resolveDevUserProfileOnLoad', () => {
  const base = createInitialProfile('test');

  it('uses saved level when preferSaved is true', () => {
    const saved = { ...base, level: 10, exp: totalExpForLevel(10) };
    const result = resolveDevUserProfileOnLoad(saved, {
      fileOverrideLevel: 50,
      preferSavedLevel: true,
      savedFileOverrideLevel: 50,
    });
    expect(result.level).toBe(10);
    expect(result.exp).toBe(totalExpForLevel(10));
  });

  it('uses file override when preferSaved is false', () => {
    const result = resolveDevUserProfileOnLoad(base, {
      fileOverrideLevel: 20,
      preferSavedLevel: false,
      savedFileOverrideLevel: undefined,
    });
    expect(result.level).toBe(20);
    expect(result.exp).toBe(totalExpForLevel(20));
  });

  it('ignores preferSaved when file override changed since apply', () => {
    const saved = { ...base, level: 10, exp: totalExpForLevel(10) };
    const result = resolveDevUserProfileOnLoad(saved, {
      fileOverrideLevel: 20,
      preferSavedLevel: true,
      savedFileOverrideLevel: 50,
    });
    expect(result.level).toBe(20);
  });
});

describe('effectiveDevPreferSavedLevel', () => {
  it('returns false when file override changed', () => {
    expect(
      effectiveDevPreferSavedLevel(true, 20, 50),
    ).toBe(false);
  });

  it('returns true when file override matches snapshot', () => {
    expect(
      effectiveDevPreferSavedLevel(true, 50, 50),
    ).toBe(true);
  });
});

describe('applyDevMaxUserLevel', () => {
  it('raises level and exp to the cap when dev flag is on', () => {
    const base = createInitialProfile('test');
    const result = applyDevMaxUserLevel(base);
    if (DEV_FORCE_MAX_USER_LEVEL) {
      expect(result.level).toBe(MAX_USER_LEVEL);
      expect(result.exp).toBe(totalExpForLevel(MAX_USER_LEVEL));
    } else {
      expect(result).toEqual(base);
    }
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
      battleWins: 0,
      battleLosses: 0,
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
        battleWins: 0,
        battleLosses: 0,
      }),
    ).toBe(true);
  });
});

describe('grantBattleExp', () => {
  const base = {
    username: 'test',
    level: 1,
    exp: 5,
    battleWins: 0,
    battleLosses: 0,
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

describe('recordUserBattleOutcome', () => {
  const base = {
    username: 'test',
    level: 1,
    exp: 5,
    battleWins: 2,
    battleLosses: 1,
  };

  it('records battle wins and losses alongside exp', () => {
    expect(
      recordUserBattleOutcome(base, {
        cpuDefeatedCount: 2,
        winner: 'player',
        playerDeckPower: 400,
        opponentDeckPower: 400,
      }),
    ).toEqual({
      ...base,
      exp: 5 + 1 + 2,
      battleWins: 3,
      battleLosses: 1,
    });
  });

  it('increments battle losses on defeat', () => {
    expect(
      recordUserBattleOutcome(base, {
        cpuDefeatedCount: 0,
        winner: 'cpu',
        playerDeckPower: 400,
        opponentDeckPower: 400,
      }).battleLosses,
    ).toBe(2);
  });
});
