import { describe, expect, it } from 'vitest';
import { PALETTE_16 } from '../config/balance';
import { createEmptyGrid } from '../canvas';
import { countPaintedCells } from '../card/paintStats';
import {
  adjustPixelDensity,
  applyPatternTransform,
  buildCpuPixelArt,
  CPU_PATTERNS,
  pickCpuPattern,
  rollCpuTargetDensity,
} from './cpuPatterns';

describe('pickCpuPattern', () => {
  it('除外IDを避けて模様を選ぶ', () => {
    const exclude = new Set(CPU_PATTERNS.map((pattern) => pattern.id));
    exclude.delete('fish');
    const pattern = pickCpuPattern(() => 0.5, exclude);
    expect(pattern.id).toBe('fish');
  });
});

describe('adjustPixelDensity', () => {
  it('目標密度に近づける', () => {
    const grid = createEmptyGrid(16);
    grid[0]![0] = '#ff0000';
    const colors = PALETTE_16.slice(0, 3);
    const adjusted = adjustPixelDensity(grid, 0.5, colors, () => 0.42);
    const density = countPaintedCells(adjusted) / (16 * 16);
    expect(density).toBeGreaterThan(0.35);
    expect(density).toBeLessThan(0.65);
  });
});

describe('buildCpuPixelArt', () => {
  it('変換と密度調整後も塗りがある', () => {
    const pattern = CPU_PATTERNS[0]!;
    const pixels = buildCpuPixelArt({
      pattern,
      canvasSize: 16,
      colors: PALETTE_16.slice(0, 6),
      targetDensity: rollCpuTargetDensity(() => 0.6),
      random: () => 0.33,
    });
    expect(countPaintedCells(pixels)).toBeGreaterThan(8);
  });
});

describe('applyPatternTransform', () => {
  it('同一入力でも変換結果が得られる', () => {
    const grid = createEmptyGrid(4);
    grid[0]![0] = '#ff0000';
    grid[3]![3] = '#ffffff';
    const transformed = applyPatternTransform(grid, () => 0.9);
    expect(countPaintedCells(transformed)).toBe(2);
  });
});
