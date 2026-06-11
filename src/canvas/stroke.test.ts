import { describe, expect, it } from 'vitest';
import {
  createEmptyGrid,
  eraseCell,
  paintCell,
  samplePixelColor,
} from './index';

describe('paintCell', () => {
  it('指定マスだけ色を変える', () => {
    const grid = createEmptyGrid(4);
    const next = paintCell(grid, 1, 2, '#ff0000');
    expect(next[1]![2]).toBe('#ff0000');
    expect(grid[1]![2]).toBeNull();
    expect(next[0]![0]).toBeNull();
  });
});

describe('samplePixelColor', () => {
  it('マスの色を取得できる', () => {
    const grid = paintCell(createEmptyGrid(4), 2, 3, '#00ff00');
    expect(samplePixelColor(grid, 2, 3)).toBe('#00ff00');
    expect(samplePixelColor(grid, 0, 0)).toBeNull();
    expect(samplePixelColor(grid, -1, 0)).toBeNull();
  });
});

describe('eraseCell', () => {
  it('指定マスを null にする', () => {
    const grid = createEmptyGrid(4);
    const painted = paintCell(grid, 0, 0, '#ffffff');
    const next = eraseCell(painted, 0, 0);
    expect(next[0]![0]).toBeNull();
    expect(painted[0]![0]).toBe('#ffffff');
  });
});
