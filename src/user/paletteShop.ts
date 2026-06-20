import type { UserEconomy } from '../types';
import {
  canOfferPaletteJewelPurchase,
  getJewelCostForPaletteIndex,
  isJewelPaletteIndex,
} from '../config/paletteShop';
import {
  isPaletteShopUnlocked,
  normalizePaletteShopUnlocks,
} from '../config/paletteUnlock';
import { spendJewels } from './economy';

export { normalizePaletteShopUnlocks };

export function createFullPaletteShopUnlocks(): number[] {
  const indices: number[] = [];
  for (let index = 0; index < 20; index++) {
    if (isJewelPaletteIndex(index)) indices.push(index);
  }
  return indices;
}

export function canPurchasePaletteIndex(
  index: number,
  userLevel: number,
  shopUnlocks: readonly number[],
): boolean {
  return (
    isJewelPaletteIndex(index) &&
    canOfferPaletteJewelPurchase(index, userLevel) &&
    !isPaletteShopUnlocked(index, shopUnlocks)
  );
}

export function unlockPaletteWithJewels(
  index: number,
  userLevel: number,
  economy: UserEconomy,
  shopUnlocks: readonly number[],
): { economy: UserEconomy; shopUnlocks: number[] } | null {
  if (!canPurchasePaletteIndex(index, userLevel, shopUnlocks)) return null;
  const cost = getJewelCostForPaletteIndex(index);
  if (cost == null) return null;
  const nextEconomy = spendJewels(economy, cost);
  if (!nextEconomy) return null;
  return {
    economy: nextEconomy,
    shopUnlocks: normalizePaletteShopUnlocks([...shopUnlocks, index]),
  };
}

/** @deprecated unlockPaletteWithJewels を使用 */
export function unlockPaletteWithPixels(
  index: number,
  userLevel: number,
  economy: UserEconomy,
  shopUnlocks: readonly number[],
): { economy: UserEconomy; shopUnlocks: number[] } | null {
  void index;
  void userLevel;
  void economy;
  void shopUnlocks;
  return null;
}
