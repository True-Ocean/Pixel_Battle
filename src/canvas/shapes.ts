import { cloneGrid } from './index';
import type { PixelGrid } from '../types';

export interface CellCoord {
  row: number;
  col: number;
}

export interface NormalizedRect {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export function normalizeRect(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
): NormalizedRect {
  return {
    minRow: Math.min(r0, r1),
    maxRow: Math.max(r0, r1),
    minCol: Math.min(c0, c1),
    maxCol: Math.max(c0, c1),
  };
}

function inBounds(pixels: PixelGrid, row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < pixels.length && col < pixels.length;
}

function setCell(
  grid: PixelGrid,
  row: number,
  col: number,
  color: string,
): void {
  if (inBounds(grid, row, col)) {
    grid[row]![col] = color;
  }
}

/** Bresenham 直線 */
export function drawLine(
  pixels: PixelGrid,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  color: string,
): PixelGrid {
  const next = cloneGrid(pixels);
  let row = r0;
  let col = c0;
  const dRow = Math.abs(r1 - r0);
  const dCol = Math.abs(c1 - c0);
  const stepRow = r0 < r1 ? 1 : -1;
  const stepCol = c0 < c1 ? 1 : -1;
  let err = dCol - dRow;

  while (true) {
    setCell(next, row, col, color);
    if (row === r1 && col === c1) break;
    const e2 = err * 2;
    if (e2 > -dRow) {
      err -= dRow;
      col += stepCol;
    }
    if (e2 < dCol) {
      err += dCol;
      row += stepRow;
    }
  }

  return next;
}

/** 矩形の外枠（4辺のみ） */
export function drawRectOutline(
  pixels: PixelGrid,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  color: string,
): PixelGrid {
  const { minRow, maxRow, minCol, maxCol } = normalizeRect(r0, c0, r1, c1);
  let next = drawLine(pixels, minRow, minCol, minRow, maxCol, color);
  next = drawLine(next, maxRow, minCol, maxRow, maxCol, color);
  next = drawLine(next, minRow, minCol, maxRow, minCol, color);
  next = drawLine(next, minRow, maxCol, maxRow, maxCol, color);
  return next;
}

/** バウンディングボックス内の楕円外枠 */
export function drawEllipseOutline(
  pixels: PixelGrid,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  color: string,
): PixelGrid {
  const { minRow, maxRow, minCol, maxCol } = normalizeRect(r0, c0, r1, c1);
  const next = cloneGrid(pixels);
  const centerRow = (minRow + maxRow) / 2;
  const centerCol = (minCol + maxCol) / 2;
  const radiusRow = (maxRow - minRow) / 2;
  const radiusCol = (maxCol - minCol) / 2;

  if (radiusRow === 0 && radiusCol === 0) {
    setCell(next, minRow, minCol, color);
    return next;
  }

  const steps = Math.max(
    1,
    Math.ceil(
      2 * Math.PI * Math.max(radiusRow, radiusCol) +
        Math.max(maxRow - minRow, maxCol - minCol),
    ),
  );

  let lastRow = -1;
  let lastCol = -1;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const row = Math.round(centerRow + radiusRow * Math.sin(t));
    const col = Math.round(centerCol + radiusCol * Math.cos(t));
    if (row === lastRow && col === lastCol) continue;
    lastRow = row;
    lastCol = col;
    setCell(next, row, col, color);
  }

  return next;
}

export interface PixelFragment {
  width: number;
  height: number;
  cells: (string | null)[][];
}

export function extractRect(
  pixels: PixelGrid,
  rect: NormalizedRect,
): PixelFragment {
  const height = rect.maxRow - rect.minRow + 1;
  const width = rect.maxCol - rect.minCol + 1;
  const cells: (string | null)[][] = [];
  for (let r = rect.minRow; r <= rect.maxRow; r++) {
    const row: (string | null)[] = [];
    for (let c = rect.minCol; c <= rect.maxCol; c++) {
      row.push(pixels[r]?.[c] ?? null);
    }
    cells.push(row);
  }
  return { width, height, cells };
}

export function fragmentHasPixels(fragment: PixelFragment): boolean {
  return fragment.cells.some((row) => row.some((cell) => cell != null));
}

/** 矩形領域を切り取り（null で埋める） */
export function cutRect(
  pixels: PixelGrid,
  rect: NormalizedRect,
): PixelGrid {
  const next = cloneGrid(pixels);
  for (let r = rect.minRow; r <= rect.maxRow; r++) {
    for (let c = rect.minCol; c <= rect.maxCol; c++) {
      if (inBounds(next, r, c)) {
        next[r]![c] = null;
      }
    }
  }
  return next;
}

/** フラグメントを左上 (topRow, leftCol) に配置 */
export function stampFragment(
  pixels: PixelGrid,
  fragment: PixelFragment,
  topRow: number,
  leftCol: number,
): PixelGrid {
  const next = cloneGrid(pixels);
  for (let r = 0; r < fragment.height; r++) {
    for (let c = 0; c < fragment.width; c++) {
      const color = fragment.cells[r]![c];
      if (color == null) continue;
      const targetRow = topRow + r;
      const targetCol = leftCol + c;
      if (inBounds(next, targetRow, targetCol)) {
        next[targetRow]![targetCol] = color;
      }
    }
  }
  return next;
}

/** 矩形領域を切り取り、別位置へ移動（1回の編集として確定） */
export function moveFragment(
  pixels: PixelGrid,
  sourceRect: NormalizedRect,
  fragment: PixelFragment,
  topRow: number,
  leftCol: number,
): PixelGrid {
  return stampFragment(cutRect(pixels, sourceRect), fragment, topRow, leftCol);
}

export function isCellInRect(
  row: number,
  col: number,
  rect: NormalizedRect,
): boolean {
  return (
    row >= rect.minRow &&
    row <= rect.maxRow &&
    col >= rect.minCol &&
    col <= rect.maxCol
  );
}
