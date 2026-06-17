import { describe, expect, it } from 'vitest';
import { PALETTE_16, PALETTE_16_SCHEMA_4 } from '../config/balance';
import { PALETTE_COLOR_LABELS } from '../config/palette';
import {
  migratePaletteShopUnlocksByColor,
  migratePaletteShopUnlocksForSchema,
  normalizePaletteShopUnlocks,
} from '../config/paletteUnlock';

describe('palette layout', () => {
  it('青の下は薄青、濃い緑の下は赤茶', () => {
    expect(PALETTE_COLOR_LABELS[3]).toBe('青');
    expect(PALETTE_COLOR_LABELS[13]).toBe('薄青');
    expect(PALETTE_16[13]).toBe('#aaccff');
    expect(PALETTE_COLOR_LABELS[9]).toBe('濃い緑');
    expect(PALETTE_COLOR_LABELS[19]).toBe('赤茶');
    expect(PALETTE_16[19]).toBe('#aa4422');
    expect(PALETTE_16).not.toContain('#44dddd');
  });

  it('schema v4 から廃止色の解放を後継色へ移行する', () => {
    const migrated = migratePaletteShopUnlocksByColor(
      [9, 13],
      PALETTE_16_SCHEMA_4,
    );
    expect(migrated).toEqual([9, 13]);
    expect(normalizePaletteShopUnlocks(migrated)).toEqual([9, 13]);
  });

  it('水色の解放は薄青へ、黄緑は濃い緑へ', () => {
    expect(
      migratePaletteShopUnlocksByColor([9, 13], PALETTE_16_SCHEMA_4),
    ).toEqual([9, 13]);
    const waterIndex = PALETTE_16_SCHEMA_4.indexOf('#44dddd');
    const limeIndex = PALETTE_16_SCHEMA_4.indexOf('#88cc44');
    expect(
      migratePaletteShopUnlocksForSchema([waterIndex, limeIndex], 4, 5),
    ).toEqual([9, 13]);
  });
});
