import { createEmptyGrid } from '../canvas';
import { createCardFromDrawing, computeDeckPower } from '../card';
import {
  DECK_MAX,
  FIELD_SIZE,
  USER_BP_PER_LEVEL,
  USER_INITIAL_LEVEL,
  MAX_USER_LEVEL,
} from '../config/balance';
import {
  getUnlockedCanvasSizes,
  type CanvasSize,
} from '../config/canvasUnlock';
import { unlockedPaletteColors } from '../config/palette';
import { getUnlockedPaletteCount } from '../config/paletteUnlock';
import type { Card } from '../types';
import { pickCpuPattern, type PatternBias } from './cpuPatterns';

function fillGrid(color: string) {
  return createEmptyGrid().map((row) => row.map(() => color));
}

/** 強敵になる確率（このバトルは CPU 平均 BP を高めに生成） */
export const STRONG_ENEMY_CHANCE = 0.28;

const MAX_DECK_ATTEMPTS = 56;
const ATTR_TOLERANCE = 1;

const CPU_NAME_PREFIXES = [
  'なぞ',
  'ふし',
  'かげ',
  'ほの',
  'くろ',
  'しろ',
  'あか',
  'よわ',
  'つよ',
  'わく',
] as const;

const CPU_NAME_SUFFIXES = [
  'ぶき',
  'たて',
  'まもの',
  'ひと',
  'かみ',
  'けもの',
  'たま',
  'いし',
] as const;

export type CpuDifficulty = 'even' | 'strong';

interface DeckSummary {
  avgBp: number;
  power: number;
  attacks: number;
  defenses: number;
}

interface DeckTargets {
  powerMin: number;
  powerMax: number;
  avgBpMin: number;
  avgBpMax: number;
  attackCount: number;
  defenseCount: number;
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
  const idx = Math.min(
    Math.floor(random() * items.length),
    items.length - 1,
  );
  return items[idx]!;
}

export function randomCpuName(random: () => number = Math.random): string {
  return `${pickRandom(CPU_NAME_PREFIXES, random)}の${pickRandom(CPU_NAME_SUFFIXES, random)}`;
}

function summarizeDeck(deck: Card[]): DeckSummary {
  if (deck.length === 0) {
    return { avgBp: 80, power: 400, attacks: 2, defenses: 3 };
  }
  const attacks = deck.filter((c) => c.attribute === 'attack').length;
  return {
    avgBp: deck.reduce((s, c) => s + c.bp, 0) / deck.length,
    power: computeDeckPower(deck),
    attacks,
    defenses: deck.length - attacks,
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

  let attackCount = player.attacks;
  let defenseCount = player.defenses;
  if (difficulty === 'strong') {
    attackCount = Math.min(4, player.attacks + 1);
    defenseCount = DECK_MAX - attackCount;
  }

  return {
    powerMin: player.power * powerScale.min,
    powerMax: player.power * powerScale.max,
    avgBpMin: player.avgBp * bpScale.min,
    avgBpMax: player.avgBp * bpScale.max,
    attackCount,
    defenseCount,
  };
}

function deckMatchesTargets(deck: Card[], targets: DeckTargets): boolean {
  const cpu = summarizeDeck(deck);
  if (cpu.power < targets.powerMin || cpu.power > targets.powerMax) {
    return false;
  }
  if (cpu.avgBp < targets.avgBpMin || cpu.avgBp > targets.avgBpMax) {
    return false;
  }
  if (Math.abs(cpu.attacks - targets.attackCount) > ATTR_TOLERANCE) {
    return false;
  }
  return true;
}

function uniqueName(used: Set<string>, random: () => number): string {
  let name = randomCpuName(random);
  let attempt = 0;
  while (used.has(name) && attempt < 16) {
    name = randomCpuName(random);
    attempt++;
  }
  used.add(name);
  return name;
}

function inferUserLevelFromDeck(deck: Card[]): number {
  if (deck.length === 0) return USER_INITIAL_LEVEL;
  const avgBp = deck.reduce((s, c) => s + c.bp, 0) / deck.length;
  const level = Math.round(avgBp / USER_BP_PER_LEVEL);
  return Math.max(USER_INITIAL_LEVEL, Math.min(MAX_USER_LEVEL, level));
}

function pickUnlockedCanvasSize(
  userLevel: number,
  random: () => number,
): CanvasSize {
  return pickRandom(getUnlockedCanvasSizes(userLevel), random);
}

function buildOneCpuCard(
  prefer: PatternBias,
  usedNames: Set<string>,
  random: () => number,
  userLevel: number,
): Card {
  const name = uniqueName(usedNames, random);
  const canvasSize = pickUnlockedCanvasSize(userLevel, random);
  const unlockedPaletteCount = getUnlockedPaletteCount(userLevel);
  const colors = unlockedPaletteColors(unlockedPaletteCount);
  const pattern = pickCpuPattern(prefer, random);
  const pixels = pattern.build({ canvasSize, colors, random });
  return createCardFromDrawing(name, pixels, {
    userLevel,
    unlockedPaletteCount,
    canvasSize,
    random,
  });
}

function buildCandidateDeck(
  targets: DeckTargets,
  random: () => number,
  userLevel: number,
): Card[] {
  const usedNames = new Set<string>();
  const cards: Card[] = [];
  const biases: PatternBias[] = [];

  for (let i = 0; i < targets.attackCount; i++) biases.push('attack');
  for (let i = 0; i < targets.defenseCount; i++) biases.push('defense');
  while (biases.length < DECK_MAX) biases.push('neutral');

  for (let i = biases.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [biases[i], biases[j]] = [biases[j]!, biases[i]!];
  }

  for (const prefer of biases) {
    cards.push(buildOneCpuCard(prefer, usedNames, random, userLevel));
  }

  return cards;
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

  let lastAttempt = buildCandidateDeck(targets, random, userLevel);
  for (let attempt = 0; attempt < MAX_DECK_ATTEMPTS; attempt++) {
    const candidate = buildCandidateDeck(targets, random, userLevel);
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
