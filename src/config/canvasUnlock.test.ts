import { describe, expect, it } from 'vitest';
import {
  getDefaultCanvasSize,
  getMaxCanvasSize,
  getUnlockedCanvasSizes,
  isCanvasSizeUnlocked,
} from './canvasUnlock';

describe('canvasUnlock', () => {
  it('Lv1では16のみ', () => {
    expect(getUnlockedCanvasSizes(1)).toEqual([16]);
    expect(getDefaultCanvasSize(1)).toBe(16);
    expect(getMaxCanvasSize(1)).toBe(16);
  });

  it('5n+m（L≡3）ごとに +2px', () => {
    expect(getMaxCanvasSize(8)).toBe(18);
    expect(getUnlockedCanvasSizes(13)).toEqual([16, 18, 20]);
    expect(getMaxCanvasSize(48)).toBe(34);
    expect(getUnlockedCanvasSizes(50)).toEqual([
      16, 18, 20, 22, 24, 26, 28, 30, 32, 34,
    ]);
    expect(getDefaultCanvasSize(50)).toBe(34);
  });

  it('未解放サイズは選択不可', () => {
    expect(isCanvasSizeUnlocked(20, 7)).toBe(false);
    expect(isCanvasSizeUnlocked(20, 13)).toBe(true);
  });
});
