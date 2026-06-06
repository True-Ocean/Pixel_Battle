import {
  BLACK_ATTACK_WEIGHT,
  CANVAS_SIZE,
  COLOR_WEIGHT,
  HASH_WEIGHT,
  HP_RANGE,
} from '../config/balance';
import type { Attribute, Card, PixelGrid } from '../types';
import { computeColorRatios, normalizePixelColor } from './colors';
import { buildCardSeed, hashToUnit } from './hash';

export interface CardDraft {
  attribute: Attribute;
  hp: number;
  ratios: NonNullable<ReturnType<typeof computeColorRatios>>;
}

export class CardCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardCreationError';
  }
}

export function deriveCardStats(
  name: string,
  pixels: PixelGrid,
): CardDraft {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new CardCreationError('カード名を入力してください');
  }

  const totalCells = CANVAS_SIZE * CANVAS_SIZE;
  const ratios = computeColorRatios(pixels, totalCells);
  if (!ratios) {
    throw new CardCreationError('1マス以上塗ってください');
  }

  const seed = buildCardSeed(trimmed, pixels);
  const hashAttack = hashToUnit(seed, 'attack');
  const hashDefense = hashToUnit(seed, 'defense');

  const colorAttack = ratios.r + ratios.b * BLACK_ATTACK_WEIGHT;
  const colorDefense = ratios.w + ratios.b * (1 - BLACK_ATTACK_WEIGHT);

  const finalAttack =
    colorAttack * COLOR_WEIGHT + hashAttack * HASH_WEIGHT;
  const finalDefense =
    colorDefense * COLOR_WEIGHT + hashDefense * HASH_WEIGHT;

  const attribute: Attribute =
    finalAttack >= finalDefense ? 'attack' : 'defense';

  const hashHp = hashToUnit(seed, 'hp');
  const hpBlend = ratios.density * 0.55 + hashHp * 0.45;
  const { min, max } = HP_RANGE[attribute];
  const hp = Math.round(min + (max - min) * hpBlend);

  return { attribute, hp, ratios };
}

function normalizeGrid(pixels: PixelGrid): PixelGrid {
  return pixels.map((row) => row.map((c) => normalizePixelColor(c)));
}

/** HTTP の LAN アクセスなど非セキュアコンテキストでも使える ID 生成 */
function createCardId(): string {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createCardFromDrawing(name: string, pixels: PixelGrid): Card {
  const normalized = normalizeGrid(pixels);
  const { attribute, hp } = deriveCardStats(name, normalized);

  return {
    id: createCardId(),
    name: name.trim(),
    pixels: normalized,
    attribute,
    hp,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    createdAt: new Date().toISOString(),
  };
}

/** 既存カードの見た目・名前を更新（戦績・ID は維持） */
export function updateCardFromDrawing(
  existing: Card,
  name: string,
  pixels: PixelGrid,
): Card {
  const normalized = normalizeGrid(pixels);
  const { attribute, hp } = deriveCardStats(name, normalized);

  return {
    ...existing,
    name: name.trim(),
    pixels: normalized,
    attribute,
    hp,
  };
}
