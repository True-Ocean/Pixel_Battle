import { describe, expect, it } from 'vitest';
import {
  getDefaultCanvasSize,
  getUnlockedCanvasSizes,
  isCanvasSizeUnlocked,
} from './canvasUnlock';

describe('canvasUnlock', () => {
  it('Lv1では16のみ', () => {
    expect(getUnlockedCanvasSizes(1)).toEqual([16]);
    expect(getDefaultCanvasSize(1)).toBe(16);
  });

  it('10レベルごとにサイズが追加される', () => {
    expect(getUnlockedCanvasSizes(10)).toEqual([16, 20]);
    expect(getUnlockedCanvasSizes(30)).toEqual([16, 20, 24, 28]);
    expect(getUnlockedCanvasSizes(50)).toEqual([16, 20, 24, 28, 32, 36]);
    expect(getDefaultCanvasSize(50)).toBe(36);
  });

  it('未解放サイズは選択不可', () => {
    expect(isCanvasSizeUnlocked(24, 15)).toBe(false);
    expect(isCanvasSizeUnlocked(24, 20)).toBe(true);
  });
});
