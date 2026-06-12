import { describe, expect, it } from 'vitest';
import { createEmptyGrid } from '../canvas';
import { computeColorRatios } from './colors';

function fillGrid(color: string, size = 16) {
  return createEmptyGrid(size).map((row) => row.map(() => color));
}

describe('computeColorRatios', () => {
  it('白黒赤のみの絵を従来どおり数える', () => {
    const grid = fillGrid('#ff0000');
    const ratios = computeColorRatios(grid, 16 * 16);
    expect(ratios).toEqual({
      r: 1,
      w: 0,
      b: 0,
      painted: 256,
      density: 1,
      totalCells: 256,
    });
  });

  it('追加色のみの絵も塗りとして認識する', () => {
    const grid = fillGrid('#2222ff');
    const ratios = computeColorRatios(grid, 16 * 16, 6);
    expect(ratios).toEqual({
      r: 0,
      w: 0,
      b: 0,
      painted: 256,
      density: 1,
      totalCells: 256,
    });
  });

  it('混在色では全塗り数を分母に白黒赤比率を出す', () => {
    const grid = fillGrid('#2222ff');
    grid[0]![0] = '#ff0000';
    grid[0]![1] = '#ffffff';
    const ratios = computeColorRatios(grid, 16 * 16, 6);
    expect(ratios?.painted).toBe(256);
    expect(ratios?.r).toBeCloseTo(1 / 256);
    expect(ratios?.w).toBeCloseTo(1 / 256);
    expect(ratios?.b).toBe(0);
  });
});
