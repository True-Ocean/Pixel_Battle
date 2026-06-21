import { PALETTE_EDITOR_COLOR_COUNT } from './balance';
import {
  getPaletteLevelUnlockRequirement,
  isPaletteShopUnlocked,
  isPaletteUnlocked,
  isPaletteUnlockedAtLevel,
} from './paletteUnlock';

/** 右2列4色（紫・濃い緑・薄紫・赤茶）の購入に必要なレベル */
export const PALETTE_RIGHT_COLUMN_MIN_USER_LEVEL = 50;

export const JEWEL_COST_PALETTE_EXTRA = 100;

/** 下段 index = 上段 index + 10 */
export const PALETTE_BOTTOM_ROW_OFFSET = 10;

/** 右2列（上段8・9、下段18・19） */
export const PALETTE_RIGHT_COLUMN_INDICES = [8, 9, 18, 19] as const;

export function isBottomRowJewelPaletteIndex(index: number): boolean {
  return index >= 10 && index <= 17;
}

export function isRightColumnJewelPaletteIndex(index: number): boolean {
  return (PALETTE_RIGHT_COLUMN_INDICES as readonly number[]).includes(index);
}

/** 💎 で購入できる追加色 index（8〜19 のうち12色） */
export function isJewelPaletteIndex(index: number): boolean {
  if (index < 0 || index >= PALETTE_EDITOR_COLOR_COUNT) return false;
  return isBottomRowJewelPaletteIndex(index) || isRightColumnJewelPaletteIndex(index);
}

export function getTopPaletteIndexForBottom(bottomIndex: number): number | null {
  if (!isBottomRowJewelPaletteIndex(bottomIndex)) return null;
  return bottomIndex - PALETTE_BOTTOM_ROW_OFFSET;
}

export function getJewelCostForPaletteIndex(index: number): number | null {
  return isJewelPaletteIndex(index) ? JEWEL_COST_PALETTE_EXTRA : null;
}

/** @deprecated px 購入は廃止 */
export function getPixelCostForPaletteIndex(_index: number): number | null {
  return null;
}

export function canOfferPaletteJewelPurchase(
  index: number,
  userLevel: number,
): boolean {
  if (!isJewelPaletteIndex(index)) return false;

  if (isBottomRowJewelPaletteIndex(index)) {
    const topIndex = getTopPaletteIndexForBottom(index);
    return topIndex != null && isPaletteUnlockedAtLevel(topIndex, userLevel);
  }

  if (isRightColumnJewelPaletteIndex(index)) {
    return Math.floor(userLevel) >= PALETTE_RIGHT_COLUMN_MIN_USER_LEVEL;
  }

  return false;
}

/** @deprecated canOfferPaletteJewelPurchase を使用 */
export const PALETTE_SHOP_MIN_USER_LEVEL = PALETTE_RIGHT_COLUMN_MIN_USER_LEVEL;

/** @deprecated A案では tier なし */
export type PaletteShopTier = 'tier1' | 'tier2';

/** @deprecated isJewelPaletteIndex を使用 */
export function isShopPaletteIndex(index: number): boolean {
  return isJewelPaletteIndex(index);
}

/** @deprecated */
export function getPaletteShopTier(_index: number): PaletteShopTier | null {
  return null;
}

export function getAllJewelPaletteIndices(): readonly number[] {
  const indices: number[] = [];
  for (let index = 0; index < PALETTE_EDITOR_COLOR_COUNT; index++) {
    if (isJewelPaletteIndex(index)) indices.push(index);
  }
  return indices;
}

/** @deprecated getAllJewelPaletteIndices を使用 */
export function getAllShopPaletteIndices(): readonly number[] {
  return getAllJewelPaletteIndices();
}

export type PaletteUnlockModalMode =
  | { kind: 'purchase'; jewelCost: number }
  | { kind: 'level'; unlockLevel: number }
  | { kind: 'jewel_after_color'; prerequisiteIndex: number; jewelCost: number }
  | { kind: 'jewel_after_level'; minLevel: number; jewelCost: number };

/** 未解放パレットタップ時のモーダル表示種別 */
export function getPaletteUnlockModalMode(
  paletteIndex: number,
  userLevel: number,
  shopUnlocks: readonly number[],
): PaletteUnlockModalMode | null {
  if (isPaletteUnlocked(paletteIndex, userLevel, shopUnlocks)) return null;

  const jewelCost = getJewelCostForPaletteIndex(paletteIndex);

  if (
    isJewelPaletteIndex(paletteIndex) &&
    canOfferPaletteJewelPurchase(paletteIndex, userLevel) &&
    !isPaletteShopUnlocked(paletteIndex, shopUnlocks) &&
    jewelCost != null
  ) {
    return { kind: 'purchase', jewelCost };
  }

  if (isJewelPaletteIndex(paletteIndex) && jewelCost != null) {
    if (isBottomRowJewelPaletteIndex(paletteIndex)) {
      const topIndex = getTopPaletteIndexForBottom(paletteIndex);
      if (topIndex != null && !isPaletteUnlockedAtLevel(topIndex, userLevel)) {
        return { kind: 'jewel_after_color', prerequisiteIndex: topIndex, jewelCost };
      }
    }
    if (
      isRightColumnJewelPaletteIndex(paletteIndex) &&
      Math.floor(userLevel) < PALETTE_RIGHT_COLUMN_MIN_USER_LEVEL
    ) {
      return {
        kind: 'jewel_after_level',
        minLevel: PALETTE_RIGHT_COLUMN_MIN_USER_LEVEL,
        jewelCost,
      };
    }
  }

  const unlockLevel = getPaletteLevelUnlockRequirement(paletteIndex);
  if (unlockLevel != null && userLevel < unlockLevel) {
    return { kind: 'level', unlockLevel };
  }

  return null;
}

/** @deprecated */
export function getShopPaletteIndicesByTier(
  _tier: PaletteShopTier,
): readonly number[] {
  return [];
}
