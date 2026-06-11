import { describe, expect, it } from 'vitest';
import {
  IDEAL_TOOL_ORDER,
  getVisibleEditorTools,
  isEditorToolUnlocked,
} from './editorTools';

describe('editorTools', () => {
  it('理想順で基本3ツールのみ Lv1', () => {
    expect(getVisibleEditorTools(1)).toEqual(['eraser', 'fill', 'clear']);
  });

  it('Lv2 で元に戻すが理想順の位置に追加される', () => {
    expect(getVisibleEditorTools(2)).toEqual([
      'eraser',
      'fill',
      'clear',
      'undo',
    ]);
  });

  it('未実装ツールは解放レベルに達しても表示しない', () => {
    expect(isEditorToolUnlocked('redo', 50)).toBe(true);
    expect(getVisibleEditorTools(50)).toEqual([
      'eraser',
      'fill',
      'clear',
      'undo',
    ]);
  });

  it('理想順マスターに図形グループが含まれる', () => {
    expect(IDEAL_TOOL_ORDER).toContain('line');
    expect(IDEAL_TOOL_ORDER.indexOf('rectangle')).toBeGreaterThan(
      IDEAL_TOOL_ORDER.indexOf('line'),
    );
    expect(IDEAL_TOOL_ORDER.indexOf('selection')).toBeGreaterThan(
      IDEAL_TOOL_ORDER.indexOf('circle'),
    );
  });
});
