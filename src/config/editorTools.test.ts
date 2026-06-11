import { describe, expect, it } from 'vitest';
import {
  COLOR_USING_EDITOR_TOOLS,
  IDEAL_TOOL_ORDER,
  IMPLEMENTED_EDITOR_TOOLS,
  getVisibleEditorTools,
  isEditorToolImplemented,
  isEditorToolUnlocked,
  usesBrushColor,
} from './editorTools';

describe('editorTools', () => {
  it('理想順で基本4ツールのみ Lv1', () => {
    expect(getVisibleEditorTools(1)).toEqual(['pen', 'eraser', 'fill', 'clear']);
  });

  it('Lv7 で元に戻すが理想順の位置に追加される', () => {
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

  it('Lv12 でやり直しが理想順の位置に追加される', () => {
    expect(getVisibleEditorTools(11)).toEqual([
      'pen',
      'eraser',
      'fill',
      'clear',
      'undo',
    ]);
    expect(getVisibleEditorTools(12)).toEqual([
      'pen',
      'eraser',
      'fill',
      'clear',
      'undo',
      'redo',
    ]);
  });

  it('Lv17 で直線が追加される', () => {
    expect(getVisibleEditorTools(16)).toEqual([
      'pen',
      'eraser',
      'fill',
      'clear',
      'undo',
      'redo',
    ]);
    expect(getVisibleEditorTools(17)).toEqual([
      'pen',
      'eraser',
      'fill',
      'clear',
      'undo',
      'redo',
      'line',
    ]);
  });

  it('Lv22〜32 で選択・矩形・円が順に追加される', () => {
    expect(getVisibleEditorTools(22)).toContain('selection');
    expect(getVisibleEditorTools(27)).toContain('rectangle');
    expect(getVisibleEditorTools(32)).toEqual([
      'pen',
      'eraser',
      'fill',
      'clear',
      'undo',
      'redo',
      'line',
      'rectangle',
      'circle',
      'selection',
    ]);
  });

  it('スポイトは実装済みだが UI 非表示', () => {
    expect(isEditorToolUnlocked('eyedropper', 50)).toBe(false);
    expect(isEditorToolImplemented('eyedropper')).toBe(false);
    expect(IMPLEMENTED_EDITOR_TOOLS).not.toContain('eyedropper');
    expect(getVisibleEditorTools(50)).not.toContain('eyedropper');
  });

  it('未実装ツールは解放レベルに達しても表示しない', () => {
    expect(IDEAL_TOOL_ORDER).toContain('eyedropper');
    expect(getVisibleEditorTools(50).length).toBe(10);
  });

  it('ブラシ色を使うツールを判定できる', () => {
    expect(COLOR_USING_EDITOR_TOOLS).toContain('pen');
    expect(usesBrushColor('pen')).toBe(true);
    expect(usesBrushColor('fill')).toBe(true);
    expect(usesBrushColor('eraser')).toBe(false);
  });

  it('理想順マスターに図形グループが含まれる', () => {
    expect(IDEAL_TOOL_ORDER).toContain('line');
    expect(IDEAL_TOOL_ORDER.indexOf('rectangle')).toBeGreaterThan(
      IDEAL_TOOL_ORDER.indexOf('line'),
    );
    expect(IDEAL_TOOL_ORDER.indexOf('selection')).toBeGreaterThan(
      IDEAL_TOOL_ORDER.indexOf('redo'),
    );
  });
});
