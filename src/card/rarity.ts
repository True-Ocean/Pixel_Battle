import {
  CREATE_BONUS_PAINT_RATIO,
  CREATE_RARITY_BONUS,
  CREATE_RARITY_DEFAULT,
  RARITY_ROLL_ORDER,
} from '../config/rarity';
import { PALETTE_16 } from '../config/palette';
import type { CardRarity, PixelGrid } from '../types';
import type { ColorRatios } from './colors';
import { normalizePixelColor } from './colors';

export function countDistinctUsedColors(
  pixels: PixelGrid,
  unlockedPaletteCount: number,
): number {
  const used = new Set<string>();
  for (const row of pixels) {
    for (const cell of row) {
      const normalized = normalizePixelColor(cell, unlockedPaletteCount);
      if (normalized) used.add(normalized);
    }
  }
  return used.size;
}

/** 創作ボーナス条件: 塗り比率≥80% かつ 使用色数＝解放済み色数 */
export function meetsCreationBonus(
  ratios: ColorRatios,
  pixels: PixelGrid,
  unlockedPaletteCount: number,
): boolean {
  if (ratios.density < CREATE_BONUS_PAINT_RATIO) return false;
  const unlocked =
    unlockedPaletteCount > 0
      ? unlockedPaletteCount
      : PALETTE_16.length;
  return countDistinctUsedColors(pixels, unlockedPaletteCount) === unlocked;
}

export function rollRarity(
  ratios: ColorRatios,
  pixels: PixelGrid,
  unlockedPaletteCount: number,
  random: () => number = Math.random,
): CardRarity {
  const weights = meetsCreationBonus(ratios, pixels, unlockedPaletteCount)
    ? CREATE_RARITY_BONUS
    : CREATE_RARITY_DEFAULT;

  const roll = random();
  let cumulative = 0;
  for (const rarity of RARITY_ROLL_ORDER) {
    cumulative += weights[rarity];
    if (roll < cumulative) return rarity;
  }
  return 'N';
}
