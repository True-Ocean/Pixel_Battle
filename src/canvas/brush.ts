import type { PixelGrid } from '../types';
import { cloneGrid } from './index';

export function stampBrush(
  grid: PixelGrid,
  centerRow: number,
  centerCol: number,
  color: string | null,
  sideLength: number,
): void {
  const gridSize = grid.length;
  const side = Math.max(1, Math.floor(sideLength));
  const offset = Math.floor((side - 1) / 2);
  const startRow = centerRow - offset;
  const startCol = centerCol - offset;

  for (let row = startRow; row < startRow + side; row++) {
    for (let col = startCol; col < startCol + side; col++) {
      if (row < 0 || col < 0 || row >= gridSize || col >= gridSize) continue;
      grid[row]![col] = color;
    }
  }
}

export function paintBrush(
  pixels: PixelGrid,
  centerRow: number,
  centerCol: number,
  color: string,
  sideLength: number,
): PixelGrid {
  const next = cloneGrid(pixels);
  stampBrush(next, centerRow, centerCol, color, sideLength);
  return next;
}

export function eraseBrush(
  pixels: PixelGrid,
  centerRow: number,
  centerCol: number,
  sideLength: number,
): PixelGrid {
  const next = cloneGrid(pixels);
  stampBrush(next, centerRow, centerCol, null, sideLength);
  return next;
}
