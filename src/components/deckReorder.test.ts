import { describe, expect, it } from 'vitest';
import {
  findDropIndexFromRows,
  getDeckRowShift,
  parseCssTranslateY,
  reorderDeckItems,
} from './deckReorder';

describe('reorderDeckItems', () => {
  it('moves an item within the array', () => {
    expect(reorderDeckItems(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(reorderDeckItems(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('returns a copy when indices are invalid or equal', () => {
    expect(reorderDeckItems(['a'], 0, 0)).toEqual(['a']);
    expect(reorderDeckItems(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
});

describe('getDeckRowShift', () => {
  it('shifts rows between source and drop indices', () => {
    expect(getDeckRowShift(0, 1, 3)).toBe(0);
    expect(getDeckRowShift(1, 1, 3)).toBe(0);
    expect(getDeckRowShift(2, 1, 3)).toBe(-1);
    expect(getDeckRowShift(3, 1, 3)).toBe(-1);
    expect(getDeckRowShift(3, 3, 1)).toBe(0);
    expect(getDeckRowShift(1, 3, 1)).toBe(1);
    expect(getDeckRowShift(2, 3, 1)).toBe(1);
  });
});

describe('parseCssTranslateY', () => {
  it('reads matrix and matrix3d translateY', () => {
    expect(parseCssTranslateY('none')).toBe(0);
    expect(parseCssTranslateY('matrix(1, 0, 0, 1, 0, -80)')).toBe(-80);
    expect(
      parseCssTranslateY(
        'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 80, 0, 1)',
      ),
    ).toBe(80);
  });
});

describe('findDropIndexFromRows', () => {
  const layoutRows = [
    { index: 0, top: 0, height: 80 },
    { index: 1, top: 88, height: 80 },
    { index: 2, top: 176, height: 80 },
    { index: 3, top: 264, height: 80 },
  ];

  it('uses layout midpoints for downward drag without skipping', () => {
    // from=0 のあと index1 が visually 上へシフトしていても、レイアウト位置なら
    // index1 の半分を超えるまで drop は 1 のまま
    expect(findDropIndexFromRows(100, layoutRows)).toBe(1);
    expect(findDropIndexFromRows(140, layoutRows)).toBe(2);
  });

  it('does not jump ahead when visual tops are already shifted up', () => {
    // 旧実装の失敗ケース: transform 後の見た目だと index1 が top≈0、index2 が top≈88
    // になっており、指が y=100 だと mid(88+40)=128 未満で index2 に飛んでしまう
    const visuallyShifted = [
      { index: 0, top: 0, height: 80 }, // source (empty), no shift
      { index: 1, top: 0, height: 80 }, // shifted up visually (layout was 88)
      { index: 2, top: 88, height: 80 },
      { index: 3, top: 176, height: 80 },
    ];
    // レイアウト位置を使えばこの visuallyShifted 入力はそもそも渡さない。
    // レイアウト固定の layoutRows では y=100 → index 1
    expect(findDropIndexFromRows(100, layoutRows)).toBe(1);
    // 参考: 見た目座標で判定すると 2 に飛ぶ（回帰の意図を文書化）
    expect(findDropIndexFromRows(100, visuallyShifted)).toBe(2);
  });

  it('still resolves upward drag targets from layout positions', () => {
    expect(findDropIndexFromRows(30, layoutRows)).toBe(0);
    expect(findDropIndexFromRows(120, layoutRows)).toBe(1);
    expect(findDropIndexFromRows(300, layoutRows)).toBe(3);
  });
});
