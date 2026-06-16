import { describe, expect, it } from 'vitest';
import {
  CANVAS_SIZE,
  getCardBaseBpRange,
  getUserBaseBp,
} from '../config/balance';
import { PALETTE_16 } from '../config/palette';
import { CREATE_BONUS_COLOR_SHARE_TOTAL } from '../config/rarity';
import { createEmptyGrid } from '../canvas';
import {
  createCardFromDrawing,
  deriveCardStats,
  recalculateCardBp,
  rescaleDeckBp,
  updateCardFromDrawing,
} from './createCard';
import {
  finalizeCardNameForCreation,
  sanitizeCardNameInput,
  validateCardNameForCreation,
} from './cardNameInput';
import { buildCardSeed, hashToUnit } from './hash';

function fillGrid(color: string): ReturnType<typeof createEmptyGrid> {
  return createEmptyGrid().map((row) => row.map(() => color));
}

function buildBonusGrid(unlockedCount: number) {
  const colors = PALETTE_16.slice(0, unlockedCount);
  const total = CANVAS_SIZE * CANVAS_SIZE;
  const minEach = Math.ceil((total * CREATE_BONUS_COLOR_SHARE_TOTAL) / unlockedCount);
  const counts = colors.map(() => minEach);
  counts[0] += total - minEach * unlockedCount;

  const grid = createEmptyGrid().map((row) => row.map(() => null as string | null));
  let cursor = 0;
  for (let colorIndex = 0; colorIndex < unlockedCount; colorIndex++) {
    for (let n = 0; n < counts[colorIndex]; n++) {
      const row = Math.floor(cursor / CANVAS_SIZE);
      const col = cursor % CANVAS_SIZE;
      grid[row][col] = colors[colorIndex];
      cursor++;
    }
  }
  return grid;
}

describe('hash', () => {
  it('同じシードなら同じ値', () => {
    const s = buildCardSeed('test', createEmptyGrid());
    expect(hashToUnit(s, 'attack')).toBe(hashToUnit(s, 'attack'));
  });
});

describe('deriveCardStats', () => {
  it('未塗りのみならエラー', () => {
    expect(() => deriveCardStats('a', createEmptyGrid())).toThrow();
  });

  it('赤のみなら攻撃寄り', () => {
    const grid = fillGrid('#ff0000');
    const { attribute } = deriveCardStats('赤っぽい', grid);
    expect(attribute).toBe('attack');
  });

  it('白のみなら防御寄り', () => {
    const grid = fillGrid('#ffffff');
    const { attribute } = deriveCardStats('しろ', grid);
    expect(attribute).toBe('defense');
  });

  it('同じ名前と絵なら同じ属性・BP', () => {
    const grid = fillGrid('#ff0000');
    const a = deriveCardStats('固定', grid, 5);
    const b = deriveCardStats('固定', grid, 5);
    expect(a.attribute).toBe(b.attribute);
    expect(a.bp).toBe(b.bp);
  });

  it('BPはユーザーレベル基準のレンジ内', () => {
    const grid = fillGrid('#000000');
    const userLevel = 10;
    const { bp, attribute } = deriveCardStats('kuro', grid, userLevel);
    const { min, max } = getCardBaseBpRange(userLevel, attribute);
    expect(bp).toBeGreaterThanOrEqual(min);
    expect(bp).toBeLessThanOrEqual(max);
  });

  it('レベルが上がるとBPレンジも上がる', () => {
    const grid = fillGrid('#ff0000');
    const low = deriveCardStats('固定', grid, 1);
    const high = deriveCardStats('固定', grid, 10);
    expect(high.bp).toBeGreaterThan(low.bp);
    expect(getUserBaseBp(10, 'attack')).toBe(100);
    expect(getUserBaseBp(1, 'attack')).toBe(10);
  });

  it('防御は攻撃より基本BPが低い', () => {
    const grid = fillGrid('#ffffff');
    const stats = deriveCardStats('しろ', grid, 1);
    expect(stats.attribute).toBe('defense');
    const { min, max } = getCardBaseBpRange(1, 'defense');
    expect(stats.bp).toBeGreaterThanOrEqual(min);
    expect(stats.bp).toBeLessThanOrEqual(max);
    expect(getUserBaseBp(10, 'defense')).toBe(85);
  });

  it('Lv5以下では力属性は抽選されない', () => {
    const grid = fillGrid('#ff0000');
    for (let i = 0; i < 200; i++) {
      const { attribute } = deriveCardStats(`lv5-${i}`, grid, 5);
      expect(attribute).not.toBe('power');
    }
  });

  it('Lv6以上では力属性が抽選されうる', () => {
    const grid = fillGrid('#ff0000');
    let foundPower = false;
    for (let i = 0; i < 500; i++) {
      const { attribute } = deriveCardStats(`lv6-${i}`, grid, 6);
      if (attribute === 'power') {
        foundPower = true;
        break;
      }
    }
    expect(foundPower).toBe(true);
  });

  it('力属性カードのBPは力レンジ内', () => {
    const grid = fillGrid('#ff0000');
    for (let i = 0; i < 500; i++) {
      const stats = deriveCardStats(`power-bp-${i}`, grid, 10);
      if (stats.attribute !== 'power') continue;
      const { min, max } = getCardBaseBpRange(10, 'power');
      expect(stats.bp).toBeGreaterThanOrEqual(min);
      expect(stats.bp).toBeLessThanOrEqual(max);
      return;
    }
    expect.fail('力属性のサンプルが見つからない');
  });
});

