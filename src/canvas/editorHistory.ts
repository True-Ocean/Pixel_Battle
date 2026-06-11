import { cloneGrid } from './index';
import type { PixelGrid } from '../types';

export interface EditorSnapshot {
  pixels: PixelGrid;
  canvasSize: number;
}

export const EDITOR_HISTORY_MAX = 30;

export function snapshotsEqual(a: EditorSnapshot, b: EditorSnapshot): boolean {
  if (a.canvasSize !== b.canvasSize) return false;
  const pa = a.pixels;
  const pb = b.pixels;
  if (pa.length !== pb.length) return false;
  for (let r = 0; r < pa.length; r++) {
    const rowA = pa[r]!;
    const rowB = pb[r]!;
    if (rowA.length !== rowB.length) return false;
    for (let c = 0; c < rowA.length; c++) {
      if (rowA[c] !== rowB[c]) return false;
    }
  }
  return true;
}

export function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    pixels: cloneGrid(snapshot.pixels),
    canvasSize: snapshot.canvasSize,
  };
}

export function pushEditorHistory(
  past: EditorSnapshot[],
  snapshot: EditorSnapshot,
  max: number = EDITOR_HISTORY_MAX,
): EditorSnapshot[] {
  const next = [...past, cloneSnapshot(snapshot)];
  if (next.length > max) return next.slice(next.length - max);
  return next;
}

export function popEditorHistory(
  past: EditorSnapshot[],
): { past: EditorSnapshot[]; snapshot: EditorSnapshot | null } {
  if (past.length === 0) return { past: [], snapshot: null };
  const snapshot = past[past.length - 1]!;
  return { past: past.slice(0, -1), snapshot: cloneSnapshot(snapshot) };
}
