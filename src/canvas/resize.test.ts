import { describe, expect, it } from 'vitest';
import { createEmptyGrid, resizeGrid, upscaleGridToFit } from './index';

describe('resizeGrid', () => {
  it('copies pixels top-left when growing', () => {
    const grid = [
      ['#f00', null],
      [null, '#0f0'],
    ];
    const next = resizeGrid(grid, 4);
    expect(next.length).toBe(4);
    expect(next[0]![0]).toBe('#f00');
    expect(next[1]![1]).toBe('#0f0');
    expect(next[3]![3]).toBeNull();
  });
});

describe('upscaleGridToFit', () => {
  it('stretches a solid grid to fill the target size', () => {
    const grid = [
      ['#f00', '#f00'],
      ['#f00', '#f00'],
    ];
    const next = upscaleGridToFit(grid, 4);
    expect(next.length).toBe(4);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        expect(next[r]![c]).toBe('#f00');
      }
    }
  });

  it('maps 16→20 with nearest-neighbor sampling', () => {
    const grid = createEmptyGrid(16);
    grid[0]![0] = '#abc';
    grid[15]![15] = '#def';

    const next = upscaleGridToFit(grid, 20);
    expect(next.length).toBe(20);
    expect(next[0]![0]).toBe('#abc');
    expect(next[19]![19]).toBe('#def');
  });

  it('falls back to resizeGrid when shrinking', () => {
    const grid = [
      ['#f00', '#0f0'],
      ['#00f', null],
    ];
    const next = upscaleGridToFit(grid, 2);
    expect(next).toEqual(grid);
  });

  it('keeps an empty grid empty', () => {
    const grid = createEmptyGrid(16);
    const next = upscaleGridToFit(grid, 20);
    expect(next.length).toBe(20);
    expect(next.every((row) => row.every((cell) => cell === null))).toBe(true);
  });
});
