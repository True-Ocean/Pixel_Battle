import {
  PALETTE_16,
  PALETTE_16_LEGACY_ORDER,
  PALETTE_16_SCHEMA_3,
  PALETTE_16_SCHEMA_4,
  PALETTE_EDITOR_COLOR_COUNT,
  PALETTE_EDITOR_LEVEL_UNLOCK_COUNT,
  PALETTE_UNLOCKED_COUNT_LV0,
} from './balance';
import {
  canOfferPaletteJewelPurchase,
  isJewelPaletteIndex,
  isRightColumnJewelPaletteIndex,
  PALETTE_RIGHT_COLUMN_MIN_USER_LEVEL,
} from './paletteShop';

/** 追加色の解放レベル（L≡5 mod 10: 5, 15, 25, 35, 45） */
export const PALETTE_UNLOCK_LEVELS = [5, 15, 25, 35, 45] as const;

/** ユーザーレベルに応じたレベル解放パレット色数（index 0 から連続） */
export function getUnlockedPaletteCount(userLevel: number): number {
  const level = Math.max(1, Math.floor(userLevel));
  let count = PALETTE_UNLOCKED_COUNT_LV0;
  for (const unlockLevel of PALETTE_UNLOCK_LEVELS) {
    if (level >= unlockLevel) count++;
    else break;
  }
  return Math.min(count, PALETTE_EDITOR_LEVEL_UNLOCK_COUNT);
}

export function isPaletteUnlockedAtLevel(
  paletteIndex: number,
  userLevel: number,
): boolean {
  if (paletteIndex < 0 || paletteIndex >= PALETTE_EDITOR_LEVEL_UNLOCK_COUNT) {
    return false;
  }
  return paletteIndex < getUnlockedPaletteCount(userLevel);
}

export function normalizePaletteShopUnlocks(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const next: number[] = [];
  for (const value of raw) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const index = Math.floor(value);
    if (!isShopPaletteIndex(index) || seen.has(index)) continue;
    seen.add(index);
    next.push(index);
  }
  return next.sort((a, b) => a - b);
}

/** 廃止色のショップ解放 → 後継色（移行用） */
const PALETTE_SHOP_COLOR_SUCCESSORS: Record<string, string> = {
  '#44dddd': '#aaccff',
  '#88cc44': '#1a7a3a',
};

function resolveShopPaletteIndex(hex: string): number {
  const normalized = hex.toLowerCase();
  let index = PALETTE_16.findIndex(
    (color) => color.toLowerCase() === normalized,
  );
  if (index >= 0 && isShopPaletteIndex(index)) return index;

  const successor = PALETTE_SHOP_COLOR_SUCCESSORS[normalized];
  if (!successor) return -1;
  index = PALETTE_16.findIndex(
    (color) => color.toLowerCase() === successor,
  );
  if (index >= 0 && isShopPaletteIndex(index)) return index;
  return -1;
}

/** 保存済みパレット順の index を現行 index に移行（色コードで対応） */
export function migratePaletteShopUnlocksByColor(
  raw: unknown,
  fromPalette: readonly string[],
): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const next: number[] = [];
  for (const value of raw) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const legacyIndex = Math.floor(value);
    const hex = fromPalette[legacyIndex]?.toLowerCase();
    if (!hex) continue;
    const index = resolveShopPaletteIndex(hex);
    if (index < 0 || seen.has(index)) continue;
    seen.add(index);
    next.push(index);
  }
  return next.sort((a, b) => a - b);
}

/** @deprecated migratePaletteShopUnlocksForSchema を使用 */
export function migratePaletteShopUnlocksFromLegacy(
  raw: unknown,
): number[] {
  return migratePaletteShopUnlocksByColor(raw, PALETTE_16_LEGACY_ORDER);
}

export function migratePaletteShopUnlocksForSchema(
  raw: unknown,
  savedSchemaVersion: number,
  currentSchemaVersion: number,
): number[] {
  if (savedSchemaVersion >= currentSchemaVersion) {
    return normalizePaletteShopUnlocks(raw);
  }
  const sourcePalette =
    savedSchemaVersion >= 4
      ? PALETTE_16_SCHEMA_4
      : savedSchemaVersion >= 3
        ? PALETTE_16_SCHEMA_3
        : PALETTE_16_LEGACY_ORDER;
  return migratePaletteShopUnlocksByColor(raw, sourcePalette);
}

export function isPaletteShopUnlocked(
  paletteIndex: number,
  shopUnlocks: readonly number[],
): boolean {
  return shopUnlocks.includes(paletteIndex);
}

/** レベル解放 + ショップ解放を合わせた利用可能 index */
export function getUnlockedPaletteIndices(
  userLevel: number,
  shopUnlocks: readonly number[] = [],
): readonly number[] {
  const levelCount = getUnlockedPaletteCount(userLevel);
  const indices: number[] = [];
  for (let i = 0; i < levelCount; i++) indices.push(i);
  for (const index of normalizePaletteShopUnlocks(shopUnlocks)) {
    if (!indices.includes(index)) indices.push(index);
  }
  return indices;
}

export function countUnlockedPaletteColors(
  userLevel: number,
  shopUnlocks: readonly number[] = [],
): number {
  return getUnlockedPaletteIndices(userLevel, shopUnlocks).length;
}

export function buildUnlockedColorSet(
  userLevel: number,
  shopUnlocks: readonly number[] = [],
): ReadonlySet<string> {
  const indices = getUnlockedPaletteIndices(userLevel, shopUnlocks);
  return new Set(
    indices.map((index) => PALETTE_16[index]!.toLowerCase()),
  );
}

export function isPaletteUnlocked(
  paletteIndex: number,
  userLevel: number,
  shopUnlocks: readonly number[] = [],
): boolean {
  if (paletteIndex < 0 || paletteIndex >= PALETTE_EDITOR_COLOR_COUNT) {
    return false;
  }
  if (paletteIndex < PALETTE_EDITOR_LEVEL_UNLOCK_COUNT) {
    return isPaletteUnlockedAtLevel(paletteIndex, userLevel);
  }
  if (!isJewelPaletteIndex(paletteIndex)) return false;
  if (!isPaletteShopUnlocked(paletteIndex, shopUnlocks)) return false;
  return canOfferPaletteJewelPurchase(paletteIndex, userLevel);
}

export function canOfferPaletteShopPurchase(
  index: number,
  userLevel: number,
): boolean {
  return canOfferPaletteJewelPurchase(index, userLevel);
}

/** @deprecated isJewelPaletteIndex を使用 */
export function isShopPaletteIndex(index: number): boolean {
  return isJewelPaletteIndex(index);
}

export function isPaletteColorUnlocked(
  color: string,
  userLevel: number,
  shopUnlocks: readonly number[] = [],
): boolean {
  const normalized = color.toLowerCase();
  const index = PALETTE_16.findIndex(
    (paletteColor) => paletteColor.toLowerCase() === normalized,
  );
  if (index < 0) return false;
  return isPaletteUnlocked(index, userLevel, shopUnlocks);
}

/** @deprecated isPaletteColorUnlocked を使用 */
export function isPaletteColorUnlockedAtLevel(
  color: string,
  userLevel: number,
): boolean {
  return isPaletteColorUnlocked(color, userLevel);
}
