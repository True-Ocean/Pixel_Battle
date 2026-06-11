import { describe, expect, it } from 'vitest';
import { createEmptyGrid, paintCell } from './index';
import {
  applyRedo,
  applyUndo,
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

  it('future スタックでも push と pop が使える', () => {
    const empty = { pixels: createEmptyGrid(4), canvasSize: 4 };
    const painted = {
      pixels: paintCell(empty.pixels, 0, 0, '#ff0000'),
      canvasSize: 4,
    };
    const future = pushEditorHistory([], empty);
    const future2 = pushEditorHistory(future, painted);
    const step = popEditorHistory(future2);
    expect(step.snapshot).toEqual(painted);
    expect(step.past).toHaveLength(1);
  });

  it('Undo / Redo を繰り返してもスタックが1ステップずつ動く', () => {
    const s0 = { pixels: createEmptyGrid(4), canvasSize: 4 };
    const s1 = {
      pixels: paintCell(s0.pixels, 0, 0, '#ff0000'),
      canvasSize: 4,
    };
    const s2 = {
      pixels: paintCell(s1.pixels, 1, 1, '#0000ff'),
      canvasSize: 4,
    };

    let past = pushEditorHistory(pushEditorHistory([], s0), s1);
    let future: ReturnType<typeof pushEditorHistory> = [];
    let current = s2;

    const undo1 = applyUndo({ past, future }, current);
    expect(undo1.next).toEqual(s1);
    expect(undo1.past).toHaveLength(1);
    expect(undo1.future).toHaveLength(1);
    past = undo1.past;
    future = undo1.future;
    current = undo1.next!;

    const undo2 = applyUndo({ past, future }, current);
    expect(undo2.next).toEqual(s0);
    expect(undo2.past).toHaveLength(0);
    expect(undo2.future).toHaveLength(2);
    past = undo2.past;
    future = undo2.future;
    current = undo2.next!;

    const redo1 = applyRedo({ past, future }, current);
    expect(redo1.next).toEqual(s1);
    expect(redo1.past).toHaveLength(1);
    expect(redo1.future).toHaveLength(1);
    past = redo1.past;
    future = redo1.future;
    current = redo1.next!;

    const redo2 = applyRedo({ past, future }, current);
    expect(redo2.next).toEqual(s2);
    expect(redo2.past).toHaveLength(2);
    expect(redo2.future).toHaveLength(0);
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
