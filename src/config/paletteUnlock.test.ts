import { describe, expect, it } from 'vitest';
import {
  getUnlockedPaletteCount,
  isPaletteUnlockedAtLevel,
} from './paletteUnlock';

describe('paletteUnlock', () => {
  it('初期は白黒赤の3色', () => {
    expect(getUnlockedPaletteCount(1)).toBe(3);
    expect(getUnlockedPaletteCount(4)).toBe(3);
  });

  it('下一桁5のレベルで1色ずつ追加', () => {
    expect(getUnlockedPaletteCount(5)).toBe(4);
    expect(getUnlockedPaletteCount(15)).toBe(5);
    expect(getUnlockedPaletteCount(25)).toBe(6);
    expect(getUnlockedPaletteCount(35)).toBe(7);
    expect(getUnlockedPaletteCount(45)).toBe(8);
  });

  it('Lv50では8色（紫・茶は未解放）', () => {
    expect(getUnlockedPaletteCount(50)).toBe(8);
    expect(isPaletteUnlockedAtLevel(7, 50)).toBe(true);
    expect(isPaletteUnlockedAtLevel(8, 50)).toBe(false);
    expect(isPaletteUnlockedAtLevel(9, 50)).toBe(false);
  });
});
