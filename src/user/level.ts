import {
  EXP_DEFEAT_MULTIPLIER,
  EXP_RATE,
  MAX_USER_LEVEL,
  expectedOpponentDeckPower,
} from '../config/balance';
import type { UserProfile } from '../types';

/** レベル L から L+1 に必要な EXP（L は現在レベル） */
export function expToNextLevel(currentLevel: number): number {
  if (currentLevel >= MAX_USER_LEVEL) return 0;
  const level = Math.max(1, Math.floor(currentLevel));
  const raw = Math.floor(
    expectedOpponentDeckPower(level) * EXP_RATE * level,
  );
  return Math.max(1, raw);
}

/** レベル L 到達に必要な累計 EXP（L=1 は 0） */
export function totalExpForLevel(level: number): number {
  const target = Math.max(1, Math.floor(level));
  if (target <= 1) return 0;
  let total = 0;
  for (let L = 1; L < target; L++) {
    total += expToNextLevel(L);
  }
  return total;
}

export function levelFromTotalExp(totalExp: number): number {
  let level = 1;
  while (
    level < MAX_USER_LEVEL &&
    totalExp >= totalExpForLevel(level + 1)
  ) {
    level++;
  }
  return level;
}

export function isMaxUserLevel(level: number): boolean {
  return level >= MAX_USER_LEVEL;
}

export interface LevelProgress {
  progress: number;
  isMaxLevel: boolean;
  /** 現在レベル帯内の EXP（次レベルまでの分子） */
  expInLevel: number;
  /** 次レベルまでに必要な EXP（分母。上限到達時は 0） */
  expToNext: number;
}

export function getLevelProgress(user: UserProfile): LevelProgress {
  const expInLevel = user.exp - totalExpForLevel(user.level);

  if (isMaxUserLevel(user.level)) {
    return { progress: 1, isMaxLevel: true, expInLevel, expToNext: 0 };
  }
  const span = expToNextLevel(user.level);
  if (span <= 0) {
    return { progress: 1, isMaxLevel: true, expInLevel, expToNext: 0 };
  }
  return {
    progress: Math.min(1, Math.max(0, expInLevel / span)),
    isMaxLevel: false,
    expInLevel,
    expToNext: span,
  };
}

/** 1 戦の EXP = floor(相手デッキ戦力 × EXP_RATE × 勝敗係数) */
export function calcBattleExpGain(
  opponentDeckPower: number,
  winner: 'player' | 'cpu',
): number {
  const power = Math.max(0, Math.floor(opponentDeckPower));
  const mult = winner === 'player' ? 1 : EXP_DEFEAT_MULTIPLIER;
  return Math.floor(power * EXP_RATE * mult);
}
