import { describe, expect, it } from 'vitest';
import { createEmptyGrid, paintCell } from './index';
import {
  EDITOR_HISTORY_MAX,
  popEditorHistory,
  pushEditorHistory,
  snapshotsEqual,
} from './editorHistory';

describe('editorHistory', () => {
  it('同一スナップショットを判定できる', () => {
    const a = { pixels: createEmptyGrid(4), canvasSize: 4 };
    const b = paintCell(a.pixels, 0, 0, '#ff0000');
    expect(snapshotsEqual(a, { pixels: a.pixels, canvasSize: 4 })).toBe(true);
    expect(snapshotsEqual(a, { pixels: b, canvasSize: 4 })).toBe(false);
    expect(snapshotsEqual(a, { pixels: a.pixels, canvasSize: 8 })).toBe(false);
  });

  it('push と pop で履歴を戻せる', () => {
    const empty = { pixels: createEmptyGrid(4), canvasSize: 4 };
    const painted = {
      pixels: paintCell(empty.pixels, 1, 1, '#ff0000'),
      canvasSize: 4,
    };
    const past = pushEditorHistory([], empty);
    const past2 = pushEditorHistory(past, painted);
    expect(past2).toHaveLength(2);

    const step1 = popEditorHistory(past2);
    expect(step1.snapshot).toEqual(painted);
    expect(step1.past).toHaveLength(1);

    const step2 = popEditorHistory(step1.past);
    expect(step2.snapshot).toEqual(empty);
    expect(step2.past).toHaveLength(0);
  });

  it('履歴上限を超えたら古いものを捨てる', () => {
    let past: ReturnType<typeof pushEditorHistory> = [];
    const base = { pixels: createEmptyGrid(2), canvasSize: 2 };
    for (let i = 0; i < EDITOR_HISTORY_MAX + 5; i++) {
      past = pushEditorHistory(past, base);
    }
    expect(past).toHaveLength(EDITOR_HISTORY_MAX);
  });
});
