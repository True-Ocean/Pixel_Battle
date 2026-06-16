import { describe, expect, it } from 'vitest';
import {
  finalizeCardNameForCreation,
  getCardNameHalfUnits,
  sanitizeCardNameInput,
  truncateCardNameByDisplayWidth,
  validateCardNameForCreation,
} from './cardNameInput';

describe('cardNameInput', () => {
  it('全角は2半角ユニット、半角は1', () => {
    expect(getCardNameHalfUnits('あ')).toBe(2);
    expect(getCardNameHalfUnits('a')).toBe(1);
    expect(getCardNameHalfUnits('ab')).toBe(2);
    expect(getCardNameHalfUnits('あい')).toBe(4);
    expect(getCardNameHalfUnits('abあ')).toBe(4);
  });

  it('全角10文字まで入力できる', () => {
    const name = 'あ'.repeat(10);
    expect(validateCardNameForCreation(name)).toBeNull();
    expect(sanitizeCardNameInput('あ'.repeat(12))).toBe(name);
  });

  it('半角20文字まで入力できる', () => {
    const name = 'a'.repeat(20);
    expect(validateCardNameForCreation(name)).toBeNull();
    expect(sanitizeCardNameInput('a'.repeat(25))).toBe(name);
  });

  it('全角11文字はエラー', () => {
    expect(validateCardNameForCreation('あ'.repeat(11))).toBe(
      'カード名は全角10文字以内にしてください',
    );
  });

  it('半角21文字は切り詰める', () => {
    expect(sanitizeCardNameInput('a'.repeat(21))).toBe('a'.repeat(20));
  });

  it('混在時は表示幅で切り詰める', () => {
    expect(truncateCardNameByDisplayWidth('abcあいうえ')).toBe('abcあいうえ');
    expect(truncateCardNameByDisplayWidth('abcあいうえおかきく')).toBe('abcあいうえおかきく');
    expect(truncateCardNameByDisplayWidth('abcあいうえおかきくけ')).toBe('abcあいうえおかきく');
    expect(sanitizeCardNameInput('abcdefghijあいうえおか')).toBe('abcdefghijあいうえお');
  });

  it('finalizeCardNameForCreation は前後空白を除いて表示幅制限する', () => {
    expect(finalizeCardNameForCreation(`  ${'あ'.repeat(12)}  `)).toBe('あ'.repeat(10));
    expect(finalizeCardNameForCreation(`  ${'a'.repeat(25)}  `)).toBe('a'.repeat(20));
  });
});
