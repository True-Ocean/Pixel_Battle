import { CANVAS_SIZE_DEFAULT } from '../config/balance';
import type { PixelGrid } from '../types';

/** 未塗りマスは null */
export function createEmptyGrid(
  size: number = CANVAS_SIZE_DEFAULT,
): PixelGrid {
  const n = Math.max(1, Math.floor(size));
  return Array.from({ length: n }, () =>
    Array.from({ length: n }, () => null),
  );
}

export function gridSize(pixels: PixelGrid): number {
  return pixels.length;
}

export function cloneGrid(pixels: PixelGrid): PixelGrid {
  return pixels.map((row) => [...row]);
}

/** 1マス塗り（不変更新） */
export function paintCell(
  pixels: PixelGrid,
  row: number,
  col: number,
  color: string,
): PixelGrid {
  if (row < 0 || col < 0 || row >= pixels.length || col >= pixels.length) {
    return pixels;
  }
  const next = cloneGrid(pixels);
  next[row]![col] = color;
  return next;
}

/** 1マス消し（不変更新） */
export function eraseCell(pixels: PixelGrid, row: number, col: number): PixelGrid {
  if (row < 0 || col < 0 || row >= pixels.length || col >= pixels.length) {
    return pixels;
  }
  const next = cloneGrid(pixels);
  next[row]![col] = null;
  return next;
}

export function isStrokeTool(tool: string): boolean {
  return tool === 'pen' || tool === 'eraser';
}

/** マスの色を取得（範囲外は null） */
export function samplePixelColor(
  pixels: PixelGrid,
  row: number,
  col: number,
): string | null {
  if (row < 0 || col < 0 || row >= pixels.length || col >= pixels.length) {
    return null;
  }
  return pixels[row]![col] ?? null;
}

/** サイズ変更時: 既存ピクセルを左上基準で新グリッドへコピー */
export function resizeGrid(pixels: PixelGrid, newSize: number): PixelGrid {
  const next = createEmptyGrid(newSize);
  const oldSize = pixels.length;
  const copy = Math.min(oldSize, newSize);
  for (let r = 0; r < copy; r++) {
    for (let c = 0; c < copy; c++) {
      next[r]![c] = pixels[r]?.[c] ?? null;
    }
  }
  return next;
}

export type CheckerTone = 'light' | 'dark';

/** グリッド用の市松模様トーン（行+列の奇偶） */
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

export {
  cutRect,
  drawEllipseOutline,
  drawLine,
  drawRectOutline,
  extractRect,
  fragmentHasPixels,
  isCellInRect,
  moveFragment,
  normalizeRect,
  stampFragment,
  type CellCoord,
  type NormalizedRect,
  type PixelFragment,
} from './shapes';
