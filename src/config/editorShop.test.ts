import { describe, expect, it } from 'vitest';
import {
  canPurchaseEditorFeature,
  EDITOR_FEATURE_UNLOCK_LEVEL,
  isEditorFeatureUnlocked,
  isEditorToolAvailable,
} from './editorShop';

describe('editorShop', () => {
  it('初期4ツール以外はレベルまたは💎で解放', () => {
    expect(isEditorToolAvailable('pen', 1, [])).toBe(true);
    expect(isEditorToolAvailable('undo', 1, [])).toBe(false);
    expect(isEditorToolAvailable('undo', 1, ['undo'])).toBe(true);
    expect(isEditorToolAvailable('undo', 7, [])).toBe(true);
  });

  it('太さとズームのレベル', () => {
    expect(EDITOR_FEATURE_UNLOCK_LEVEL.brushSize).toBe(42);
    expect(EDITOR_FEATURE_UNLOCK_LEVEL.zoom).toBe(47);
    expect(isEditorFeatureUnlocked('zoom', 46, [])).toBe(false);
    expect(isEditorFeatureUnlocked('zoom', 47, [])).toBe(true);
  });

  it('購入済みは再購入不可', () => {
    expect(canPurchaseEditorFeature('copy', 1, ['copy'])).toBe(false);
    expect(canPurchaseEditorFeature('copy', 1, [])).toBe(true);
  });
});
