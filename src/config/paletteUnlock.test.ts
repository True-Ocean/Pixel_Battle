import { describe, expect, it } from 'vitest';
import {
  getUnlockedPaletteCount,
  getUnlockedPaletteIndices,
  isPaletteColorUnlocked,
  isPaletteShopUnlocked,
  isPaletteUnlocked,
  isPaletteUnlockedAtLevel,
  normalizePaletteShopUnlocks,
} from './paletteUnlock';

describe('paletteUnlock', () => {
  it('初期は白黒赤の3色', () => {
    expect(getUnlockedPaletteCount(1)).toBe(3);
    expect(getUnlockedPaletteCount(4)).toBe(3);
  });

  it('L≡5 (mod 10) で1色ずつ追加', () => {
    expect(getUnlockedPaletteCount(5)).toBe(4);
    expect(getUnlockedPaletteCount(14)).toBe(4);
    expect(getUnlockedPaletteCount(15)).toBe(5);
    expect(getUnlockedPaletteCount(24)).toBe(5);
    expect(getUnlockedPaletteCount(25)).toBe(6);
    expect(getUnlockedPaletteCount(35)).toBe(7);
    expect(getUnlockedPaletteCount(45)).toBe(8);
  });

  it('色コードから解放状態を判定できる', () => {
    expect(isPaletteColorUnlocked('#ff0000', 1)).toBe(true);
    expect(isPaletteColorUnlocked('#2222ff', 4)).toBe(false);
    expect(isPaletteColorUnlocked('#2222ff', 5)).toBe(true);
    expect(isPaletteColorUnlocked('#ff44ff', 45)).toBe(true);
    expect(isPaletteColorUnlocked('#ff44ff', 35)).toBe(false);
  });

  it('Lv50ではレベル解放は8色まで', () => {
    expect(getUnlockedPaletteCount(50)).toBe(8);
    expect(isPaletteUnlockedAtLevel(7, 50)).toBe(true);
    expect(isPaletteUnlockedAtLevel(8, 50)).toBe(false);
  });

  it('ショップ解放色は購入後に利用可能', () => {
    expect(isPaletteUnlocked(8, 50, [])).toBe(false);
    expect(isPaletteUnlocked(8, 50, [8])).toBe(true);
    expect(isPaletteUnlocked(12, 50, [12])).toBe(true);
    expect(isPaletteUnlocked(8, 49, [8])).toBe(true);
    expect(getUnlockedPaletteIndices(50, [8, 12])).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 12,
    ]);
  });

  it('ショップ解放 index を正規化する', () => {
    expect(normalizePaletteShopUnlocks([8, 8, 3, 12, 99])).toEqual([8, 12]);
    expect(isPaletteShopUnlocked(8, [8])).toBe(true);
  });
});
