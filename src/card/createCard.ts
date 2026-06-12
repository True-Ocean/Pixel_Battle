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

export interface CardDraft {
  attribute: Attribute;
  bp: number;
  ratios: NonNullable<ReturnType<typeof computeColorRatios>>;
}

export interface CreateCardOptions {
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
): CardDraft {
  const unlockedPaletteCount = getUnlockedPaletteCount(userLevel);
  const { trimmed, ratios } = validateDrawingInput(
    name,
    pixels,
    unlockedPaletteCount,
  );
  const attribute = deriveAttribute(trimmed, pixels, ratios, userLevel);
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

/** HTTP の LAN アクセスなど非セキュアコンテキストでも使える ID 生成 */
function createCardId(): string {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createCardFromDrawing(
  name: string,
  pixels: PixelGrid,
  options: CreateCardOptions = {},
): Card {
  const userLevel = options.userLevel ?? USER_INITIAL_LEVEL;
  const unlockedPaletteCount =
    options.unlockedPaletteCount ?? getUnlockedPaletteCount(userLevel);
  const normalized = normalizeGrid(pixels, unlockedPaletteCount);
  const { attribute, bp, ratios } = deriveCardStats(name, normalized, userLevel);
  const rarity = rollRarity(
    ratios,
    normalized,
    unlockedPaletteCount,
    options.random,
  );
  const finalBp = applyRarityToBp(bp, attribute, rarity, userLevel);

  const canvasSize = options.canvasSize ?? gridSize(normalized);

  return {
    id: createCardId(),
    name: name.trim(),
    pixels: normalized,
    canvasSize,
    attribute,
    bp: finalBp,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity,
    stars: 0,
    createdAt: new Date().toISOString(),
  };
}

/** 既存カードの BP をユーザーレベルに合わせて再算出（絵・属性・レアは維持） */
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
  return applyRarityToBp(baseBp, card.attribute, card.rarity, userLevel);
}

export function rescaleDeckBp(deck: Card[], userLevel: number): Card[] {
  return deck.map((card) => ({
    ...card,
    bp: recalculateCardBp(card, userLevel),
  }));
}

/** 既存カードの見た目・名前を更新（属性・レア・戦績等は維持、BPのみ再算出） */
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
  const bp = applyRarityToBp(
    baseBp,
    existing.attribute,
    existing.rarity,
    userLevel,
  );

  return {
    ...existing,
    name: trimmed,
    pixels: normalized,
    canvasSize: gridSize(normalized),
    bp,
  };
}
