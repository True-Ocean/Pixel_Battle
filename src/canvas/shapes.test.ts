import { describe, expect, it } from 'vitest';
import { createEmptyGrid, paintCell } from './index';
import {
  cutRect,
  drawEllipseOutline,
  drawLine,
  drawRectOutline,
  extractRect,
  fragmentHasPixels,
  moveFragment,
  normalizeRect,
  stampFragment,
} from './shapes';

describe('shapes', () => {
  it('normalizeRect は座標を正規化する', () => {
    expect(normalizeRect(3, 5, 1, 2)).toEqual({
      minRow: 1,
      maxRow: 3,
      minCol: 2,
      maxCol: 5,
    });
  });

  it('drawLine で2点間を結べる', () => {
    const grid = createEmptyGrid(8);
    const next = drawLine(grid, 0, 0, 0, 3, '#ff0000');
    expect(next[0]!.slice(0, 4)).toEqual([
      '#ff0000',
      '#ff0000',
      '#ff0000',
      '#ff0000',
    ]);
  });

  it('drawLine で太さを指定できる', () => {
    const grid = createEmptyGrid(8);
    const next = drawLine(grid, 0, 0, 0, 3, '#ff0000', 2);
    expect(next[0]!.slice(0, 4).every((cell) => cell === '#ff0000')).toBe(true);
    expect(next[1]![0]).toBe('#ff0000');
  });

  it('drawRectOutline で太い外枠を描ける', () => {
    const grid = createEmptyGrid(8);
    const thin = drawRectOutline(grid, 2, 2, 5, 5, '#00ff00');
    const thick = drawRectOutline(grid, 2, 2, 5, 5, '#00ff00', 2);
    const count = (g: typeof grid) =>
      g.flat().filter((cell) => cell === '#00ff00').length;
    expect(count(thick)).toBeGreaterThan(count(thin));
  });

  it('drawRectOutline で矩形の外枠のみを描ける', () => {
    const grid = createEmptyGrid(6);
    const next = drawRectOutline(grid, 1, 1, 3, 3, '#00ff00');
    expect(next[1]![1]).toBe('#00ff00');
    expect(next[1]![3]).toBe('#00ff00');
    expect(next[3]![1]).toBe('#00ff00');
    expect(next[3]![3]).toBe('#00ff00');
    expect(next[2]![2]).toBeNull();
  });

  it('drawEllipseOutline で楕円の外枠を描ける', () => {
    const grid = createEmptyGrid(10);
    const next = drawEllipseOutline(grid, 2, 2, 6, 6, '#0000ff');
    const painted = next.flat().filter((cell) => cell === '#0000ff').length;
    expect(painted).toBeGreaterThan(4);
    expect(next[4]![2]).toBe('#0000ff');
    expect(next[4]![6]).toBe('#0000ff');
  });

  it('moveFragment で切り取りと配置を一度に行える', () => {
    let grid = createEmptyGrid(6);
    grid = paintCell(grid, 2, 2, '#ff0000');
    const rect = normalizeRect(2, 2, 2, 2);
    const fragment = extractRect(grid, rect);
    const moved = moveFragment(grid, rect, fragment, 4, 4);
    expect(moved[2]![2]).toBeNull();
    expect(moved[4]![4]).toBe('#ff0000');
  });

  it('選択領域の切り取りと配置', () => {
    let grid = createEmptyGrid(6);
    grid = paintCell(grid, 2, 2, '#ff0000');
    grid = paintCell(grid, 2, 3, '#ff0000');
    const rect = normalizeRect(2, 2, 3, 3);
    const fragment = extractRect(grid, rect);
    expect(fragmentHasPixels(fragment)).toBe(true);
    const cut = cutRect(grid, rect);
    expect(cut[2]![2]).toBeNull();
    const placed = stampFragment(cut, fragment, 4, 4);
    expect(placed[4]![4]).toBe('#ff0000');
    expect(placed[4]![5]).toBe('#ff0000');
  });
});