describe('createCardFromDrawing', () => {
  it('名前が空ならエラー', () => {
    expect(validateCardNameForCreation('   ')).toBe('カード名を入力してください');
    expect(() => createCardFromDrawing('   ', fillGrid('#ff0000'))).toThrow(
      'カード名を入力してください',
    );
  });

  it('名前が長すぎるとエラー', () => {
    const longName = 'あ'.repeat(11);
    expect(validateCardNameForCreation(longName)).toBe(
      'カード名は全角10文字以内にしてください',
    );
    expect(() => createCardFromDrawing(longName, fillGrid('#ff0000'))).toThrow(
      'カード名は全角10文字以内にしてください',
    );
  });

  it('半角20文字まで作成できる', () => {
    const name = 'a'.repeat(20);
    expect(validateCardNameForCreation(name)).toBeNull();
    const card = createCardFromDrawing(name, fillGrid('#ff0000'));
    expect(card.name).toBe(name);
  });

  it('sanitizeCardNameInput は全角10文字で切り詰める', () => {
    expect(sanitizeCardNameInput('あ'.repeat(12))).toBe('あ'.repeat(10));
  });

  it('finalizeCardNameForCreation は前後空白を除いて表示幅制限する', () => {
    expect(finalizeCardNameForCreation(`  ${'あ'.repeat(12)}  `)).toBe('あ'.repeat(10));
  });

  it('forceAttribute で解放前の属性を固定できる', () => {
    const card = createCardFromDrawing('弓テスト', fillGrid('#ff0000'), {
      userLevel: 1,
      forceAttribute: 'bow',
    });
    expect(card.attribute).toBe('bow');
  });

  it('16x16 のカードを生成', () => {
    const card = createCardFromDrawing('x', fillGrid('#ff0000'));
    expect(card.pixels).toHaveLength(CANVAS_SIZE);
    expect(card.pixels[0]).toHaveLength(CANVAS_SIZE);
    expect(card.canvasSize).toBe(CANVAS_SIZE);
    expect(card.name).toBe('x');
    expect(card.wins).toBe(0);
    expect(card.reviveCount).toBe(0);
    expect(card.stars).toBe(0);
    expect(['N', 'R', 'SR']).toContain(card.rarity);
  });

  it('創作ボーナス時は高レア抽選に従う', () => {
    const grid = buildBonusGrid(3);
    const card = createCardFromDrawing('bonus', grid, {
      userLevel: 10,
      unlockedPaletteCount: 3,
      random: () => 0.96,
    });
    expect(card.rarity).toBe('SR');
    const { min } = getCardBaseBpRange(10, card.attribute);
    expect(card.bp).toBeGreaterThanOrEqual(Math.round(min * 1.15));
  });

  it('Lv50 の解放色は保存後も保持される', () => {
    const grid = fillGrid('#ff0000');
    grid[0][0] = '#2222ff';
    grid[0][1] = '#ffdd00';
    grid[0][2] = '#44cc44';
    grid[0][3] = '#ff8800';
    grid[0][4] = '#ff44ff';

    const card = createCardFromDrawing('8色', grid, {
      userLevel: 50,
      unlockedPaletteCount: 8,
      canvasSize: 36,
    });

    expect(card.pixels[0][0]).toBe('#2222ff');
    expect(card.pixels[0][1]).toBe('#ffdd00');
    expect(card.pixels[0][2]).toBe('#44cc44');
    expect(card.pixels[0][3]).toBe('#ff8800');
    expect(card.pixels[0][4]).toBe('#ff44ff');
    expect(card.pixels[1][0]).toBe('#ff0000');
  });

  it('同じ絵でも R/SR は N より BP が高くなる', () => {
    const grid = fillGrid('#ff0000');
    const nCard = createCardFromDrawing('same', grid, {
      userLevel: 10,
      random: () => 0.1,
    });
    const srCard = createCardFromDrawing('same', grid, {
      userLevel: 10,
      random: () => 0.99,
    });
    expect(nCard.rarity).toBe('N');
    expect(srCard.rarity).toBe('SR');
    expect(srCard.bp).toBeGreaterThan(nCard.bp);
  });
});

