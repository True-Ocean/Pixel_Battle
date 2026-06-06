import {
  EXP_LEVEL_BASE,
  EXP_UPSET_BONUS_MAX,
  EXP_UPSET_RATIO_TIER1,
  EXP_UPSET_RATIO_TIER2,
  EXP_UPSET_RATIO_TIER3,
  MAX_USER_LEVEL,
} from '../config/balance';
import type { UserProfile } from '../types';

/** レベル L から L+1 に必要な EXP（L は現在レベル） */
export function expToNextLevel(currentLevel: number): number {
  if (currentLevel >= MAX_USER_LEVEL) return 0;
  return EXP_LEVEL_BASE + currentLevel;
}

/** レベル L 到達に必要な累計 EXP（L=1 は 0） */
export function totalExpForLevel(level: number): number {
  if (level <= 1) return 0;
  const steps = level - 1;
  return steps * EXP_LEVEL_BASE + (steps * (steps + 1)) / 2;
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
}

export function getLevelProgress(user: UserProfile): LevelProgress {
  if (isMaxUserLevel(user.level)) {
    return { progress: 1, isMaxLevel: true };
  }
  const span = expToNextLevel(user.level);
  if (span <= 0) {
    return { progress: 1, isMaxLevel: true };
  }
  const expInLevel = user.exp - totalExpForLevel(user.level);
  return {
    progress: Math.min(1, Math.max(0, expInLevel / span)),
    isMaxLevel: false,
  };
}

/** 1 戦の EXP = 現在レベル + 倒した敵カード枚数（0〜5） */
export function calcBattleExpGain(
  level: number,
  cpuDefeatedCount: number,
  upsetBonus = 0,
): number {
  const kills = Math.max(0, Math.min(5, Math.floor(cpuDefeatedCount)));
  return level + kills + Math.max(0, Math.floor(upsetBonus));
}

/** 相手デッキ戦力が高い状態で勝利したときの追加 EXP（最大 EXP_UPSET_BONUS_MAX） */
export function calcUpsetExpBonus(
  winner: 'player' | 'cpu',
  playerDeckPower: number,
  opponentDeckPower: number,
): number {
  if (winner !== 'player') return 0;
  if (playerDeckPower <= 0 || opponentDeckPower <= playerDeckPower) return 0;

  const ratio = opponentDeckPower / playerDeckPower;
  if (ratio >= EXP_UPSET_RATIO_TIER3) return EXP_UPSET_BONUS_MAX;
  if (ratio >= EXP_UPSET_RATIO_TIER2) return 2;
  if (ratio >= EXP_UPSET_RATIO_TIER1) return 1;
  return 0;
}
