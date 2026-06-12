import { PALETTE_16, PALETTE_UNLOCKED_COUNT_LV0 } from '../config/balance';
import type { PixelColor, PixelGrid } from '../types';

const WHITE = PALETTE_16[0].toLowerCase();
const BLACK = PALETTE_16[1].toLowerCase();
const RED = PALETTE_16[2].toLowerCase();

function unlockedColorSet(unlockedCount = PALETTE_UNLOCKED_COUNT_LV0): Set<string> {
  return new Set(
    PALETTE_16.slice(0, unlockedCount).map((color) => color.toLowerCase()),
  );
}

export interface ColorRatios {
  r: number;
  w: number;
  b: number;
  painted: number;
  density: number;
  totalCells: number;
}

export function normalizePixelColor(
  color: PixelColor,
  unlockedCount = PALETTE_UNLOCKED_COUNT_LV0,
): PixelColor {
  if (color == null || color === '') return null;
  const c = color.toLowerCase();
  if (unlockedColorSet(unlockedCount).has(c)) return c;
  return null;
}

export function computeColorRatios(
  pixels: PixelGrid,
  totalCells: number,
  unlockedPaletteCount = PALETTE_UNLOCKED_COUNT_LV0,
): ColorRatios | null {
  let red = 0;
  let white = 0;
  let black = 0;
  let painted = 0;

  for (const row of pixels) {
    for (const cell of row) {
      const c = normalizePixelColor(cell, unlockedPaletteCount);
      if (c == null) continue;
      painted++;
      if (c === RED) red++;
      else if (c === WHITE) white++;
      else if (c === BLACK) black++;
    }
  }

  if (painted === 0) return null;

  return {
    r: red / painted,
    w: white / painted,
    b: black / painted,
    painted,
    density: painted / totalCells,
    totalCells,
  };
}
