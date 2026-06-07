import { describe, expect, it } from 'vitest';
import { CANVAS_SIZE } from '../config/balance';
import { createEmptyGrid } from '../canvas';
import { computeColorRatios } from './colors';
import {
  countDistinctUsedColors,
  meetsCreationBonus,
  rollRarity,
} from './rarity';

function fillGrid(color: string) {
  return createEmptyGrid().map((row) => row.map(() => color));
}

function ratiosFor(grid: ReturnType<typeof createEmptyGrid>) {
  const ratios = computeColorRatios(grid, CANVAS_SIZE * CANVAS_SIZE);
  if (!ratios) throw new Error('empty grid');
  return ratios;
}

describe('countDistinctUsedColors', () => {
  it('使用色数を数える', () => {
    const grid = createEmptyGrid();
    grid[0][0] = '#ff0000';
    grid[0][1] = '#ffffff';
    expect(countDistinctUsedColors(grid, 3)).toBe(2);
  });
});

describe('meetsCreationBonus', () => {
  it('塗り80%未満ならボーナスなし', () => {
    const grid = createEmptyGrid();
    grid[0][0] = '#ff0000';
    const ratios = ratiosFor(grid);
    expect(meetsCreationBonus(ratios, grid, 3)).toBe(false);
  });

  it('全色使用かつ80%以上ならボーナス', () => {
    const grid = fillGrid('#ff0000');
    grid[0][0] = '#ffffff';
    grid[0][1] = '#000000';
    const ratios = ratiosFor(grid);
    expect(meetsCreationBonus(ratios, grid, 3)).toBe(true);
  });
});

describe('rollRarity', () => {
  it('デフォルト抽選: 0未満でN', () => {
    const grid = fillGrid('#ff0000');
    const ratios = ratiosFor(grid);
    expect(rollRarity(ratios, grid, 3, () => 0)).toBe('N');
  });

  it('デフォルト抽選: 0.95以上でSR', () => {
    const grid = fillGrid('#ff0000');
    const ratios = ratiosFor(grid);
    expect(rollRarity(ratios, grid, 3, () => 0.96)).toBe('SR');
  });

  it('デフォルト抽選: 0.8以上0.95未満でR', () => {
    const grid = fillGrid('#ff0000');
    const ratios = ratiosFor(grid);
    expect(rollRarity(ratios, grid, 3, () => 0.85)).toBe('R');
  });

  it('ボーナス抽選: 0.5以上でR', () => {
    const grid = fillGrid('#ff0000');
    grid[0][0] = '#ffffff';
    grid[0][1] = '#000000';
    const ratios = ratiosFor(grid);
    expect(rollRarity(ratios, grid, 3, () => 0.55)).toBe('R');
  });

  it('ボーナス抽選: 0.85以上でSR', () => {
    const grid = fillGrid('#ff0000');
    grid[0][0] = '#ffffff';
    grid[0][1] = '#000000';
    const ratios = ratiosFor(grid);
    expect(rollRarity(ratios, grid, 3, () => 0.9)).toBe('SR');
  });
});
