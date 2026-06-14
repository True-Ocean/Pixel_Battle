import { describe, expect, it } from 'vitest';
import { countPaintedCells, countUniqueColors } from './paintStats';

describe('paintStats', () => {
  it('counts painted cells', () => {
    const grid = [
      ['#ff0000', null],
      [null, '#00ff00'],
    ];
    expect(countPaintedCells(grid)).toBe(2);
  });

  it('counts unique colors case-insensitively', () => {
    const grid = [
      ['#FF0000', '#ff0000'],
      ['#0000FF', null],
    ];
    expect(countUniqueColors(grid)).toBe(2);
  });
});
