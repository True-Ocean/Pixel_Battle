/** デッキ並べ替え: from 番目を to 番目へ移動した新配列 */
export function reorderDeckItems<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** ドラッグ中プレビュー: from から drop へ移動するときの行シフト（-1=上へ, 1=下へ） */
export function getDeckRowShift(
  index: number,
  from: number,
  drop: number,
): -1 | 0 | 1 {
  if (from === drop) return 0;
  if (from < drop) {
    if (index > from && index <= drop) return -1;
  } else if (index >= drop && index < from) {
    return 1;
  }
  return 0;
}

/** 指の Y 座標からドロップ先 index を求める（transform 後の見た目位置を使用） */
export function findDeckDropIndex(
  clientY: number,
  listEl: HTMLElement,
): number | null {
  const rows = Array.from(listEl.querySelectorAll<HTMLElement>('[data-deck-index]'))
    .map((row) => ({
      index: Number(row.dataset.deckIndex),
      rect: row.getBoundingClientRect(),
    }))
    .filter((entry) => Number.isFinite(entry.index) && entry.rect.height > 1)
    .sort((a, b) => a.rect.top - b.rect.top);

  if (rows.length === 0) return null;

  for (const row of rows) {
    const midY = row.rect.top + row.rect.height / 2;
    if (clientY < midY) {
      return row.index;
    }
  }

  return rows[rows.length - 1]!.index;
}

/** @deprecated findDeckDropIndex を使用 */
export function findDeckRowIndexAtY(
  clientY: number,
  listEl: HTMLElement,
  skipIndex?: number,
): number | null {
  const drop = findDeckDropIndex(clientY, listEl);
  if (drop == null) return skipIndex ?? null;
  return drop;
}
