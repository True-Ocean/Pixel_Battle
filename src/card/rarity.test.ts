import { describe, expect, it } from 'vitest';
import { CANVAS_SIZE, PALETTE_UNLOCKED_COUNT_LV0 } from '../config/balance';
import { PALETTE_16 } from '../config/palette';
import { CREATE_BONUS_COLOR_SHARE_TOTAL } from '../config/rarity';
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

function ratiosFor(
  grid: ReturnType<typeof createEmptyGrid>,
  unlockedPaletteCount = PALETTE_UNLOCKED_COUNT_LV0,
) {
  const ratios = computeColorRatios(
    grid,
    CANVAS_SIZE * CANVAS_SIZE,
    unlockedPaletteCount,
  );
  if (!ratios) throw new Error('empty grid');
  return ratios;
}

/** 創作ボーナス条件を満たす全面塗りグリッド */
function buildBonusGrid(unlockedCount: number, size = CANVAS_SIZE) {
  const colors = PALETTE_16.slice(0, unlockedCount);
  const total = size * size;
  const minEach = Math.ceil((total * CREATE_BONUS_COLOR_SHARE_TOTAL) / unlockedCount);
  const counts = colors.map(() => minEach);
  counts[0] += total - minEach * unlockedCount;

  const grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null as string | null),
  );
  let cursor = 0;
  for (let colorIndex = 0; colorIndex < unlockedCount; colorIndex++) {
    for (let n = 0; n < counts[colorIndex]; n++) {
      const row = Math.floor(cursor / size);
      const col = cursor % size;
      grid[row][col] = colors[colorIndex];
      cursor++;
    }
  }
  return grid;
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
  it('全面塗りでなければボーナスなし', () => {
    const grid = createEmptyGrid();
    grid[0][0] = '#ff0000';
    const ratios = ratiosFor(grid);
    expect(meetsCreationBonus(ratios, grid, 3)).toBe(false);
  });

  it('全面塗りでも各色の占有率が不足ならボーナスなし', () => {
    const grid = fillGrid('#ff0000');
    grid[0][0] = '#ffffff';
    grid[0][1] = '#000000';
    const ratios = ratiosFor(grid);
    expect(meetsCreationBonus(ratios, grid, 3)).toBe(false);
  });

  it('全面塗りかつ各色が (100-20)/N % 以上ならボーナス', () => {
    const grid = buildBonusGrid(3);
    const ratios = ratiosFor(grid);
    expect(meetsCreationBonus(ratios, grid, 3)).toBe(true);
  });

  it('4色時は各色20%以上でボーナス', () => {
    const grid = buildBonusGrid(4);
    const ratios = ratiosFor(grid, 4);
    expect(meetsCreationBonus(ratios, grid, 4)).toBe(true);
    const total = CANVAS_SIZE * CANVAS_SIZE;
    const minShare = CREATE_BONUS_COLOR_SHARE_TOTAL / 4;
    for (const color of PALETTE_16.slice(0, 4)) {
      let count = 0;
      for (const row of grid) {
        for (const cell of row) {
          if (cell?.toLowerCase() === color.toLowerCase()) count++;
        }
      }
      expect(count / total).toBeGreaterThanOrEqual(minShare);
    }
  });
});

describe('rollRarity', () => {
  it('デフォルト抽選: 0.92未満でN', () => {
    const grid = fillGrid('#ff0000');
    const ratios = ratiosFor(grid);
    expect(rollRarity(ratios, grid, 3, () => 0)).toBe('N');
    expect(rollRarity(ratios, grid, 3, () => 0.91)).toBe('N');
  });

  it('デフォルト抽選: 0.92以上0.98未満でR', () => {
    const grid = fillGrid('#ff0000');
    const ratios = ratiosFor(grid);
    expect(rollRarity(ratios, grid, 3, () => 0.92)).toBe('R');
    expect(rollRarity(ratios, grid, 3, () => 0.97)).toBe('R');
  });

  it('デフォルト抽選: 0.98以上でSR', () => {
    const grid = fillGrid('#ff0000');
    const ratios = ratiosFor(grid);
    expect(rollRarity(ratios, grid, 3, () => 0.98)).toBe('SR');
  });

  it('ボーナス抽選: 0.8以上0.95未満でR', () => {
    const grid = buildBonusGrid(3);
    const ratios = ratiosFor(grid);
    expect(rollRarity(ratios, grid, 3, () => 0.85)).toBe('R');
  });

  it('ボーナス抽選: 0.95以上でSR', () => {
    const grid = buildBonusGrid(3);
    const ratios = ratiosFor(grid);
    expect(rollRarity(ratios, grid, 3, () => 0.96)).toBe('SR');
  });
});
