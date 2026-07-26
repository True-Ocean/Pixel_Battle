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

/** CSS transform の translateY（px）を取り出す。なければ 0 */
export function parseCssTranslateY(transform: string): number {
  if (!transform || transform === 'none') return 0;
  if (transform.startsWith('matrix3d(')) {
    const parts = transform
      .slice(9, -1)
      .split(',')
      .map((value) => Number(value.trim()));
    return Number.isFinite(parts[13]) ? parts[13]! : 0;
  }
  if (transform.startsWith('matrix(')) {
    const parts = transform
      .slice(7, -1)
      .split(',')
      .map((value) => Number(value.trim()));
    return Number.isFinite(parts[5]) ? parts[5]! : 0;
  }
  return 0;
}

export interface DeckDropRowGeometry {
  index: number;
  /** レイアウト上の top（プレビュー transform を除いた値） */
  top: number;
  height: number;
}

/**
 * 指の Y と各行のレイアウト位置からドロップ先 index を求める。
 * プレビュー用 translateY 込みの見た目座標を使うと、上→下ドラッグで
 * シフトと判定が連鎖して 1 つ飛ばしになるため、必ずレイアウト位置を渡す。
 */
export function findDropIndexFromRows(
  clientY: number,
  rows: readonly DeckDropRowGeometry[],
): number | null {
  const sorted = rows
    .filter((entry) => Number.isFinite(entry.index) && entry.height > 1)
    .slice()
    .sort((a, b) => a.top - b.top || a.index - b.index);

  if (sorted.length === 0) return null;

  for (const row of sorted) {
    const midY = row.top + row.height / 2;
    if (clientY < midY) {
      return row.index;
    }
  }

  return sorted[sorted.length - 1]!.index;
}

/** 指の Y 座標からドロップ先 index を求める（プレビュー transform を除いたレイアウト位置） */
export function findDeckDropIndex(
  clientY: number,
  listEl: HTMLElement,
): number | null {
  const rows = Array.from(
    listEl.querySelectorAll<HTMLElement>('[data-deck-index]'),
  ).map((row) => {
    const rect = row.getBoundingClientRect();
    const translateY = parseCssTranslateY(getComputedStyle(row).transform);
    return {
      index: Number(row.dataset.deckIndex),
      top: rect.top - translateY,
      height: rect.height,
    };
  });

  return findDropIndexFromRows(clientY, rows);
}

/** 指の座標からデッキタブ index を求める */
export function findDeckTabIndexAtPoint(
  clientX: number,
  clientY: number,
  tabsEl: HTMLElement,
): number | null {
  const tabs = Array.from(
    tabsEl.querySelectorAll<HTMLElement>('[data-deck-tab-index]'),
  );
  for (const tab of tabs) {
    const rect = tab.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      const index = Number(tab.dataset.deckTabIndex);
      return Number.isFinite(index) ? index : null;
    }
  }
  return null;
}
