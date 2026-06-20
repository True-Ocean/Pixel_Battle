import { describe, expect, it } from 'vitest';
import {
  canOfferPaletteJewelPurchase,
  getAllJewelPaletteIndices,
  getJewelCostForPaletteIndex,
  isBottomRowJewelPaletteIndex,
  isRightColumnJewelPaletteIndex,
} from './paletteShop';

describe('paletteShop A案', () => {
  it('追加色は12色（下段8 + 右列4）', () => {
    expect(getAllJewelPaletteIndices()).toEqual([
      8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ]);
    expect(getJewelCostForPaletteIndex(10)).toBe(100);
    expect(getJewelCostForPaletteIndex(8)).toBe(100);
  });

  it('下段は上段レベル解放後に購入可能', () => {
    expect(canOfferPaletteJewelPurchase(10, 1)).toBe(true);
    expect(canOfferPaletteJewelPurchase(13, 4)).toBe(false);
    expect(canOfferPaletteJewelPurchase(13, 5)).toBe(true);
  });

  it('右列4色は Lv50 以降', () => {
    expect(isRightColumnJewelPaletteIndex(8)).toBe(true);
    expect(isBottomRowJewelPaletteIndex(10)).toBe(true);
    expect(canOfferPaletteJewelPurchase(8, 49)).toBe(false);
    expect(canOfferPaletteJewelPurchase(8, 50)).toBe(true);
    expect(canOfferPaletteJewelPurchase(18, 50)).toBe(true);
  });
});
