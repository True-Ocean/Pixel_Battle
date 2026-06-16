import { describe, expect, it } from 'vitest';
import {
  DEV_FORCE_MAX_USER_LEVEL,
  MAX_USER_LEVEL,
  USER_INITIAL_EXP,
  USER_INITIAL_LEVEL,
} from '../config/balance';
import { LEVEL_UP_PIXEL_REWARD, JEWELS_PER_LEVEL, JEWELS_BONUS_MOD4 } from '../config/economy';
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
import { createInitialEconomy } from './economy';
import { createInitialInventory } from './inventory';
import { totalExpForLevel, levelFromTotalExp } from './level';

describe('validateUsername', () => {
  it('rejects empty names', () => {
    expect(validateUsername('')).toBe('ユーザー名を入力してください');
    expect(validateUsername('   ')).toBe('ユーザー名を入力してください');
  });

  it('rejects names longer than the limit', () => {
    expect(validateUsername('12345678901')).toBe(
      'ユーザー名は 10 文字以内にしてください',
    );
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

  it('adds exp from opponent deck power on victory', () => {
    expect(
      grantBattleExp(base, {
        winner: 'player',
        opponentDeckPower: 1000,
      }),
    ).toEqual({
      ...base,
      exp: 5 + 20,
      level: levelFromTotalExp(25),
    });
  });

  it('applies defeat multiplier on loss', () => {
    const result = grantBattleExp(base, {
      winner: 'cpu',
      opponentDeckPower: 1000,
    });
    expect(result.exp).toBe(5 + 16);
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
  const economy = createInitialEconomy();
  const inventory = createInitialInventory();

  it('records battle wins, losses, and level-up pixels', () => {
    const result = recordUserBattleOutcome(base, economy, inventory, {
      winner: 'player',
      opponentDeckPower: 1000,
    });
    expect(result.user).toEqual({
      ...base,
      exp: 5 + 20,
      level: levelFromTotalExp(25),
      battleWins: 3,
      battleLosses: 1,
    });
    expect(result.levelsGained.length).toBeGreaterThan(0);
    expect(result.pixelsGranted).toBe(
      result.levelsGained.length * LEVEL_UP_PIXEL_REWARD,
    );
    expect(result.jewelsGranted).toBe(
      result.levelsGained.length * JEWELS_PER_LEVEL,
    );
    expect(result.economy.freePixels).toBe(result.pixelsGranted);
    expect(result.economy.jewels).toBe(result.jewelsGranted);
    expect(result.inventory).toEqual(inventory);
    expect(result.universalGranted).toBe(0);
  });

  it('adds jewel bonus at L≡4 levels', () => {
    const highLevelUser = {
      ...base,
      level: 8,
      exp: totalExpForLevel(8) + 1,
    };
    const result = recordUserBattleOutcome(highLevelUser, economy, inventory, {
      winner: 'player',
      opponentDeckPower: 5000,
    });
    expect(result.levelsGained).toContain(9);
    expect(result.jewelsGranted).toBeGreaterThanOrEqual(JEWELS_PER_LEVEL + JEWELS_BONUS_MOD4);
  });

  it('grants universal limit break at L20, L30, ...', () => {
    const user = {
      ...base,
      level: 19,
      exp: totalExpForLevel(19),
    };
    const result = recordUserBattleOutcome(user, economy, inventory, {
      winner: 'player',
      opponentDeckPower: 50000,
    });
    if (result.levelsGained.includes(20)) {
      expect(result.universalGranted).toBeGreaterThanOrEqual(10);
      expect(result.inventory.limitBreakUniversal).toBeGreaterThanOrEqual(10);
    }
  });

  it('increments battle losses on defeat', () => {
    expect(
      recordUserBattleOutcome(base, economy, inventory, {
        winner: 'cpu',
        opponentDeckPower: 1000,
      }).user.battleLosses,
    ).toBe(2);
  });
});
