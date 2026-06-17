import { PALETTE_16 } from './balance';
import {
  PALETTE_EDITOR_COLOR_COUNT,
  PALETTE_EDITOR_LEVEL_UNLOCK_COUNT,
} from './balance';

/** ショップ色の購入に必要な最低ユーザーレベル */
export const PALETTE_SHOP_MIN_USER_LEVEL = 50;

/** ショップ tier1（各2000px）: 紫・濃い緑・茶・赤茶 */
export const PALETTE_SHOP_TIER1_HEX = [
  '#8844ff',
  '#1a7a3a',
  '#886644',
  '#aa4422',
] as const;

/** ショップ tier2（各💎20 または 2200px）: 薄色系8色 */
export const PALETTE_SHOP_TIER2_HEX = [
  '#aaaaaa',
  '#ffaaaa',
  '#aaccff',
  '#ffffcc',
  '#ccffcc',
  '#ffddaa',
  '#ffccff',
  '#ddccff',
] as const;

export const PALETTE_SHOP_TIER1_COUNT = PALETTE_SHOP_TIER1_HEX.length;
export const PALETTE_SHOP_TIER2_COUNT = PALETTE_SHOP_TIER2_HEX.length;

export const PIXEL_COST_PALETTE_SHOP_TIER1 = 2000;
export const JEWEL_COST_PALETTE_SHOP_TIER2 = 20;
export const PIXEL_COST_PALETTE_SHOP_TIER2 = 2200;

export type PaletteShopTier = 'tier1' | 'tier2';

const TIER1_SET = new Set<string>(
  PALETTE_SHOP_TIER1_HEX.map((color) => color.toLowerCase()),
);
const TIER2_SET = new Set<string>(
  PALETTE_SHOP_TIER2_HEX.map((color) => color.toLowerCase()),
);

function paletteHexAt(index: number): string | null {
  const color = PALETTE_16[index];
  return color ? color.toLowerCase() : null;
}

export function isShopPaletteIndex(index: number): boolean {
  const hex = paletteHexAt(index);
  if (!hex) return false;
  return TIER1_SET.has(hex) || TIER2_SET.has(hex);
}

export function getPaletteShopTier(index: number): PaletteShopTier | null {
  const hex = paletteHexAt(index);
  if (!hex) return null;
  if (TIER1_SET.has(hex)) return 'tier1';
  if (TIER2_SET.has(hex)) return 'tier2';
  return null;
}

export function getPixelCostForPaletteIndex(index: number): number | null {
  const tier = getPaletteShopTier(index);
  if (tier === 'tier1') return PIXEL_COST_PALETTE_SHOP_TIER1;
  if (tier === 'tier2') return PIXEL_COST_PALETTE_SHOP_TIER2;
  return null;
}

export function getJewelCostForPaletteIndex(index: number): number | null {
  if (getPaletteShopTier(index) === 'tier2') {
    return JEWEL_COST_PALETTE_SHOP_TIER2;
  }
  return null;
}

export function canOfferPaletteShopPurchase(
  index: number,
  userLevel: number,
): boolean {
  return (
    isShopPaletteIndex(index) &&
    Math.floor(userLevel) >= PALETTE_SHOP_MIN_USER_LEVEL
  );
}

/** ショップ解放対象の全 index（8〜19 のうちショップ色のみ） */
export function getAllShopPaletteIndices(): readonly number[] {
  const indices: number[] = [];
  for (
    let index = PALETTE_EDITOR_LEVEL_UNLOCK_COUNT;
    index < PALETTE_EDITOR_COLOR_COUNT;
    index++
  ) {
    if (isShopPaletteIndex(index)) indices.push(index);
  }
  return indices;
}

export function getShopPaletteIndicesByTier(
  tier: PaletteShopTier,
): readonly number[] {
  return getAllShopPaletteIndices().filter(
    (index) => getPaletteShopTier(index) === tier,
  );
}
