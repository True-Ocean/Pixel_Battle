import { CANVAS_SIZE } from '../config/balance';
import type { PixelGrid } from '../types';

/** 未塗りマスは null */
export function createEmptyGrid(): PixelGrid {
  return Array.from({ length: CANVAS_SIZE }, () =>
    Array.from({ length: CANVAS_SIZE }, () => null),
  );
}

export type CheckerTone = 'light' | 'dark';

/** 16×16 グリッド用の市松模様トーン（行+列の奇偶） */
export function checkerTone(row: number, col: number): CheckerTone {
  return (row + col) % 2 === 0 ? 'light' : 'dark';
}

/** タップ位置から同色連結領域を塗りつぶす */
export function floodFill(
  pixels: PixelGrid,
  startRow: number,
  startCol: number,
  fillColor: string,
): PixelGrid {
  const target = pixels[startRow]?.[startCol] ?? null;
  if (target === fillColor) return pixels;

  const next = pixels.map((row) => [...row]);
  const stack: [number, number][] = [[startRow, startCol]];

  while (stack.length > 0) {
    const [row, col] = stack.pop()!;
    if (row < 0 || row >= next.length || col < 0 || col >= next.length) continue;
    if (next[row][col] !== target) continue;
    next[row][col] = fillColor;
    stack.push([row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]);
  }

  return next;
}
