import {
  PALETTE_16,
  USER_INITIAL_LEVEL,
  computeCardBaseBp,
} from '../config/balance';
import {
  buildUnlockedColorSet,
  getUnlockedPaletteCount,
  getUnlockedPaletteIndices,
} from '../config/paletteUnlock';
import { gridSize } from '../canvas';
import type { Attribute, Card, PixelGrid } from '../types';
import { computeColorRatios, normalizePixelColor } from './colors';
import type { ColorRatios } from './colors';
import { rollAttribute } from './rollAttribute';
import { rollRarity } from './rarity';
import { createId } from '../utils/createId';
import {
  finalizeCardNameForCreation,
  validateCardNameForCreation,
} from './cardNameInput';
import {
  clampEditBp,
  computeBpBlend,
  computeBpFromBlend,
  computeNaturalCardBp,
  getCardBpCeiling,
  pixelGridsEqual,
  rescaleCardBp,
} from './bpRules';

export interface CardDraft {
  attribute: Attribute;
  bp: number;
  ratios: NonNullable<ReturnType<typeof computeColorRatios>>;
}

export interface DeriveCardStatsOptions {
  /** 開発・テスト用: 抽選をスキップして属性を固定 */
  forceAttribute?: Attribute;
  random?: () => number;
}

export interface CreateCardOptions extends DeriveCardStatsOptions {
  userLevel?: number;
  /** @deprecated buildUnlockedColorSet(userLevel, paletteShopUnlocks) を使用 */
  unlockedPaletteCount?: number;
  paletteShopUnlocks?: readonly number[];
  canvasSize?: number;
  random?: () => number;
}

export class CardCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardCreationError';
  }
}

function validateDrawingInput(
  name: string,
  pixels: PixelGrid,
  allowedColors: ReadonlySet<string>,
): { trimmed: string; ratios: ColorRatios } {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new CardCreationError('カード名を入力してください');
  }

  const size = gridSize(pixels);
  const totalCells = size * size;
  const ratios = computeColorRatios(pixels, totalCells, allowedColors);
  if (!ratios) {
    throw new CardCreationError('1マス以上塗ってください');
  }

  return { trimmed, ratios };
}

function resolvePaletteUnlock(
  userLevel: number,
  options: {
    unlockedPaletteCount?: number;
    paletteShopUnlocks?: readonly number[];
  } = {},
): {
  allowedColors: ReadonlySet<string>;
  unlockedIndices: readonly number[];
} {
  if (options.paletteShopUnlocks != null) {
    return {
      allowedColors: buildUnlockedColorSet(
        userLevel,
        options.paletteShopUnlocks,
      ),
      unlockedIndices: getUnlockedPaletteIndices(
        userLevel,
        options.paletteShopUnlocks,
      ),
    };
  }
  const count = options.unlockedPaletteCount ?? getUnlockedPaletteCount(userLevel);
  const unlockedIndices = Array.from({ length: count }, (_, index) => index);
  return {
    allowedColors: new Set(
      unlockedIndices.map((index) => PALETTE_16[index]!.toLowerCase()),
    ),
    unlockedIndices,
  };
}

export function deriveCardStats(
  name: string,
  pixels: PixelGrid,
  userLevel: number = USER_INITIAL_LEVEL,
  options: DeriveCardStatsOptions & {
    unlockedPaletteCount?: number;
    paletteShopUnlocks?: readonly number[];
  } = {},
): CardDraft {
  const { allowedColors } = resolvePaletteUnlock(userLevel, options);
  const { trimmed, ratios } = validateDrawingInput(name, pixels, allowedColors);
  const attribute =
    options.forceAttribute ?? rollAttribute(userLevel, options.random);
  const bpBlend = computeBpBlend(pixels, ratios);
  const bp = computeCardBaseBp(bpBlend, userLevel, attribute);

  return { attribute, bp, ratios };
}

function normalizeGrid(
  pixels: PixelGrid,
  allowedColors: ReadonlySet<string>,
): PixelGrid {
  return pixels.map((row) =>
    row.map((c) => normalizePixelColor(c, allowedColors)),
  );
}

