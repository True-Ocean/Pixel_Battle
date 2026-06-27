import { createEmptyGrid } from '../canvas';
import { createCardFromDrawing, computeDeckPower, recalculateCardBp } from '../card';
import {
  DECK_MAX,
  FIELD_SIZE,
  USER_BP_PER_LEVEL,
  USER_INITIAL_LEVEL,
  MAX_USER_LEVEL,
} from '../config/balance';
import { getSelectableCanvasSizes } from '../config/canvasUnlock';
import { generateCpuCardName } from '../config/cpuNames';
import { unlockedPaletteColors } from '../config/palette';
import { getUnlockedPaletteCount } from '../config/paletteUnlock';
import type { Card, CardStars } from '../types';
import {
  buildCpuPixelArt,
  pickCpuPattern,
  rollCpuTargetDensity,
} from './cpuPatterns';

export { randomCpuName } from '../config/cpuNames';

function fillGrid(color: string) {
  return createEmptyGrid().map((row) => row.map(() => color));
}

/** 強敵になる確率（このバトルは CPU 平均 BP を高めに生成） */
export const STRONG_ENEMY_CHANCE = 0.28;

const MAX_DECK_ATTEMPTS = 56;
const POWER_TOLERANCE_AFTER_PROGRESSION = 20;

/** マッチング演出の表示時間（ミリ秒）: 2〜4秒のランダム */
export function rollMatchingDurationMs(
  random: () => number = Math.random,
): number {
  return 2000 + random() * 2000;
}

export type CpuDifficulty = 'even' | 'strong';

interface DeckSummary {
  avgBp: number;
  power: number;
}

interface DeckTargets {
  powerMin: number;
  powerMax: number;
  avgBpMin: number;
  avgBpMax: number;
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
  const idx = Math.min(
    Math.floor(random() * items.length),
    items.length - 1,
  );
  return items[idx]!;
}

function summarizeDeck(deck: Card[]): DeckSummary {
  if (deck.length === 0) {
    return { avgBp: 80, power: 400 };
  }
  return {
    avgBp: deck.reduce((s, c) => s + c.bp, 0) / deck.length,
    power: computeDeckPower(deck),
  };
}

export function rollCpuDifficulty(
  random: () => number = Math.random,
): CpuDifficulty {
  return random() < STRONG_ENEMY_CHANCE ? 'strong' : 'even';
}

export function buildDeckTargets(
  playerDeck: Card[],
  difficulty: CpuDifficulty,
): DeckTargets {
  const player = summarizeDeck(playerDeck);
  const bpScale =
    difficulty === 'strong'
      ? { min: 1.05, max: 1.28 }
      : { min: 0.95, max: 1.12 };
  const powerScale =
    difficulty === 'strong'
      ? { min: 1.05, max: 1.2 }
      : { min: 1.0, max: 1.1 };

  return {
    powerMin: player.power * powerScale.min,
    powerMax: player.power * powerScale.max,
    avgBpMin: player.avgBp * bpScale.min,
    avgBpMax: player.avgBp * bpScale.max,
  };
}

