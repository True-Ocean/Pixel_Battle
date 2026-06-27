import { describe, expect, it } from 'vitest';
import { gridSize } from '../canvas';
import { createCardFromDrawing, updateCardFromDrawing } from './createCard';
import {
  applyLoadBpRecalc,
  clampEditBp,
  computeNaturalCardBp,
  getCardBpCeiling,
  rescaleCardBp,
} from './bpRules';

function fillGrid(color: string, size = 16) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => color),
  );
}

describe('countLimitBreaks / getCardBpCeiling', () => {
  it('SR★0 の上限はレア帯のみ（Lv46 剣 ≈608）', () => {
    const card = createCardFromDrawing('眼', fillGrid('#ff0000'), {
      userLevel: 46,
      forceAttribute: 'attack',
    });
    const sr = { ...card, rarity: 'SR' as const, stars: 0 as const };
    expect(getCardBpCeiling(sr, 46)).toBe(608);
  });

  it('SR★1 はレア帯 + 1 回分の限界突破 BP', () => {
    const card = createCardFromDrawing('星', fillGrid('#ff0000'), {
      userLevel: 46,
      forceAttribute: 'attack',
    });
    const sr0 = { ...card, rarity: 'SR' as const, stars: 0 as const };
    const sr1 = { ...sr0, stars: 1 as const };
    expect(getCardBpCeiling(sr1, 46)).toBe(getCardBpCeiling(sr0, 46) + 16);
  });
});

describe('getCardBpCeiling', () => {
  it('限界突破なし SR は bpBlend=1 の BP を返す', () => {
    const card = createCardFromDrawing('cap', fillGrid('#ff0000'), {
      userLevel: 20,
      forceAttribute: 'attack',
    });
    const sr = { ...card, rarity: 'SR' as const, stars: 0 as const };
    const ceiling = getCardBpCeiling(sr, 20);
    expect(ceiling).toBeGreaterThan(0);
    expect(clampEditBp(100, 9999, ceiling)).toBe(ceiling);
  });
});

describe('applyLoadBpRecalc', () => {
  it('legacy 高 BP を現行式で上書きする', () => {
    const card = createCardFromDrawing('legacy', fillGrid('#ff0000'), {
      userLevel: 40,
    });
    const legacy = { ...card, bp: card.bp + 200 };
    const recalced = applyLoadBpRecalc(legacy, 40);
    expect(recalced.bp).toBe(computeNaturalCardBp(card, 40));
    expect(recalced.bp).toBeLessThan(legacy.bp);
  });
});

describe('clampEditBp', () => {
  it('再計算が下振れする場合は現在 BP を維持', () => {
    expect(clampEditBp(713, 666, 800)).toBe(713);
  });

  it('現在 BP が上限を超えていても下げない', () => {
    expect(clampEditBp(700, 391, 460)).toBe(460);
  });

  it('再計算が上振れする場合は採用するが上限で止める', () => {
    expect(clampEditBp(650, 790, 799)).toBe(790);
    expect(clampEditBp(650, 810, 799)).toBe(799);
  });
});

describe('computeNaturalCardBp', () => {
  it('同じ絵なら名前が違っても BP は同じ', () => {
    const base = createCardFromDrawing('旧名', fillGrid('#ff0000'), {
      userLevel: 10,
      forceAttribute: 'attack',
      random: () => 0.42,
    });
    const renamed = { ...base, name: '新名' };
    expect(computeNaturalCardBp(renamed, 10)).toBe(computeNaturalCardBp(base, 10));
  });
});

describe('updateCardFromDrawing', () => {
  it('リネームのみでは BP を変えない', () => {
    const original = createCardFromDrawing('旧名テスト', fillGrid('#ff0000'), {
      userLevel: 30,
    });
    const previousBp = original.bp;

    const updated = updateCardFromDrawing(
      original,
      '新名テスト',
      fillGrid('#ff0000'),
      30,
    );

    expect(updated.name).toBe('新名テスト');
    expect(updated.bp).toBe(previousBp);
  });

  it('イメージ編集で BP は下がらない', () => {
    const base = createCardFromDrawing('固定', fillGrid('#ff0000'), {
      userLevel: 40,
    });
    const ceiling = getCardBpCeiling(base, 40);
    const original = { ...base, bp: ceiling - 5 };

    const grid = fillGrid('#ff0000');
    grid[0]![0] = '#2222ff';

    const updated = updateCardFromDrawing(original, '固定', grid, 40);
    expect(updated.bp).toBeGreaterThanOrEqual(original.bp);
  });

  it('イメージ編集の BP は ceiling を超えない', () => {
    const original = createCardFromDrawing('上限', fillGrid('#ff0000'), {
      userLevel: 50,
      unlockedPaletteCount: 8,
    });

    const ceiling = getCardBpCeiling(original, 50);
    const grid = fillGrid('#ff0000');
    grid[0]![0] = '#2222ff';

    const updated = updateCardFromDrawing(original, '上限', grid, 50, {
      unlockedPaletteCount: 8,
    });

    expect(updated.bp).toBeLessThanOrEqual(ceiling);
  });
});

describe('rescaleCardBp', () => {
  it('レベルアップで BP を下げない', () => {
    const card = createCardFromDrawing('lv', fillGrid('#ff0000'), {
      userLevel: 20,
    });
    const boosted = { ...card, bp: card.bp + 40 };

    const rescaled = rescaleCardBp(boosted, 25, [], { previousLevel: 20 });
    expect(rescaled).toBeGreaterThanOrEqual(boosted.bp);
  });

  it('上限付近の BP はレベルアップ後も上限に対する位置を維持する', () => {
    const card = createCardFromDrawing('prog', fillGrid('#ff0000'), {
      userLevel: 30,
    });
    const ceiling30 = getCardBpCeiling(card, 30);
    const nearCap = { ...card, bp: ceiling30 - 9 };

    const rescaled = rescaleCardBp(nearCap, 35, [], { previousLevel: 30 });
    const ceiling35 = getCardBpCeiling(card, 35);
    const expectedProgress = Math.round(ceiling35 * ((ceiling30 - 9) / ceiling30));

    expect(rescaled).toBeGreaterThanOrEqual(nearCap.bp);
    expect(rescaled).toBeGreaterThanOrEqual(expectedProgress - 1);
    expect(rescaled).toBeLessThanOrEqual(ceiling35);
  });

  it('previousLevel なしでは natural BP を返す', () => {
    const card = createCardFromDrawing('nat', fillGrid('#ff0000'), {
      userLevel: 10,
    });
    expect(rescaleCardBp(card, 15)).toBe(computeNaturalCardBp(card, 15));
  });

  it('レンジ超え legacy BP はレベルアップ時も ceiling を超えない', () => {
    const card = createCardFromDrawing('legacy', fillGrid('#ff0000'), {
      userLevel: 40,
      forceAttribute: 'attack',
    });
    const sr = { ...card, rarity: 'SR' as const, stars: 0 as const, bp: 800 };
    const rescaled = rescaleCardBp(sr, 46, [], { previousLevel: 40 });
    expect(rescaled).toBeLessThanOrEqual(getCardBpCeiling(sr, 46));
    expect(rescaled).toBeLessThan(800);
  });
});
