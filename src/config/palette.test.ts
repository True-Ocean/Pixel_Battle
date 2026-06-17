import { describe, expect, it } from 'vitest';
import { PALETTE_16 } from '../config/balance';
import {
  PALETTE_EDITOR_COLOR_COUNT,
  PALETTE_UNLOCKED_COUNT_LV0,
  isPaletteColorUnlocked,
  isPaletteIndexUnlocked,
  paletteGridPlacement,
  unlockedPaletteColors,
} from '../config/palette';

describe('palette', () => {
  it('Lv0 は左上3色のみ解放', () => {
    expect(PALETTE_16.slice(0, 3)).toEqual(['#ffffff', '#000000', '#ff0000']);
    expect(unlockedPaletteColors()).toEqual(['#ffffff', '#000000', '#ff0000']);
    expect(PALETTE_UNLOCKED_COUNT_LV0).toBe(3);
  });

  it('未解放色は選択不可判定', () => {
    expect(isPaletteIndexUnlocked(0)).toBe(true);
    expect(isPaletteIndexUnlocked(2)).toBe(true);
    expect(isPaletteIndexUnlocked(3)).toBe(false);
    expect(isPaletteColorUnlocked('#ff0000')).toBe(true);
    expect(isPaletteColorUnlocked('#2222ff')).toBe(false);
    expect(isPaletteColorUnlocked('#ff8800', 7)).toBe(true);
  });

  it('エディタは 2×10 グリッド（計20色）', () => {
    expect(PALETTE_EDITOR_COLOR_COUNT).toBe(20);
    expect(PALETTE_16).toHaveLength(20);
    expect(paletteGridPlacement(0)).toEqual({ row: 1, col: 1 });
    expect(paletteGridPlacement(9)).toEqual({ row: 1, col: 10 });
    expect(paletteGridPlacement(10)).toEqual({ row: 2, col: 1 });
    expect(paletteGridPlacement(19)).toEqual({ row: 2, col: 10 });
  });
});
