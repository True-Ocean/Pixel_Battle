import {
  CARD_NAME_MAX_HALF_UNITS,
  CARD_NAME_MAX_LENGTH,
} from '../config/balance';

/** 半角1・全角2 の幅単位で1文字分を返す */
export function getCardNameCharHalfUnits(char: string): number {
  const code = char.codePointAt(0);
  if (code == null) return 0;
  if (code <= 0x007f || code === 0x00a5) return 1;
  if (code >= 0xff61 && code <= 0xff9f) return 1;
  return 2;
}

export function getCardNameHalfUnits(text: string): number {
  let units = 0;
  for (const char of text) {
    units += getCardNameCharHalfUnits(char);
  }
  return units;
}

export function truncateCardNameByDisplayWidth(
  raw: string,
  maxHalfUnits: number = CARD_NAME_MAX_HALF_UNITS,
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

export function sanitizeCardNameInput(raw: string): string {
  return truncateCardNameByDisplayWidth(raw);
}

/** 保存時に使う最終カード名（前後空白除去 + 表示幅制限） */
export function finalizeCardNameForCreation(raw: string): string {
  return truncateCardNameByDisplayWidth(raw.trim());
}

export function validateCardNameForCreation(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 'カード名を入力してください';
  }
  if (getCardNameHalfUnits(trimmed) > CARD_NAME_MAX_HALF_UNITS) {
    return `カード名は全角${CARD_NAME_MAX_LENGTH}文字以内にしてください`;
  }
  return null;
}
