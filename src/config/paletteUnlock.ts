import {
  PALETTE_16,
  PALETTE_EDITOR_COLOR_COUNT,
  PALETTE_PLAYABLE_COUNT,
  PALETTE_UNLOCKED_COUNT_LV0,
} from './balance';

/** 追加色の解放レベル（index 3〜9 に対応。黄は Lv15、以降5刻み） */
export const PALETTE_UNLOCK_LEVELS = [5, 15, 20, 25, 30, 55, 65] as const;

/** ユーザーレベルに応じた解放パレット色数（index 0 から連続） */
export function getUnlockedPaletteCount(userLevel: number): number {
  const level = Math.max(1, Math.floor(userLevel));
  let count = PALETTE_UNLOCKED_COUNT_LV0;
  for (const unlockLevel of PALETTE_UNLOCK_LEVELS) {
    if (level >= unlockLevel) count++;
    else break;
  }
  return Math.min(count, PALETTE_PLAYABLE_COUNT);
}

export function isPaletteUnlockedAtLevel(
  paletteIndex: number,
  userLevel: number,
): boolean {
  if (paletteIndex < 0 || paletteIndex >= PALETTE_PLAYABLE_COUNT) return false;
  return paletteIndex < getUnlockedPaletteCount(userLevel);
}

export function isPaletteColorUnlockedAtLevel(
  color: string,
  userLevel: number,
): boolean {
  const normalized = color.toLowerCase();
  const index = PALETTE_16.findIndex(
    (paletteColor) => paletteColor.toLowerCase() === normalized,
  );
  if (index < 0 || index >= PALETTE_EDITOR_COLOR_COUNT) return false;
  return isPaletteUnlockedAtLevel(index, userLevel);
}
