import { describe, expect, it } from 'vitest';
import {
  getJewelCostForPaletteIndex,
  getPixelCostForPaletteIndex,
  getPaletteShopTier,
  getShopPaletteIndicesByTier,
  PIXEL_COST_PALETTE_SHOP_TIER1,
  PIXEL_COST_PALETTE_SHOP_TIER2,
} from './paletteShop';

describe('paletteShop', () => {
  it('tier1 は紫・濃い緑・茶・赤茶で px2000', () => {
    const tier1 = getShopPaletteIndicesByTier('tier1');
    expect(tier1).toEqual([8, 9, 11, 19]);
    for (const index of tier1) {
      expect(getPaletteShopTier(index)).toBe('tier1');
      expect(getPixelCostForPaletteIndex(index)).toBe(
        PIXEL_COST_PALETTE_SHOP_TIER1,
      );
      expect(getJewelCostForPaletteIndex(index)).toBeNull();
    }
  });

  it('tier2 は薄色系8色で 💎20 または px2200', () => {
    const tier2 = getShopPaletteIndicesByTier('tier2');
    expect(tier2).toEqual([10, 12, 13, 14, 15, 16, 17, 18]);
    for (const index of tier2) {
      expect(getPaletteShopTier(index)).toBe('tier2');
      expect(getPixelCostForPaletteIndex(index)).toBe(
        PIXEL_COST_PALETTE_SHOP_TIER2,
      );
      expect(getJewelCostForPaletteIndex(index)).toBe(20);
    }
  });
});
