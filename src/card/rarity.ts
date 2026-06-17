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

function resolveUnlockedIndices(
  unlocked: number | readonly number[],
): readonly number[] {
  if (typeof unlocked === 'number') {
    const count = unlocked > 0 ? unlocked : PALETTE_16.length;
    return Array.from({ length: count }, (_, index) => index);
  }
  return unlocked;
}

export function countDistinctUsedColors(
  pixels: PixelGrid,
  unlocked: number | readonly number[],
): number {
  const indices = resolveUnlockedIndices(unlocked);
  const allowed = new Set(
    indices.map((index) => PALETTE_16[index]!.toLowerCase()),
  );
  const used = new Set<string>();
  for (const row of pixels) {
    for (const cell of row) {
      const normalized = normalizePixelColor(cell, allowed);
      if (normalized) used.add(normalized);
    }
  }
  return used.size;
}

/** 解放済み各色の使用マス数（未使用色は 0） */
export function countUnlockedColorCells(
  pixels: PixelGrid,
  unlocked: number | readonly number[],
): Map<string, number> {
  const indices = resolveUnlockedIndices(unlocked);
  const counts = new Map<string, number>();
  for (const index of indices) {
    counts.set(PALETTE_16[index]!.toLowerCase(), 0);
  }
  const allowed = new Set(counts.keys());
  for (const row of pixels) {
    for (const cell of row) {
      const normalized = normalizePixelColor(cell, allowed);
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
  unlocked: number | readonly number[],
): boolean {
  const indices = resolveUnlockedIndices(unlocked);
  const unlockedCount = indices.length;
  const totalCells = ratios.totalCells;
  if (unlockedCount <= 0 || totalCells <= 0) return false;
  if (ratios.density < CREATE_BONUS_PAINT_RATIO) return false;
  if (ratios.painted !== totalCells) return false;

  const minSharePerColor = CREATE_BONUS_COLOR_SHARE_TOTAL / unlockedCount;
  const counts = countUnlockedColorCells(pixels, indices);

  for (const index of indices) {
    const color = PALETTE_16[index]!.toLowerCase();
    const count = counts.get(color) ?? 0;
    if (count === 0) return false;
    if (count / totalCells < minSharePerColor) return false;
  }
  return true;
}

export function rollRarity(
  ratios: ColorRatios,
  pixels: PixelGrid,
  unlocked: number | readonly number[],
  random: () => number = Math.random,
): CardRarity {
  const weights = meetsCreationBonus(ratios, pixels, unlocked)
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
