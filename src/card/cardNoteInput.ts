import {
  CARD_USER_NOTE_MAX_HALF_UNITS,
  CARD_USER_NOTE_MAX_LENGTH,
} from '../config/balance';
import type { Card } from '../types';
import { getCardNameCharHalfUnits, getCardNameHalfUnits } from './cardNameInput';

export function truncateCardUserNoteByDisplayWidth(
  raw: string,
  maxHalfUnits: number = CARD_USER_NOTE_MAX_HALF_UNITS,
): string {
  let units = 0;
  let result = '';
  for (const char of raw) {
    const charUnits = getCardNameCharHalfUnits(char);
    if (units + charUnits > maxHalfUnits) break;
    units += charUnits;
    result += char;
  }
  return result;
}

export function sanitizeCardUserNoteInput(raw: string): string {
  return truncateCardUserNoteByDisplayWidth(raw);
}

/** 保存時に使う最終ノート（前後空白除去 + 表示幅制限）。空なら undefined */
export function finalizeCardUserNote(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return truncateCardUserNoteByDisplayWidth(trimmed);
}

export function getCardUserNoteHalfUnits(text: string): number {
  return getCardNameHalfUnits(text);
}

export function hasCardUserNote(card: Pick<Card, 'userNote'>): boolean {
  return finalizeCardUserNote(card.userNote ?? '') != null;
}

export function applyUserNoteToCard(card: Card, raw: string): Card {
  const userNote = finalizeCardUserNote(raw);
  if (userNote) {
    return { ...card, userNote };
  }
  const next = { ...card };
  delete next.userNote;
  return next;
}

export function formatCardUserNoteLimitLabel(): string {
  return `全角${CARD_USER_NOTE_MAX_LENGTH}文字まで`;
}
