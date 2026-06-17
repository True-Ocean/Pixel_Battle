import {
  BLACK_ATTACK_WEIGHT,
  COLOR_WEIGHT,
  HASH_WEIGHT,
  USER_INITIAL_LEVEL,
  applyRarityToBp,
  computeCardBaseBp,
} from '../config/balance';
import { getUnlockedAttributes } from '../config/attributeUnlock';
import { getUnlockedPaletteCount } from '../config/paletteUnlock';
import { gridSize } from '../canvas';
import type { Attribute, Card, PixelGrid } from '../types';
import { computeColorRatios, normalizePixelColor } from './colors';
import type { ColorRatios } from './colors';
import { buildCardSeed, hashToUnit } from './hash';
import { rollRarity } from './rarity';
import { createId } from '../utils/createId';
import {
  finalizeCardNameForCreation,
  validateCardNameForCreation,
} from './cardNameInput';
import { calcLimitBreakBpGain } from '../config/economy';

export interface CardDraft {
  attribute: Attribute;
  bp: number;
  ratios: NonNullable<ReturnType<typeof computeColorRatios>>;
}

export interface DeriveCardStatsOptions {
  /** 開発・テスト用: 抽選をスキップして属性を固定 */
  forceAttribute?: Attribute;
}

export interface CreateCardOptions extends DeriveCardStatsOptions {
  userLevel?: number;
  unlockedPaletteCount?: number;
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
  unlockedPaletteCount: number,
): { trimmed: string; ratios: ColorRatios } {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new CardCreationError('カード名を入力してください');
  }

  const size = gridSize(pixels);
  const totalCells = size * size;
  const ratios = computeColorRatios(pixels, totalCells, unlockedPaletteCount);
  if (!ratios) {
    throw new CardCreationError('1マス以上塗ってください');
  }

  return { trimmed, ratios };
}

function computeBpBlend(
  trimmed: string,
  pixels: PixelGrid,
  ratios: ColorRatios,
): number {
  const seed = buildCardSeed(trimmed, pixels);
  const hashBp = hashToUnit(seed, 'hp');
  return ratios.density * 0.55 + hashBp * 0.45;
}

function attributeScore(
  attribute: Attribute,
  seed: string,
  ratios: ColorRatios,
): number {
  switch (attribute) {
    case 'attack': {
      const colorAttack = ratios.r + ratios.b * BLACK_ATTACK_WEIGHT;
      const hashAttack = hashToUnit(seed, 'attack');
      return colorAttack * COLOR_WEIGHT + hashAttack * HASH_WEIGHT;
    }
    case 'defense': {
      const colorDefense = ratios.w + ratios.b * (1 - BLACK_ATTACK_WEIGHT);
      const hashDefense = hashToUnit(seed, 'defense');
      return colorDefense * COLOR_WEIGHT + hashDefense * HASH_WEIGHT;
    }
    default:
      return hashToUnit(seed, attribute);
  }
}

function deriveAttribute(
  trimmed: string,
  pixels: PixelGrid,
  ratios: ColorRatios,
  userLevel: number,
): Attribute {
  const seed = buildCardSeed(trimmed, pixels);
  const candidates = getUnlockedAttributes(userLevel);

  let best = candidates[0]!;
  let bestScore = attributeScore(best, seed, ratios);
  for (let i = 1; i < candidates.length; i++) {
    const attribute = candidates[i]!;
    const score = attributeScore(attribute, seed, ratios);
    if (score > bestScore) {
      bestScore = score;
      best = attribute;
    }
  }
  return best;
}

export function deriveCardStats(
  name: string,
  pixels: PixelGrid,
  userLevel: number = USER_INITIAL_LEVEL,
  options: DeriveCardStatsOptions = {},
): CardDraft {
  const unlockedPaletteCount = getUnlockedPaletteCount(userLevel);
  const { trimmed, ratios } = validateDrawingInput(
    name,
    pixels,
    unlockedPaletteCount,
  );
  const attribute =
    options.forceAttribute ??
    deriveAttribute(trimmed, pixels, ratios, userLevel);
  const bpBlend = computeBpBlend(trimmed, pixels, ratios);
  const bp = computeCardBaseBp(bpBlend, userLevel, attribute);

  return { attribute, bp, ratios };
}

