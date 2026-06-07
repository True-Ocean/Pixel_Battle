import { PALETTE_UNLOCKED_COUNT_LV0 } from './balance';

/** ユーザーレベルに応じた解放パレット色数（将来拡張） */
export function getUnlockedPaletteCount(userLevel: number): number {
  void userLevel;
  return PALETTE_UNLOCKED_COUNT_LV0;
}
