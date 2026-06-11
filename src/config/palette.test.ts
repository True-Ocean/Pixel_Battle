import { describe, expect, it } from 'vitest';
import { PALETTE_16 } from '../config/balance';
import {
  PALETTE_UNLOCKED_COUNT_LV0,
  eraserGridPlacement,
  isPaletteColorUnlocked,
  isPaletteIndexUnlocked,
  paletteEditorSlotPlacement,
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

  it('エディタ用スロット配置（紫・茶は2行目 col4-5）', () => {
    expect(paletteEditorSlotPlacement(3)).toEqual({ row: 1, col: 4 });
    expect(paletteEditorSlotPlacement(8)).toEqual({ row: 2, col: 4 });
    expect(paletteEditorSlotPlacement(9)).toEqual({ row: 2, col: 5 });
  });

  it('2×8 グリッド配置', () => {
    expect(paletteGridPlacement(0)).toEqual({ row: 1, col: 1 });
    expect(paletteGridPlacement(2)).toEqual({ row: 1, col: 3 });
    expect(eraserGridPlacement(3)).toEqual({ row: 2, col: 1 });
  });
});
