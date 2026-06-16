import {
  CREATE_BONUS_COLOR_SHARE_TOTAL,
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

/** 解放済み各色の使用マス数（未使用色は 0） */
export function countUnlockedColorCells(
  pixels: PixelGrid,
  unlockedPaletteCount: number,
): Map<string, number> {
  const unlocked =
    unlockedPaletteCount > 0
      ? unlockedPaletteCount
      : PALETTE_16.length;
  const counts = new Map<string, number>();
  for (let i = 0; i < unlocked; i++) {
    counts.set(PALETTE_16[i].toLowerCase(), 0);
  }
  for (const row of pixels) {
    for (const cell of row) {
      const normalized = normalizePixelColor(cell, unlockedPaletteCount);
      if (normalized == null) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * 創作ボーナス条件:
 * - 塗り100%
 * - 解放済み全色を使用
 * - 各色がキャンバスの (100-20)/N % 以上
 */
export function meetsCreationBonus(
  ratios: ColorRatios,
  pixels: PixelGrid,
  unlockedPaletteCount: number,
): boolean {
  const unlocked =
    unlockedPaletteCount > 0
      ? unlockedPaletteCount
      : PALETTE_16.length;
  const totalCells = ratios.totalCells;
  if (totalCells <= 0) return false;
  if (ratios.density < CREATE_BONUS_PAINT_RATIO) return false;
  if (ratios.painted !== totalCells) return false;

  const minSharePerColor = CREATE_BONUS_COLOR_SHARE_TOTAL / unlocked;
  const counts = countUnlockedColorCells(pixels, unlockedPaletteCount);

  for (let i = 0; i < unlocked; i++) {
    const color = PALETTE_16[i].toLowerCase();
    const count = counts.get(color) ?? 0;
    if (count === 0) return false;
    if (count / totalCells < minSharePerColor) return false;
  }
  return true;
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