function shuffleWithRandom<T>(items: readonly T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** プレイヤーのレア・★構成を CPU に割り当て、BP を再計算する */
function applyPlayerProgressionProfile(
  cpuDeck: Card[],
  playerDeck: Card[],
  userLevel: number,
  random: () => number,
): Card[] {
  if (playerDeck.length === 0) return cpuDeck;

  const profile = shuffleWithRandom(
    playerDeck.map((card) => ({
      rarity: card.rarity,
      stars: card.stars as CardStars,
    })),
    random,
  );

  return cpuDeck.map((card, index) => {
    const slot = profile[index % profile.length]!;
    const updated: Card = { ...card, rarity: slot.rarity, stars: slot.stars };
    return { ...updated, bp: recalculateCardBp(updated, userLevel) };
  });
}

function deckMatchesTargets(deck: Card[], targets: DeckTargets): boolean {
  const cpu = summarizeDeck(deck);
  if (cpu.power < targets.powerMin - POWER_TOLERANCE_AFTER_PROGRESSION) {
    return false;
  }
  if (cpu.power > targets.powerMax + POWER_TOLERANCE_AFTER_PROGRESSION) {
    return false;
  }
  if (cpu.avgBp < targets.avgBpMin - 10) {
    return false;
  }
  if (cpu.avgBp > targets.avgBpMax + 10) {
    return false;
  }
  return true;
}

function uniqueName(
  patternId: string,
  usedNames: Set<string>,
  random: () => number,
): string {
  const name = generateCpuCardName(patternId, usedNames, random);
  usedNames.add(name);
  return name;
}

function pickUnlockedCanvasSize(
  userLevel: number,
  random: () => number,
): number {
  return pickRandom(getSelectableCanvasSizes(userLevel), random);
}

function buildOneCpuCard(
  usedNames: Set<string>,
  usedPatternIds: Set<string>,
  random: () => number,
  userLevel: number,
): Card {
  const canvasSize = pickUnlockedCanvasSize(userLevel, random);
  const unlockedPaletteCount = getUnlockedPaletteCount(userLevel);
  const colors = unlockedPaletteColors(unlockedPaletteCount);
  const pattern = pickCpuPattern(random, usedPatternIds);
  usedPatternIds.add(pattern.id);
  const name = uniqueName(pattern.id, usedNames, random);
  const pixels = buildCpuPixelArt({
    pattern,
    canvasSize,
    colors,
    targetDensity: rollCpuTargetDensity(random),
    random,
  });
  return createCardFromDrawing(name, pixels, {
    userLevel,
    unlockedPaletteCount,
    canvasSize,
    random,
  });
}

function buildCandidateDeck(
  random: () => number,
  userLevel: number,
): Card[] {
  const usedNames = new Set<string>();
  const usedPatternIds = new Set<string>();
  const cards: Card[] = [];

  for (let i = 0; i < DECK_MAX; i++) {
    cards.push(buildOneCpuCard(usedNames, usedPatternIds, random, userLevel));
  }

  return cards;
}

function inferUserLevelFromDeck(deck: Card[]): number {
  if (deck.length === 0) return USER_INITIAL_LEVEL;
  const avgBp = deck.reduce((s, c) => s + c.bp, 0) / deck.length;
  const level = Math.round(avgBp / USER_BP_PER_LEVEL);
  return Math.max(USER_INITIAL_LEVEL, Math.min(MAX_USER_LEVEL, level));
}

/**
 * プレイヤーデッキに対して拮抗しつつ、たまに強敵になる CPU 5枚を生成する。
 */
export function buildBalancedCpuDeck(
  playerDeck: Card[],
  random: () => number = Math.random,
  userLevel: number = inferUserLevelFromDeck(playerDeck),
): Card[] {
  const difficulty = rollCpuDifficulty(random);
  const targets = buildDeckTargets(playerDeck, difficulty);

  let lastAttempt = applyPlayerProgressionProfile(
    buildCandidateDeck(random, userLevel),
    playerDeck,
    userLevel,
    random,
  );
  for (let attempt = 0; attempt < MAX_DECK_ATTEMPTS; attempt++) {
    const candidate = applyPlayerProgressionProfile(
      buildCandidateDeck(random, userLevel),
      playerDeck,
      userLevel,
      random,
    );
    lastAttempt = candidate;
    if (deckMatchesTargets(candidate, targets)) return candidate;
  }

  return lastAttempt;
}

/** @deprecated テスト互換。playerDeck なしのとき用 */
export function buildRandomCpuDeck(
  random: () => number = Math.random,
): Card[] {
  return buildBalancedCpuDeck([], random);
}

/** 開発用: 既存カードを参照し、空きスロット分だけ CPU 風カードを生成 */
export function buildCpuCardsForDeckFill(
  existingCards: readonly Card[],
  slotCount: number,
  random: () => number = Math.random,
  userLevel: number = inferUserLevelFromDeck([...existingCards]),
): Card[] {
  if (slotCount <= 0) return [];
  const reference = existingCards.length > 0 ? [...existingCards] : [];
  const existingNames = new Set(existingCards.map((card) => card.name));

  for (let attempt = 0; attempt < 8; attempt++) {
    const batch = buildBalancedCpuDeck(reference, random, userLevel);
    const picked: Card[] = [];
    for (const card of batch) {
      if (existingNames.has(card.name)) continue;
      existingNames.add(card.name);
      picked.push(card);
      if (picked.length >= slotCount) break;
    }
    if (picked.length >= slotCount) return picked.slice(0, slotCount);
  }

  return buildBalancedCpuDeck(reference, random, userLevel).slice(0, slotCount);
}

function combinations3of5(deck: Card[]): Card[][] {
  const out: Card[][] = [];
  for (let a = 0; a < deck.length; a++) {
    for (let b = a + 1; b < deck.length; b++) {
      for (let c = b + 1; c < deck.length; c++) {
        out.push([deck[a]!, deck[b]!, deck[c]!]);
      }
    }
  }
  return out;
}

/**
 * CPU 5枚から3枚。プレイヤー5枚の平均 BP に近い組み合わせを選ぶ。
 */
export function pickCpuBattleLineup(
  cpuDeck: Card[],
  playerDeck?: Card[],
  random: () => number = Math.random,
): Card[] {
  if (cpuDeck.length <= FIELD_SIZE) return [...cpuDeck];

  if (!playerDeck?.length) {
    const arr = [...cpuDeck];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr.slice(0, FIELD_SIZE);
  }

  const playerSummary = summarizeDeck(playerDeck);
  const playerPower = playerSummary.power;
  const cpuPower = summarizeDeck(cpuDeck).power;
  const targetPower =
    cpuPower > playerPower * 1.03 ? playerPower * 1.05 : playerPower;

  const combos = combinations3of5(cpuDeck);
  let best = combos[0]!;
  let bestScore = Infinity;

  for (const combo of combos) {
    const comboPower = computeDeckPower(combo);
    const score = Math.abs(comboPower - targetPower) + random() * 1.5;
    if (score < bestScore) {
      bestScore = score;
      best = combo;
    }
  }

  return best;
}

/** 固定5枚（テスト・参照用） */
export function buildCpuFullDeck(): Card[] {
  return [
    createCardFromDrawing('赤鬼', fillGrid('#ff0000')),
    createCardFromDrawing('白盾', fillGrid('#ffffff')),
    createCardFromDrawing('黒影', fillGrid('#000000')),
    createCardFromDrawing('赤刃', fillGrid('#ff0000')),
    createCardFromDrawing('堅壁', fillGrid('#ffffff')),
  ];
}

/** @deprecated 旧3枚のみ */
export function buildCpuStarterCards(): Card[] {
  return pickCpuBattleLineup(buildCpuFullDeck());
}
