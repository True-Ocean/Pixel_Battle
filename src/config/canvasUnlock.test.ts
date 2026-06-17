import { describe, expect, it } from 'vitest';
import {
  CANVAS_SIZE_MIN,
  getDefaultCanvasSize,
  getMaxCanvasSize,
  getSelectableCanvasSizes,
  getUnlockedCanvasSizes,
  isCanvasSizeUnlocked,
} from './canvasUnlock';

describe('canvasUnlock', () => {
  it('Lv1では16のみ', () => {
    expect(getMaxCanvasSize(1)).toBe(16);
    expect(getSelectableCanvasSizes(1)).toEqual([16]);
    expect(getUnlockedCanvasSizes(1)).toEqual([16]);
    expect(getDefaultCanvasSize(1)).toBe(16);
  });

  it('5n+m（L≡3）ごとに上限 +2px、選択は1px刻み', () => {
    expect(getMaxCanvasSize(8)).toBe(18);
    expect(getSelectableCanvasSizes(13)).toEqual([
      16, 17, 18, 19, 20,
    ]);
    expect(getMaxCanvasSize(48)).toBe(34);
    expect(getSelectableCanvasSizes(50)).toEqual(
      Array.from({ length: 34 - CANVAS_SIZE_MIN + 1 }, (_, i) => CANVAS_SIZE_MIN + i),
    );
    expect(getDefaultCanvasSize(50)).toBe(34);
  });

  it('minSize 以降の整数のみ返す', () => {
    expect(getSelectableCanvasSizes(23, 20)).toEqual([20, 21, 22, 23, 24]);
  });

  it('解放済み範囲内の奇数サイズも選択可', () => {
    expect(isCanvasSizeUnlocked(19, 13)).toBe(true);
    expect(isCanvasSizeUnlocked(17, 8)).toBe(true);
    expect(isCanvasSizeUnlocked(20, 7)).toBe(false);
    expect(isCanvasSizeUnlocked(35, 50)).toBe(false);
  });
});
