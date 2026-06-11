import { describe, expect, it } from 'vitest';
import {
  getUnlockedPaletteCount,
  isPaletteColorUnlockedAtLevel,
  isPaletteUnlockedAtLevel,
} from './paletteUnlock';

describe('paletteUnlock', () => {
  it('初期は白黒赤の3色', () => {
    expect(getUnlockedPaletteCount(1)).toBe(3);
    expect(getUnlockedPaletteCount(4)).toBe(3);
  });

  it('レベルに応じて1色ずつ追加', () => {
    expect(getUnlockedPaletteCount(5)).toBe(4);
    expect(getUnlockedPaletteCount(14)).toBe(4);
    expect(getUnlockedPaletteCount(15)).toBe(5);
    expect(getUnlockedPaletteCount(20)).toBe(6);
    expect(getUnlockedPaletteCount(25)).toBe(7);
    expect(getUnlockedPaletteCount(30)).toBe(8);
  });

  it('色コードから解放状態を判定できる', () => {
    expect(isPaletteColorUnlockedAtLevel('#ff0000', 1)).toBe(true);
    expect(isPaletteColorUnlockedAtLevel('#2222ff', 4)).toBe(false);
    expect(isPaletteColorUnlockedAtLevel('#2222ff', 5)).toBe(true);
    expect(isPaletteColorUnlockedAtLevel('#ff44ff', 30)).toBe(true);
    expect(isPaletteColorUnlockedAtLevel('#ff44ff', 25)).toBe(false);
  });

  it('Lv50では8色（紫・茶は未解放）', () => {
    expect(getUnlockedPaletteCount(50)).toBe(8);
    expect(isPaletteUnlockedAtLevel(7, 50)).toBe(true);
    expect(isPaletteUnlockedAtLevel(8, 50)).toBe(false);
    expect(isPaletteUnlockedAtLevel(9, 50)).toBe(false);
  });
});
