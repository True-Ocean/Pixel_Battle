import { calcLevelUpPixels } from '../config/economy';
import {
  DEV_FORCE_MAX_USER_LEVEL,
  MAX_USER_LEVEL,
  USER_INITIAL_EXP,
  USER_INITIAL_LEVEL,
  USERNAME_MAX_LENGTH,
} from '../config/balance';
import { DEV_USER_LEVEL_OVERRIDE } from '../config/devUserLevel';
import type { UserEconomy, UserProfile } from '../types';
import { addFreePixels } from './economy';
import {
  calcBattleExpGain,
  levelFromTotalExp,
  totalExpForLevel,
} from './level';

/** 開発用: レベル・EXP を上限に揃える */
export function applyDevMaxUserLevel(user: UserProfile): UserProfile {
  if (!DEV_FORCE_MAX_USER_LEVEL) return user;
  return {
    ...user,
    level: MAX_USER_LEVEL,
    exp: totalExpForLevel(MAX_USER_LEVEL),
  };
}

function clampDevUserLevel(level: number): number {
  return Math.max(USER_INITIAL_LEVEL, Math.min(MAX_USER_LEVEL, Math.floor(level)));
}

function applyDevUserLevelAt(user: UserProfile, level: number): UserProfile {
  const clamped = clampDevUserLevel(level);
  return { ...user, level: clamped, exp: totalExpForLevel(clamped) };
}

/** 開発用: DEV_USER_LEVEL_OVERRIDE でレベル・EXP を上書き */
export function applyDevUserLevelOverride(user: UserProfile): UserProfile {
  if (!import.meta.env.DEV || DEV_USER_LEVEL_OVERRIDE == null) return user;
  return applyDevUserLevelAt(user, DEV_USER_LEVEL_OVERRIDE);
}

export interface DevUserLoadOptions {
  fileOverrideLevel: number | null;
  preferSavedLevel: boolean;
  savedFileOverrideLevel: number | null | undefined;
}

/** 開発: ファイル上書きが変わったら設定画面の優先フラグを無効化 */
export function effectiveDevPreferSavedLevel(
  preferSavedLevel: boolean,
  fileOverrideLevel: number | null,
  savedFileOverrideLevel: number | null | undefined,
): boolean {
  if (!preferSavedLevel) return false;
  if (
    fileOverrideLevel != null &&
    savedFileOverrideLevel != null &&
    fileOverrideLevel !== savedFileOverrideLevel
  ) {
    return false;
  }
  return true;
}

/** 開発用: セーブ読込時にファイル上書きと設定画面のテスト用レベルを解決 */
export function resolveDevUserProfileOnLoad(
  user: UserProfile,
  options: DevUserLoadOptions,
): UserProfile {
  const { fileOverrideLevel, preferSavedLevel, savedFileOverrideLevel } = options;
  const usePreferSaved = effectiveDevPreferSavedLevel(
    preferSavedLevel,
    fileOverrideLevel,
    savedFileOverrideLevel,
  );

  if (usePreferSaved) {
    return applyDevUserLevelAt(user, user.level);
  }
  if (import.meta.env.DEV && fileOverrideLevel != null) {
    return applyDevUserLevelAt(user, fileOverrideLevel);
  }
  return applyDevMaxUserLevel(user);
}

/** 開発用: レベル上書きがあれば優先。なければ最大レベル強制を適用 */
export function applyDevUserProfile(user: UserProfile): UserProfile {
  return resolveDevUserProfileOnLoad(user, {
    fileOverrideLevel: DEV_USER_LEVEL_OVERRIDE,
    preferSavedLevel: false,
    savedFileOverrideLevel: undefined,
  });
}

export function isProfileComplete(user: UserProfile | null): user is UserProfile {
  return user != null && user.username.trim().length > 0;
}

export function validateUsername(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 'ユーザー名を入力してください';
  }
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return `ユーザー名は ${USERNAME_MAX_LENGTH} 文字以内にしてください`;
  }
  return null;
}

export function createInitialProfile(username: string): UserProfile {
  const trimmed = username.trim();
  const error = validateUsername(trimmed);
  if (error) {
    throw new Error(error);
  }
  return {
    username: trimmed,
    level: USER_INITIAL_LEVEL,
    exp: USER_INITIAL_EXP,
    battleWins: 0,
    battleLosses: 0,
  };
}

export function normalizeUserProfile(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<UserProfile>;
  if (typeof candidate.username !== 'string') return null;
  const username = candidate.username.trim();
  if (!username) return null;

  const exp =
    typeof candidate.exp === 'number' && candidate.exp >= 0
      ? Math.floor(candidate.exp)
      : USER_INITIAL_EXP;
  const level = levelFromTotalExp(exp);
  const battleWins =
    typeof candidate.battleWins === 'number' && candidate.battleWins >= 0
      ? Math.floor(candidate.battleWins)
      : 0;
  const battleLosses =
    typeof candidate.battleLosses === 'number' && candidate.battleLosses >= 0
      ? Math.floor(candidate.battleLosses)
      : 0;

  return { username, level, exp, battleWins, battleLosses };
}

export interface BattleExpInput {
  winner: 'player' | 'cpu';
  opponentDeckPower: number;
}

export function calcBattleExpGainForUser(
  _user: UserProfile,
  input: BattleExpInput,
): number {
  return calcBattleExpGain(input.opponentDeckPower, input.winner);
}

export function grantBattleExp(
  user: UserProfile,
  input: BattleExpInput,
): UserProfile {
  const gained = calcBattleExpGainForUser(user, input);
  const exp = user.exp + gained;
  const level = levelFromTotalExp(exp);
  return { ...user, exp, level };
}

export interface BattleOutcomeRecord {
  user: UserProfile;
  economy: UserEconomy;
  /** 今回到達したレベル（例: 20→22 なら [21, 22]） */
  levelsGained: number[];
  pixelsGranted: number;
}

function levelsReached(previousLevel: number, nextLevel: number): number[] {
  const levels: number[] = [];
  for (let level = previousLevel + 1; level <= nextLevel; level++) {
    levels.push(level);
  }
  return levels;
}

export function applyLevelUpEconomyRewards(
  economy: UserEconomy,
  levelsGained: number[],
): { economy: UserEconomy; pixelsGranted: number } {
  let nextEconomy = economy;
  let pixelsGranted = 0;
  for (const level of levelsGained) {
    const amount = calcLevelUpPixels(level);
    nextEconomy = addFreePixels(nextEconomy, amount);
    pixelsGranted += amount;
  }
  return { economy: nextEconomy, pixelsGranted };
}

export function recordUserBattleOutcome(
  user: UserProfile,
  economy: UserEconomy,
  input: BattleExpInput,
): BattleOutcomeRecord {
  const previousLevel = user.level;
  const withExp = grantBattleExp(user, input);
  const levelsGained = levelsReached(previousLevel, withExp.level);
  const { economy: nextEconomy, pixelsGranted } = applyLevelUpEconomyRewards(
    economy,
    levelsGained,
  );
  return {
    user: {
      ...withExp,
      battleWins: withExp.battleWins + (input.winner === 'player' ? 1 : 0),
      battleLosses: withExp.battleLosses + (input.winner === 'cpu' ? 1 : 0),
    },
    economy: nextEconomy,
    levelsGained,
    pixelsGranted,
  };
}
