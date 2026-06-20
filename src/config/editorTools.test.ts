import { describe, expect, it } from 'vitest';
import {
  getDisplayEditorTools,
  getVisibleEditorTools,
  isEditorToolUnlockedAtLevel,
} from './editorTools';
import { isEditorToolAvailable } from './editorShop';

describe('editorTools', () => {
  it('理想順で基本4ツールのみ Lv1', () => {
    expect(getVisibleEditorTools(1)).toEqual(['pen', 'eraser', 'fill', 'clear']);
  });

  it('Lv7 で元に戻すが追加される', () => {
    expect(getVisibleEditorTools(6)).toEqual([
      'pen',
      'eraser',
      'fill',
      'clear',
    ]);
    expect(getVisibleEditorTools(7)).toEqual([
      'pen',
      'eraser',
      'fill',
      'clear',
      'undo',
    ]);
  });

  it('Lv22〜37 で矩形・円・移動・コピーが順に追加される', () => {
    expect(isEditorToolUnlockedAtLevel('rectangle', 22)).toBe(true);
    expect(isEditorToolUnlockedAtLevel('circle', 27)).toBe(true);
    expect(isEditorToolUnlockedAtLevel('move', 32)).toBe(true);
    expect(isEditorToolUnlockedAtLevel('selection', 37)).toBe(true);
    expect(getVisibleEditorTools(37)).toEqual([
      'pen',
      'eraser',
      'fill',
      'clear',
      'undo',
      'redo',
      'line',
      'rectangle',
      'circle',
      'move',
      'selection',
    ]);
  });

  it('💎 早期解放でレベル前でも使える', () => {
    expect(isEditorToolAvailable('line', 1, ['line'])).toBe(true);
    expect(isEditorToolAvailable('pen', 1, [])).toBe(true);
  });

  it('表示用リストは実装済みツールを理想順で返す', () => {
    expect(getDisplayEditorTools()).toEqual([
      'pen',
      'eraser',
      'fill',
      'clear',
      'undo',
      'redo',
      'line',
      'rectangle',
      'circle',
      'move',
      'selection',
    ]);
  });
});
