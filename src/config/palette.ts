import {
  PALETTE_16,
  PALETTE_GRID_COLS,
  PALETTE_GRID_ROWS,
  PALETTE_PLAYABLE_COUNT,
  PALETTE_UNLOCKED_COUNT_LV0,
} from './balance';

export {
  PALETTE_16,
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
  '茶',
  '水',
  '空',
  'ピンク',
  '灰',
  '暗灰',
  '薄桃',
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

/** 2×8 グリッド上の配置（1始まり） */
export function paletteGridPlacement(index: number): { row: number; col: number } {
  return {
    row: Math.floor(index / PALETTE_GRID_COLS) + 1,
    col: (index % PALETTE_GRID_COLS) + 1,
  };
}

/** エディタ用: index 0〜9 の固定スロット（2行目ツールと重ならない） */
export function paletteEditorSlotPlacement(
  index: number,
): { row: number; col: number } | null {
  if (index < 0 || index >= PALETTE_PLAYABLE_COUNT) return null;
  if (index < PALETTE_GRID_COLS) return paletteGridPlacement(index);
  return { row: 2, col: index - PALETTE_GRID_COLS + 4 };
}

/** 2行目のツール（消しゴム・塗りつぶし・クリア）配置 */
export function paletteToolPlacement(
  tool: 'eraser' | 'fill' | 'clear',
): { row: number; col: number } {
  const col = { eraser: 1, fill: 2, clear: 3 }[tool];
  return { row: 2, col };
}

/** @deprecated paletteToolPlacement('eraser') を使用 */
export function eraserGridPlacement(
  unlockedCount: number = PALETTE_UNLOCKED_COUNT_LV0,
): { row: number; col: number } {
  if (unlockedCount < PALETTE_GRID_COLS) {
    return paletteToolPlacement('eraser');
  }
  return paletteGridPlacement(unlockedCount);
}
