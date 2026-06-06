import {
  USER_INITIAL_EXP,
  USER_INITIAL_LEVEL,
  USERNAME_MAX_LENGTH,
} from '../config/balance';
import type { UserProfile } from '../types';
import {
  calcBattleExpGain,
  calcUpsetExpBonus,
  levelFromTotalExp,
} from './level';

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

  return { username, level, exp };
}

export interface BattleExpInput {
  cpuDefeatedCount: number;
  winner: 'player' | 'cpu';
  playerDeckPower: number;
  opponentDeckPower: number;
}

export function grantBattleExp(
  user: UserProfile,
  input: BattleExpInput,
): UserProfile {
  const upsetBonus = calcUpsetExpBonus(
    input.winner,
    input.playerDeckPower,
    input.opponentDeckPower,
  );
  const gained = calcBattleExpGain(
    user.level,
    input.cpuDefeatedCount,
    upsetBonus,
  );
  const exp = user.exp + gained;
  const level = levelFromTotalExp(exp);
  return { ...user, exp, level };
}
