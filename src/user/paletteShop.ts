import type { UserEconomy } from '../types';
import {
  getAllShopPaletteIndices,
  getJewelCostForPaletteIndex,
  getPixelCostForPaletteIndex,
  canOfferPaletteShopPurchase,
  isShopPaletteIndex,
} from '../config/paletteShop';
import {
  isPaletteShopUnlocked,
  normalizePaletteShopUnlocks,
} from '../config/paletteUnlock';
import { spendFreePixels, spendJewels } from './economy';

export { normalizePaletteShopUnlocks };

export function createFullPaletteShopUnlocks(): number[] {
  return [...getAllShopPaletteIndices()];
}

export function canPurchasePaletteIndex(
  index: number,
  userLevel: number,
  shopUnlocks: readonly number[],
): boolean {
  return (
    isShopPaletteIndex(index) &&
    canOfferPaletteShopPurchase(index, userLevel) &&
    !isPaletteShopUnlocked(index, shopUnlocks)
  );
}

export function unlockPaletteWithPixels(
  index: number,
  userLevel: number,
  economy: UserEconomy,
  shopUnlocks: readonly number[],
): { economy: UserEconomy; shopUnlocks: number[] } | null {
  if (!canPurchasePaletteIndex(index, userLevel, shopUnlocks)) return null;
  const cost = getPixelCostForPaletteIndex(index);
  if (cost == null) return null;
  const nextEconomy = spendFreePixels(economy, cost);
  if (!nextEconomy) return null;
  return {
    economy: nextEconomy,
    shopUnlocks: normalizePaletteShopUnlocks([...shopUnlocks, index]),
  };
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
