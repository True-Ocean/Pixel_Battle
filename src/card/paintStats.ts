import type { PixelGrid } from '../types';

/** 非 null の塗りマス数 */
export function countPaintedCells(pixels: PixelGrid): number {
  let count = 0;
  for (const row of pixels) {
    for (const cell of row) {
      if (cell != null && cell !== '') count++;
    }
  }
  return count;
}

/** 使用色数（大文字小文字を正規化） */
export function countUniqueColors(pixels: PixelGrid): number {
  const colors = new Set<string>();
  for (const row of pixels) {
    for (const cell of row) {
      if (cell != null && cell !== '') colors.add(cell.toLowerCase());
    }
  }
  return colors.size;
}
