import { countPaintedCells, countUniqueColors } from '../card/paintStats';
import type { Card, CardRarity, CardStars } from '../types';

/** カード削除時のピクセル返還率（塗り数に対する割合） */
export const CARD_DELETE_PIXEL_REFUND_RATE = 0.01;

/** ロスト抽選: レア度倍率 */
export const LOST_WEIGHT_RARITY: Record<Extract<CardRarity, 'N' | 'R' | 'SR'>, number> = {
  N: 1.0,
  R: 1.3,
  SR: 1.6,
};

/** ロスト抽選: ★倍率 */
export const LOST_WEIGHT_STARS: Record<CardStars, number> = {
  0: 1.0,
  1: 1.15,
  2: 1.3,
  3: 1.5,
};

/** レベルアップ1回あたりの無償ピクセル（固定） */
export const LEVEL_UP_PIXEL_REWARD = 500;

/** 完全復活に必要な無償ピクセル（一律） */
export const FULL_REVIVE_COST = 4000;

/** 降格復活に必要な無償ピクセル（一律） */
export const DOWNGRADE_REVIVE_COST = 2000;

/** 勝利時・生存1枚あたりのピクセル */
export const PIXELS_PER_SURVIVOR = 10;

/** 戦利品 = floor(√塗り) × K × 色係数 */
export const GRAVEYARD_SQRT_MULTIPLIER = 1;

/** 使用色が1色増えるごとの係数加算（1色=1.0） */
export const COLOR_DIVERSITY_BONUS_PER_EXTRA_COLOR = 0.05;

/** 色係数の上限 */
export const COLOR_DIVERSITY_MAX_MULTIPLIER = 1.3;

export function calcLevelUpPixels(_level?: number): number {
  return LEVEL_UP_PIXEL_REWARD;
}

export function calcFullReviveCost(): number {
  return FULL_REVIVE_COST;
}

export function calcDowngradeReviveCost(): number {
  return DOWNGRADE_REVIVE_COST;
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

function lostWeightRarityMultiplier(rarity: CardRarity): number {
  if (rarity === 'R' || rarity === 'SR') return LOST_WEIGHT_RARITY[rarity];
  if (rarity === 'N') return LOST_WEIGHT_RARITY.N;
  return LOST_WEIGHT_RARITY.SR;
}

/** CPU 敗北時ロスト抽選の重み（px × レア × ★） */
export function calcLostSelectionWeight(card: Card): number {
  const pxWeight = Math.max(1, calcGraveyardPixelReward(card));
  return (
    pxWeight *
    lostWeightRarityMultiplier(card.rarity) *
    LOST_WEIGHT_STARS[card.stars]
  );
}

export function pickWeightedLostCard(
  cards: readonly Card[],
  random: () => number = Math.random,
): Card {
  if (cards.length === 0) {
    throw new Error('pickWeightedLostCard: empty candidates');
  }
  if (cards.length === 1) return cards[0]!;
  const weights = cards.map(calcLostSelectionWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let i = 0; i < cards.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return cards[i]!;
  }
  return cards[cards.length - 1]!;
}

/** カード削除時の無償ピクセル返還 */
export function calcCardDeleteRefundPixels(card: Card): number {
  const painted = countPaintedCells(card.pixels);
  return Math.ceil(painted * CARD_DELETE_PIXEL_REFUND_RATE);
}
