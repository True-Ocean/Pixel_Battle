import { gridSize } from '../canvas';
import { applyRarityToBp, computeCardBaseBp, PALETTE_16 } from '../config/balance';
import { calcLimitBreakBpGain } from '../config/economy';
import { buildUnlockedColorSet } from '../config/paletteUnlock';
import type { Card, PixelGrid } from '../types';
import { computeColorRatios } from './colors';
import type { ColorRatios } from './colors';
import { buildPixelSeed, hashToUnit } from './hash';

const FULL_PALETTE_COLOR_SET = new Set(
  PALETTE_16.map((color) => color.toLowerCase()),
);
const RATIO_RED = PALETTE_16[2]!.toLowerCase();
const RATIO_WHITE = PALETTE_16[0]!.toLowerCase();
const RATIO_BLACK = PALETTE_16[1]!.toLowerCase();

/** パレット外色を含む既存セーブ向け: 非 null マスを塗りとして密度を算出 */
function computeAnyPaintedColorRatios(
  pixels: PixelGrid,
  totalCells: number,
): ColorRatios | null {
  let red = 0;
  let white = 0;
  let black = 0;
  let painted = 0;

  for (const row of pixels) {
    for (const cell of row) {
      if (cell == null || cell === '') continue;
      painted++;
      const c = cell.toLowerCase();
      if (c === RATIO_RED) red++;
      else if (c === RATIO_WHITE) white++;
      else if (c === RATIO_BLACK) black++;
    }
  }

  if (painted === 0) return null;

  return {
    r: red / painted,
    w: white / painted,
    b: black / painted,
    painted,
    density: painted / totalCells,
    totalCells,
  };
}

function computeCardColorRatios(
  card: Card,
  userLevel: number,
  paletteShopUnlocks: readonly number[],
): ColorRatios | null {
  const size = gridSize(card.pixels);
  const totalCells = size * size;
  const allowedColors = buildUnlockedColorSet(userLevel, paletteShopUnlocks);
  const ratios = computeColorRatios(card.pixels, totalCells, allowedColors);
  if (ratios) return ratios;
  const fullPalette = computeColorRatios(
    card.pixels,
    totalCells,
    FULL_PALETTE_COLOR_SET,
  );
  if (fullPalette) return fullPalette;
  return computeAnyPaintedColorRatios(card.pixels, totalCells);
}

/** 現レア内の限界突破回数（★の数のみ。レア到達分はレア帯で表現） */
export function countLimitBreaks(card: Pick<Card, 'stars'>): number {
  return card.stars;
}

export function computeBpBlend(
  pixels: PixelGrid,
  ratios: { density: number },
): number {
  const seed = buildPixelSeed(pixels);
  const hashBp = hashToUnit(seed, 'hp');
  return ratios.density * 0.55 + hashBp * 0.45;
}

/** bpBlend からレア・限界突破込みの BP を算出 */
export function computeBpFromBlend(
  bpBlend: number,
  userLevel: number,
  card: Pick<Card, 'attribute' | 'rarity' | 'stars'>,
): number {
  const baseBp = computeCardBaseBp(bpBlend, userLevel, card.attribute);
  const rarityBp = applyRarityToBp(baseBp, card.attribute, card.rarity, userLevel);
  const limitBreakCount = countLimitBreaks(card);
  if (limitBreakCount === 0) return rarityBp;
  return rarityBp + calcLimitBreakBpGain(baseBp) * limitBreakCount;
}

/** レア・限界突破・レベル・属性での BP 上限（bpBlend = 1） */
export function getCardBpCeiling(
  card: Pick<Card, 'attribute' | 'rarity' | 'stars'>,
  userLevel: number,
): number {
  return computeBpFromBlend(1, userLevel, card);
}

export function computeNaturalCardBp(
  card: Card,
  userLevel: number,
  paletteShopUnlocks: readonly number[] = [],
): number {
  const ceiling = getCardBpCeiling(card, userLevel);
  const ratios = computeCardColorRatios(card, userLevel, paletteShopUnlocks);
  if (!ratios) {
    return Math.min(card.bp, ceiling);
  }

  const bpBlend = computeBpBlend(card.pixels, ratios);
  return Math.min(computeBpFromBlend(bpBlend, userLevel, card), ceiling);
}

/** BP 計算式を変更したら +1（セーブ読み込み時の一括再計算トリガー） */
export const BP_CALC_VERSION = 2;

/** ロード時: 現行式で BP を上書き（下がる場合もある） */
export function applyLoadBpRecalc(
  card: Card,
  userLevel: number,
  paletteShopUnlocks: readonly number[] = [],
): Card {
  return {
    ...card,
    bp: computeNaturalCardBp(card, userLevel, paletteShopUnlocks),
  };
}

/** 編集保存: 下振れなし・上限まで（上限超えの legacy BP は上限で floor） */
export function clampEditBp(
  previousBp: number,
  recalculatedBp: number,
  ceiling: number,
): number {
  const cappedRecalc = Math.min(recalculatedBp, ceiling);
  const floorBp = Math.min(previousBp, ceiling);
  return Math.min(ceiling, Math.max(floorBp, cappedRecalc));
}

export interface RescaleCardBpOptions {
  previousLevel?: number;
}

/**
 * ユーザーレベルに合わせて BP を再算出。
 * previousLevel < userLevel のときは上限に対する位置を維持し、BP を下げない。
 */
export function rescaleCardBp(
  card: Card,
  userLevel: number,
  paletteShopUnlocks: readonly number[] = [],
  options: RescaleCardBpOptions = {},
): number {
  const previousLevel = options.previousLevel;
  const newNatural = computeNaturalCardBp(card, userLevel, paletteShopUnlocks);
  const newCeiling = getCardBpCeiling(card, userLevel);

  if (
    previousLevel == null ||
    userLevel <= previousLevel
  ) {
    return newNatural;
  }

  const oldBp = card.bp;
  const oldCeiling = getCardBpCeiling(card, previousLevel);
  if (oldBp > oldCeiling) {
    return Math.min(newCeiling, newNatural);
  }

  const progress = oldCeiling > 0 ? Math.min(1, oldBp / oldCeiling) : 1;
  const progressBp = Math.round(newCeiling * progress);

  const candidate = Math.min(newCeiling, Math.max(newNatural, progressBp));
  return Math.min(newCeiling, Math.max(oldBp, candidate));
}

export function pixelGridsEqual(a: PixelGrid, b: PixelGrid): boolean {
  if (gridSize(a) !== gridSize(b)) return false;
  for (let y = 0; y < a.length; y++) {
    const rowA = a[y]!;
    const rowB = b[y]!;
    for (let x = 0; x < rowA.length; x++) {
      if (rowA[x] !== rowB[x]) return false;
    }
  }
  return true;
}