export function createCardFromDrawing(
  name: string,
  pixels: PixelGrid,
  options: CreateCardOptions = {},
): Card {
  const nameError = validateCardNameForCreation(name);
  if (nameError) {
    throw new CardCreationError(nameError);
  }
  const finalName = finalizeCardNameForCreation(name);

  const userLevel = options.userLevel ?? USER_INITIAL_LEVEL;
  const { allowedColors, unlockedIndices } = resolvePaletteUnlock(
    userLevel,
    options,
  );
  const normalized = normalizeGrid(pixels, allowedColors);
  const { attribute, bp, ratios } = deriveCardStats(finalName, normalized, userLevel, {
    forceAttribute: options.forceAttribute,
    random: options.random,
    paletteShopUnlocks: options.paletteShopUnlocks,
    unlockedPaletteCount: options.unlockedPaletteCount,
  });
  const rarity = rollRarity(
    ratios,
    normalized,
    unlockedIndices,
    options.random,
  );
  const bpBlend = computeBpBlend(normalized, ratios);
  const finalBp = computeBpFromBlend(bpBlend, userLevel, {
    attribute,
    rarity,
    stars: 0,
  });

  const canvasSize = options.canvasSize ?? gridSize(normalized);

  return {
    id: createId(),
    name: finalName,
    pixels: normalized,
    canvasSize,
    attribute,
    bp: finalBp,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity,
    stars: 0,
    status: 'active',
    talismanEquipped: false,
    createdAt: new Date().toISOString(),
  };
}

/** 絵から基礎BPのみ算出（レア・★倍率なし） */
export function getCardFoundationBp(
  card: Card,
  userLevel: number,
  paletteShopUnlocks: readonly number[] = [],
): number {
  const size = gridSize(card.pixels);
  const allowedColors = buildUnlockedColorSet(userLevel, paletteShopUnlocks);
  const ratios = computeColorRatios(card.pixels, size * size, allowedColors);
  if (!ratios) return card.bp;

  const bpBlend = computeBpBlend(card.pixels, ratios);
  return computeCardBaseBp(bpBlend, userLevel, card.attribute);
}

/** 既存カードの BP をユーザーレベルに合わせて再算出 */
export function recalculateCardBp(
  card: Card,
  userLevel: number,
  paletteShopUnlocks: readonly number[] = [],
  options?: { previousLevel?: number },
): number {
  return rescaleCardBp(card, userLevel, paletteShopUnlocks, options);
}

export function rescaleDeckBp(
  deck: Card[],
  userLevel: number,
  paletteShopUnlocks: readonly number[] = [],
  options?: { previousLevel?: number },
): Card[] {
  return deck.map((card) => ({
    ...card,
    bp: rescaleCardBp(card, userLevel, paletteShopUnlocks, options),
  }));
}

/** 既存カードの見た目・名前を更新（属性・レア・戦績等は維持、BPのみ再算出。限界突破済みのBP加算も維持） */
export function updateCardFromDrawing(
  existing: Card,
  name: string,
  pixels: PixelGrid,
  userLevel: number = USER_INITIAL_LEVEL,
  paletteUnlock: {
    unlockedPaletteCount?: number;
    paletteShopUnlocks?: readonly number[];
  } = {},
): Card {
  const nameError = validateCardNameForCreation(name);
  if (nameError) {
    throw new CardCreationError(nameError);
  }
  const finalName = finalizeCardNameForCreation(name);

  const { allowedColors } = resolvePaletteUnlock(userLevel, paletteUnlock);
  const normalized = normalizeGrid(pixels, allowedColors);
  validateDrawingInput(finalName, normalized, allowedColors);

  const imageUnchanged = pixelGridsEqual(existing.pixels, normalized);
  const bp = imageUnchanged
    ? existing.bp
    : clampEditBp(
        existing.bp,
        computeNaturalCardBp(
          { ...existing, name: finalName, pixels: normalized },
          userLevel,
          paletteUnlock.paletteShopUnlocks ?? [],
        ),
        getCardBpCeiling(existing, userLevel),
      );

  return {
    ...existing,
    name: finalName,
    pixels: normalized,
    canvasSize: gridSize(normalized),
    bp,
  };
}
