import { describe, expect, it } from 'vitest';
import { CANVAS_SIZE } from '../config/balance';
import { createEmptyGrid } from '../canvas';
import { createCardFromDrawing, deriveCardStats, updateCardFromDrawing } from './createCard';
import { buildCardSeed, hashToUnit } from './hash';

function fillGrid(color: string): ReturnType<typeof createEmptyGrid> {
  return createEmptyGrid().map((row) => row.map(() => color));
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
    const a = deriveCardStats('固定', grid);
    const b = deriveCardStats('固定', grid);
    expect(a.attribute).toBe(b.attribute);
    expect(a.bp).toBe(b.bp);
  });

  it('BPはレンジ内', () => {
    const grid = fillGrid('#000000');
    const { bp, attribute } = deriveCardStats('kuro', grid);
    if (attribute === 'attack') {
      expect(bp).toBeGreaterThanOrEqual(70);
      expect(bp).toBeLessThanOrEqual(100);
    } else {
      expect(bp).toBeGreaterThanOrEqual(55);
      expect(bp).toBeLessThanOrEqual(85);
    }
  });
});

describe('createCardFromDrawing', () => {
  it('16x16 のカードを生成', () => {
    const card = createCardFromDrawing('x', fillGrid('#ff0000'));
    expect(card.pixels).toHaveLength(CANVAS_SIZE);
    expect(card.pixels[0]).toHaveLength(CANVAS_SIZE);
    expect(card.name).toBe('x');
    expect(card.wins).toBe(0);
    expect(card.reviveCount).toBe(0);
    expect(card.stars).toBe(0);
    expect(['N', 'R', 'SR']).toContain(card.rarity);
  });

  it('創作ボーナス時は高レア抽選に従う', () => {
    const grid = fillGrid('#ff0000');
    grid[0][0] = '#ffffff';
    grid[0][1] = '#000000';
    const card = createCardFromDrawing('bonus', grid, {
      unlockedPaletteCount: 3,
      random: () => 0.9,
    });
    expect(card.rarity).toBe('SR');
  });
});

describe('updateCardFromDrawing', () => {
  it('IDと戦績を維持して見た目を更新', () => {
    const original = createCardFromDrawing('旧名', fillGrid('#ff0000'));
    original.wins = 3;
    original.losses = 1;

    const updated = updateCardFromDrawing(
      original,
      '新名',
      fillGrid('#ffffff'),
    );

    expect(updated.id).toBe(original.id);
    expect(updated.wins).toBe(3);
    expect(updated.losses).toBe(1);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.name).toBe('新名');
    expect(updated.attribute).toBe('defense');
    expect(updated.rarity).toBe(original.rarity);
    expect(updated.stars).toBe(original.stars);
    expect(updated.reviveCount).toBe(original.reviveCount);
  });
});
