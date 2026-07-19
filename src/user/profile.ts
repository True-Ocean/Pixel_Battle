import {
  calcLevelUpPixels,
  calcLevelUpJewels,
  calcLevelUpTalismanGrant,
  calcLevelUpUniversalShards,
} from '../config/economy';
import {
  DEV_FORCE_MAX_USER_LEVEL,
  MAX_USER_LEVEL,
  USER_INITIAL_EXP,
  USER_INITIAL_LEVEL,
  USERNAME_MAX_LENGTH,
} from '../config/balance';
import { DEV_USER_LEVEL_OVERRIDE } from '../config/devUserLevel';
import type { PixelGrid, UserEconomy, UserInventory, UserProfile } from '../types';
import { addFreePixels, addJewels } from './economy';
import { addInventoryCount } from './inventory';
import {
  calcBattleExpGain,
  levelFromTotalExp,
  totalExpForLevel,
} from './level';
import { finalizeProfileComment } from './profileComment';

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
    cpuBattleWins: 0,
    cpuBattleLosses: 0,
    offlinePvpBattleWins: 0,
    offlinePvpBattleLosses: 0,
    onlinePvpBattleWins: 0,
    onlinePvpBattleLosses: 0,
  };
}

function normalizeAvatar(raw: unknown): UserProfile['avatar'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as { pixels?: unknown; canvasSize?: unknown };
  const { canvasSize, pixels } = candidate;
  if (
    !Number.isInteger(canvasSize) ||
    (canvasSize as number) < 16 ||
    (canvasSize as number) > 34 ||
    !Array.isArray(pixels) ||
    pixels.length !== canvasSize
  ) {
    return undefined;
  }
  const validPixels = pixels.every(
    (row) =>
      Array.isArray(row) &&
      row.length === canvasSize &&
      row.every((color) => color === null || typeof color === 'string'),
  );
  if (!validPixels) return undefined;
  return {
    canvasSize: canvasSize as number,
    pixels: pixels.map((row) => [...row]) as PixelGrid,
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
  const legacyWins =
    typeof candidate.battleWins === 'number' && candidate.battleWins >= 0
      ? Math.floor(candidate.battleWins)
      : 0;
  const legacyLosses =
    typeof candidate.battleLosses === 'number' && candidate.battleLosses >= 0
      ? Math.floor(candidate.battleLosses)
      : 0;
  /** 旧セーブはモード別が無いので合計を CPU 戦に寄せる */
  const hasModeSplit =
    typeof candidate.cpuBattleWins === 'number' ||
    typeof candidate.cpuBattleLosses === 'number' ||
    typeof candidate.offlinePvpBattleWins === 'number' ||
    typeof candidate.offlinePvpBattleLosses === 'number' ||
    typeof candidate.onlinePvpBattleWins === 'number' ||
    typeof candidate.onlinePvpBattleLosses === 'number';
  const cpuBattleWins =
    typeof candidate.cpuBattleWins === 'number' && candidate.cpuBattleWins >= 0
      ? Math.floor(candidate.cpuBattleWins)
      : hasModeSplit
        ? 0
        : legacyWins;
  const cpuBattleLosses =
    typeof candidate.cpuBattleLosses === 'number' &&
    candidate.cpuBattleLosses >= 0
      ? Math.floor(candidate.cpuBattleLosses)
      : hasModeSplit
        ? 0
        : legacyLosses;
  const offlinePvpBattleWins =
    typeof candidate.offlinePvpBattleWins === 'number' &&
    candidate.offlinePvpBattleWins >= 0
      ? Math.floor(candidate.offlinePvpBattleWins)
      : 0;
  const offlinePvpBattleLosses =
    typeof candidate.offlinePvpBattleLosses === 'number' &&
    candidate.offlinePvpBattleLosses >= 0
      ? Math.floor(candidate.offlinePvpBattleLosses)
      : 0;
  const onlinePvpBattleWins =
    typeof candidate.onlinePvpBattleWins === 'number' &&
    candidate.onlinePvpBattleWins >= 0
      ? Math.floor(candidate.onlinePvpBattleWins)
      : 0;
  const onlinePvpBattleLosses =
    typeof candidate.onlinePvpBattleLosses === 'number' &&
    candidate.onlinePvpBattleLosses >= 0
      ? Math.floor(candidate.onlinePvpBattleLosses)
      : 0;
  const battleWins =
    cpuBattleWins + offlinePvpBattleWins + onlinePvpBattleWins;
  const battleLosses =
    cpuBattleLosses + offlinePvpBattleLosses + onlinePvpBattleLosses;
  const avatar = normalizeAvatar(candidate.avatar);
  const profileComment =
    typeof candidate.profileComment === 'string'
      ? finalizeProfileComment(candidate.profileComment)
      : undefined;

  return {
    username,
    ...(profileComment ? { profileComment } : {}),
    ...(avatar ? { avatar } : {}),
    level,
    exp,
    battleWins,
    battleLosses,
    cpuBattleWins,
    cpuBattleLosses,
    offlinePvpBattleWins,
    offlinePvpBattleLosses,
    onlinePvpBattleWins,
    onlinePvpBattleLosses,
  };
}

export type BattleRecordMode = 'cpu' | 'offlinePvp' | 'onlinePvp';

export interface BattleExpInput {
  winner: 'player' | 'cpu';
  opponentDeckPower: number;
  /** 省略時は CPU 戦として記録 */
  mode?: BattleRecordMode;
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
  inventory: UserInventory;
  /** 今回到達したレベル（例: 20→22 なら [21, 22]） */
  levelsGained: number[];
  pixelsGranted: number;
  jewelsGranted: number;
  universalGranted: number;
  talismanGranted: number;
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
): { economy: UserEconomy; pixelsGranted: number; jewelsGranted: number } {
  let nextEconomy = economy;
  let pixelsGranted = 0;
  let jewelsGranted = 0;
  for (const level of levelsGained) {
    const pixelAmount = calcLevelUpPixels(level);
    const jewelAmount = calcLevelUpJewels(level);
    nextEconomy = addFreePixels(nextEconomy, pixelAmount);
    nextEconomy = addJewels(nextEconomy, jewelAmount);
    pixelsGranted += pixelAmount;
    jewelsGranted += jewelAmount;
  }
  return { economy: nextEconomy, pixelsGranted, jewelsGranted };
}

export function applyLevelUpInventoryRewards(
  inventory: UserInventory,
  levelsGained: number[],
): { inventory: UserInventory; universalGranted: number; talismanGranted: number } {
  let nextInventory = inventory;
  let universalGranted = 0;
  let talismanGranted = 0;
  for (const level of levelsGained) {
    const universalAmount = calcLevelUpUniversalShards(level);
    if (universalAmount > 0) {
      nextInventory = addInventoryCount(
        nextInventory,
        'limitBreakUniversal',
        universalAmount,
      );
      universalGranted += universalAmount;
    }
    const talismanAmount = calcLevelUpTalismanGrant(level);
    if (talismanAmount > 0) {
      nextInventory = addInventoryCount(nextInventory, 'talisman', talismanAmount);
      talismanGranted += talismanAmount;
    }
  }
  return { inventory: nextInventory, universalGranted, talismanGranted };
}

export function recordUserBattleOutcome(
  user: UserProfile,
  economy: UserEconomy,
  inventory: UserInventory,
  input: BattleExpInput,
): BattleOutcomeRecord {
  const previousLevel = user.level;
  const withExp = grantBattleExp(user, input);
  const levelsGained = levelsReached(previousLevel, withExp.level);
  const { economy: nextEconomy, pixelsGranted, jewelsGranted } =
    applyLevelUpEconomyRewards(economy, levelsGained);
  const { inventory: nextInventory, universalGranted, talismanGranted } =
    applyLevelUpInventoryRewards(inventory, levelsGained);
  const mode = input.mode ?? 'cpu';
  const winDelta = input.winner === 'player' ? 1 : 0;
  const lossDelta = input.winner === 'cpu' ? 1 : 0;
  const cpuWins = withExp.cpuBattleWins ?? 0;
  const cpuLosses = withExp.cpuBattleLosses ?? 0;
  const pvpWins = withExp.offlinePvpBattleWins ?? 0;
  const pvpLosses = withExp.offlinePvpBattleLosses ?? 0;
  const onlinePvpWins = withExp.onlinePvpBattleWins ?? 0;
  const onlinePvpLosses = withExp.onlinePvpBattleLosses ?? 0;
  return {
    user: {
      ...withExp,
      cpuBattleWins: cpuWins + (mode === 'cpu' ? winDelta : 0),
      cpuBattleLosses: cpuLosses + (mode === 'cpu' ? lossDelta : 0),
      offlinePvpBattleWins: pvpWins + (mode === 'offlinePvp' ? winDelta : 0),
      offlinePvpBattleLosses:
        pvpLosses + (mode === 'offlinePvp' ? lossDelta : 0),
      onlinePvpBattleWins:
        onlinePvpWins + (mode === 'onlinePvp' ? winDelta : 0),
      onlinePvpBattleLosses:
        onlinePvpLosses + (mode === 'onlinePvp' ? lossDelta : 0),
      battleWins:
        cpuWins +
        pvpWins +
        onlinePvpWins +
        winDelta,
      battleLosses:
        cpuLosses +
        pvpLosses +
        onlinePvpLosses +
        lossDelta,
    },
    economy: nextEconomy,
    inventory: nextInventory,
    levelsGained,
    pixelsGranted,
    jewelsGranted,
    universalGranted,
    talismanGranted,
  };
}
