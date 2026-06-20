import { describe, expect, it } from 'vitest';
import { createEmptyGrid, paintCell } from './index';
import { eraseBrush, paintBrush } from './brush';

describe('brush stroke', () => {
  it('side length 2 で 2×2 を塗る', () => {
    const grid = createEmptyGrid(5);
    const next = paintBrush(grid, 2, 2, '#ff0000', 2);
    expect(next[2]![2]).toBe('#ff0000');
    expect(next[2]![3]).toBe('#ff0000');
    expect(next[3]![2]).toBe('#ff0000');
    expect(next[3]![3]).toBe('#ff0000');
    expect(next[1]![2]).toBeNull();
  });

  it('side length 3 で 3×3 を消す', () => {
    let grid = createEmptyGrid(6);
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        grid = paintCell(grid, row, col, '#112233');
      }
    }
    const next = eraseBrush(grid, 2, 2, 3);
    expect(next[2]![2]).toBeNull();
    expect(next[1]![1]).toBeNull();
    expect(next[3]![3]).toBeNull();
    expect(next[0]![0]).toBe('#112233');
  });
});
