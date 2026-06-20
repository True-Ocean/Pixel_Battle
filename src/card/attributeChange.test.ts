import { describe, expect, it } from 'vitest';
import { createEmptyGrid } from '../canvas';
import {
  applyAttributeChange,
  retouchCardAttribute,
  selectCardAttribute,
} from './attributeChange';
import { createCardFromDrawing } from './createCard';

function fillGrid(color: string) {
  return createEmptyGrid().map((row) => row.map(() => color));
}

describe('attributeChange', () => {
  it('属性変更でBPを再算出する', () => {
    const card = createCardFromDrawing('test', fillGrid('#ff0000'), {
      forceAttribute: 'attack',
      random: () => 0,
    });
    const previousBp = card.bp;
    const updated = applyAttributeChange(card, 'defense', 10);
    expect(updated.attribute).toBe('defense');
    expect(updated.bp).not.toBe(previousBp);
  });

  it('リタッチで解放済み属性に変わる', () => {
    const card = createCardFromDrawing('test', fillGrid('#ff0000'), {
      forceAttribute: 'attack',
      random: () => 0,
    });
    const updated = retouchCardAttribute(card, 6, [], () => 0);
    expect(updated.attribute).toBe('attack');
  });

  it('セレクトで指定属性に変わる', () => {
    const card = createCardFromDrawing('test', fillGrid('#ff0000'), {
      forceAttribute: 'attack',
      random: () => 0,
    });
    const updated = selectCardAttribute(card, 'power', 10);
    expect(updated.attribute).toBe('power');
  });
});
