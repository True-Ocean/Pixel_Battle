import { countPaintedCells, countUniqueColors } from '../card/paintStats';
import type { Card } from '../types';

/** レベルアップ時の無償ピクセル = Lv × N */
export const LEVEL_UP_PIXELS_PER_LEVEL = 100;

/** 勝利時・生存1枚あたりのピクセル */
export const PIXELS_PER_SURVIVOR = 10;

/** 戦利品 = floor(√塗り) × K × 色係数 */
export const GRAVEYARD_SQRT_MULTIPLIER = 1;

/** 使用色が1色増えるごとの係数加算（1色=1.0） */
export const COLOR_DIVERSITY_BONUS_PER_EXTRA_COLOR = 0.05;

/** 色係数の上限 */
export const COLOR_DIVERSITY_MAX_MULTIPLIER = 1.3;

export function calcLevelUpPixels(level: number): number {
  const L = Math.max(1, Math.floor(level));
  return L * LEVEL_UP_PIXELS_PER_LEVEL;
}

export function calcColorDiversityMultiplier(uniqueColors: number): number {
  const count = Math.max(1, Math.floor(uniqueColors));
  const raw = 1 + COLOR_DIVERSITY_BONUS_PER_EXTRA_COLOR * (count - 1);
  return Math.min(COLOR_DIVERSITY_MAX_MULTIPLIER, raw);
}

export function countBattleSurvivors(
  playerCardIds: string[],
  defeatedPlayerCardIds: string[],
): number {
  return Math.max(0, playerCardIds.length - defeatedPlayerCardIds.length);
}

export function calcSurvivorPixels(survivorCount: number): number {
  return Math.max(0, Math.floor(survivorCount)) * PIXELS_PER_SURVIVOR;
}

export function calcGraveyardPixelReward(card: Card): number {
  const painted = countPaintedCells(card.pixels);
  if (painted <= 0) return 0;
  const colorMult = calcColorDiversityMultiplier(countUniqueColors(card.pixels));
  return Math.floor(
    Math.sqrt(painted) * GRAVEYARD_SQRT_MULTIPLIER * colorMult,
  );
}

export interface VictoryPixelBreakdown {
  survivorCount: number;
  survivorPixels: number;
  graveyardPixels: number;
  total: number;
}

export function calcVictoryBattlePixels(
  playerCardIds: string[],
  defeatedPlayerCardIds: string[],
  graveyardCard: Card,
): VictoryPixelBreakdown {
  const survivorCount = countBattleSurvivors(
    playerCardIds,
    defeatedPlayerCardIds,
  );
  const survivorPixels = calcSurvivorPixels(survivorCount);
  const graveyardPixels = calcGraveyardPixelReward(graveyardCard);
  return {
    survivorCount,
    survivorPixels,
    graveyardPixels,
    total: survivorPixels + graveyardPixels,
  };
}