describe('recalculateCardBp', () => {
  it('ユーザーレベルに応じて BP を再算出する', () => {
    const card = createCardFromDrawing('固定', fillGrid('#ff0000'), {
      userLevel: 1,
    });
    const low = recalculateCardBp(card, 1);
    const high = recalculateCardBp(card, 20);
    expect(low).toBe(card.bp);
    expect(high).toBeGreaterThan(low);
  });
});

describe('rescaleDeckBp', () => {
  it('デッキ内の全カード BP を一括更新する', () => {
    const card = createCardFromDrawing('a', fillGrid('#ff0000'), {
      userLevel: 1,
    });
    const deck = rescaleDeckBp([card], 20);
    expect(deck[0]!.bp).toBe(recalculateCardBp(card, 20));
  });
});

describe('updateCardFromDrawing', () => {
  it('IDと戦績・属性・レアを維持してBPのみ再算出', () => {
    const original = createCardFromDrawing('旧名', fillGrid('#ff0000'), {
      userLevel: 1,
    });
    original.wins = 3;
    original.losses = 1;

    const updated = updateCardFromDrawing(
      original,
      '新名',
      fillGrid('#ffffff'),
      10,
    );

    expect(updated.id).toBe(original.id);
    expect(updated.wins).toBe(3);
    expect(updated.losses).toBe(1);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.name).toBe('新名');
    expect(updated.attribute).toBe(original.attribute);
    expect(updated.rarity).toBe(original.rarity);
    expect(updated.stars).toBe(original.stars);
    expect(updated.reviveCount).toBe(original.reviveCount);
    expect(updated.bp).toBeGreaterThan(original.bp);
  });

  it('編集保存でも解放済みの色を保持する', () => {
    const original = createCardFromDrawing('色', fillGrid('#ff0000'), {
      userLevel: 50,
      unlockedPaletteCount: 8,
    });

    const grid = fillGrid('#ff0000');
    grid[0][0] = '#2222ff';

    const updated = updateCardFromDrawing(original, '色', grid, 50, 8);

    expect(updated.pixels[0][0]).toBe('#2222ff');
    expect(updated.pixels[0][1]).toBe('#ff0000');
  });
});
