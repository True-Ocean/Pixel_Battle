import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import {
  applyUserNoteToCard,
  finalizeCardUserNote,
  hasCardUserNote,
  sanitizeCardUserNoteInput,
} from './cardNoteInput';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-note-test',
    name: 'テスト',
    pixels: [['#ff0000']],
    canvasSize: 1,
    attribute: 'attack',
    bp: 10,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('cardNoteInput', () => {
  it('全角100文字まで入力できる', () => {
    const note = 'あ'.repeat(100);
    expect(sanitizeCardUserNoteInput('あ'.repeat(120))).toBe(note);
    expect(finalizeCardUserNote(note)).toBe(note);
  });

  it('半角200文字まで入力できる', () => {
    const note = 'a'.repeat(200);
    expect(sanitizeCardUserNoteInput('a'.repeat(220))).toBe(note);
  });

  it('改行を含めて表示幅で切り詰める', () => {
    expect(sanitizeCardUserNoteInput('あ\nい')).toBe('あ\nい');
    expect(sanitizeCardUserNoteInput(`${'あ'.repeat(98)}\nい`)).toBe(
      `${'あ'.repeat(98)}\nい`,
    );
    expect(sanitizeCardUserNoteInput(`${'あ'.repeat(99)}\nい`)).toBe(
      `${'あ'.repeat(99)}\n`,
    );
  });

  it('finalizeCardUserNote は空白のみなら undefined', () => {
    expect(finalizeCardUserNote('   \n  ')).toBeUndefined();
    expect(finalizeCardUserNote('  メモ  ')).toBe('メモ');
  });

  it('applyUserNoteToCard は空ノートで userNote を除去する', () => {
    const withNote = makeCard({ userNote: '旧メモ' });
    const cleared = applyUserNoteToCard(withNote, '  ');
    expect(cleared.userNote).toBeUndefined();
    expect(hasCardUserNote(cleared)).toBe(false);
  });

  it('applyUserNoteToCard はノートを付与する', () => {
    const card = applyUserNoteToCard(makeCard(), '  新メモ\n2行目  ');
    expect(card.userNote).toBe('新メモ\n2行目');
    expect(hasCardUserNote(card)).toBe(true);
  });
});
