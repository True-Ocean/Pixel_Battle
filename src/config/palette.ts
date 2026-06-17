import {
  PALETTE_16,
  PALETTE_EDITOR_COLOR_COUNT,
  PALETTE_EDITOR_LEVEL_UNLOCK_COUNT,
  PALETTE_GRID_COLS,
  PALETTE_GRID_ROWS,
  PALETTE_PLAYABLE_COUNT,
  PALETTE_UNLOCKED_COUNT_LV0,
} from './balance';

export {
  PALETTE_16,
  PALETTE_EDITOR_COLOR_COUNT,
  PALETTE_EDITOR_LEVEL_UNLOCK_COUNT,
  PALETTE_GRID_COLS,
  PALETTE_GRID_ROWS,
  PALETTE_PLAYABLE_COUNT,
  PALETTE_UNLOCKED_COUNT_LV0,
};

export const PALETTE_COLOR_LABELS = [
  '白',
  '黒',
  '赤',
  '青',
  '黄',
  '緑',
  '橙',
  '桃',
  '紫',
  '濃い緑',
  '灰',
  '茶',
  '薄赤',
  '薄青',
  '薄黄',
  '薄緑',
  '薄橙',
  '薄桃',
  '薄紫',
  '赤茶',
] as const;

export function isPaletteIndexUnlocked(
  index: number,
  unlockedCount: number = PALETTE_UNLOCKED_COUNT_LV0,
): boolean {
  return index >= 0 && index < unlockedCount;
}

export function isPaletteColorUnlocked(
  color: string,
  unlockedCount: number = PALETTE_UNLOCKED_COUNT_LV0,
): boolean {
  const normalized = color.toLowerCase();
  return PALETTE_16.slice(0, unlockedCount).some((c) => c.toLowerCase() === normalized);
}

export function unlockedPaletteColors(
  unlockedCount: number = PALETTE_UNLOCKED_COUNT_LV0,
): readonly string[] {
  return PALETTE_16.slice(0, unlockedCount);
}

/** 2×10 グリッド上の配置（1始まり） */
export function paletteGridPlacement(index: number): { row: number; col: number } {
  return {
    row: Math.floor(index / PALETTE_GRID_COLS) + 1,
    col: (index % PALETTE_GRID_COLS) + 1,
  };
}