function normalizeGrid(
  pixels: PixelGrid,
  unlockedPaletteCount: number,
): PixelGrid {
  return pixels.map((row) =>
    row.map((c) => normalizePixelColor(c, unlockedPaletteCount)),
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
  const unlockedPaletteCount =
    options.unlockedPaletteCount ?? getUnlockedPaletteCount(userLevel);
  const normalized = normalizeGrid(pixels, unlockedPaletteCount);
  const { attribute, bp, ratios } = deriveCardStats(finalName, normalized, userLevel, {
    forceAttribute: options.forceAttribute,
  });
  const rarity = rollRarity(
    ratios,
    normalized,
    unlockedPaletteCount,
    options.random,
  );
  const finalBp = applyRarityToBp(bp, attribute, rarity, userLevel);

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

/** 絵・名前から基礎BPのみ算出（レア・★倍率なし） */
export function getCardFoundationBp(card: Card, userLevel: number): number {
  const size = gridSize(card.pixels);
  const ratios = computeColorRatios(
    card.pixels,
    size * size,
    getUnlockedPaletteCount(userLevel),
  );
  if (!ratios) return card.bp;

  const bpBlend = computeBpBlend(card.name.trim(), card.pixels, ratios);
  return computeCardBaseBp(bpBlend, userLevel, card.attribute);
}

/**
 * レアリティと★数から、累計の限界突破回数を返す。
 * N★0=0, N★1=1, N★2=2, N★3=3
 * R★0=4 (N★3→R昇格で+1), R★1=5, ...
 * SR★0=8, SR★1=9, ...
 */
function countLimitBreaks(card: Pick<Card, 'rarity' | 'stars'>): number {
  const rarityOffset: Record<string, number> = { N: 0, R: 4, SR: 8, UR: 12 };
  return (rarityOffset[card.rarity] ?? 0) + card.stars;
}

/** 既存カードの BP をユーザーレベルに合わせて再算出（絵・属性・レア・限界突破済みBPを維持） */
export function recalculateCardBp(card: Card, userLevel: number): number {
  const size = gridSize(card.pixels);
  const ratios = computeColorRatios(
    card.pixels,
    size * size,
    getUnlockedPaletteCount(userLevel),
  );
  if (!ratios) return card.bp;

  const bpBlend = computeBpBlend(card.name.trim(), card.pixels, ratios);
  const baseBp = computeCardBaseBp(bpBlend, userLevel, card.attribute);
  const rarityBp = applyRarityToBp(baseBp, card.attribute, card.rarity, userLevel);

  const limitBreakCount = countLimitBreaks(card);
  if (limitBreakCount === 0) return rarityBp;

  const gainPerBreak = calcLimitBreakBpGain(baseBp);
  return rarityBp + gainPerBreak * limitBreakCount;
}

export function rescaleDeckBp(deck: Card[], userLevel: number): Card[] {
  return deck.map((card) => ({
    ...card,
    bp: recalculateCardBp(card, userLevel),
  }));
}

/** 既存カードの見た目・名前を更新（属性・レア・戦績等は維持、BPのみ再算出。限界突破済みのBP加算も維持） */
export function updateCardFromDrawing(
  existing: Card,
  name: string,
  pixels: PixelGrid,
  userLevel: number = USER_INITIAL_LEVEL,
  unlockedPaletteCount: number = getUnlockedPaletteCount(userLevel),
): Card {
  const normalized = normalizeGrid(pixels, unlockedPaletteCount);
  const { trimmed, ratios } = validateDrawingInput(
    name,
    normalized,
    unlockedPaletteCount,
  );
  const bpBlend = computeBpBlend(trimmed, normalized, ratios);
  const baseBp = computeCardBaseBp(bpBlend, userLevel, existing.attribute);
  const rarityBp = applyRarityToBp(
    baseBp,
    existing.attribute,
    existing.rarity,
    userLevel,
  );

  const limitBreakCount = countLimitBreaks(existing);
  const bp =
    limitBreakCount > 0
      ? rarityBp + calcLimitBreakBpGain(baseBp) * limitBreakCount
      : rarityBp;

  return {
    ...existing,
    name: trimmed,
    pixels: normalized,
    canvasSize: gridSize(normalized),
    bp,
  };
}
