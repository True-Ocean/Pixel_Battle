import { createCardFromDrawing, recalculateCardBp } from '../card';
import { getUnlockedPaletteCount } from '../config/paletteUnlock';
import { unlockedPaletteColors } from '../config/palette';
import { buildCpuPixelArt, CPU_PATTERNS } from '../game/cpuPatterns';
import type { PublicGhostDeck } from '../offlinePvp/types';
import type { Attribute, Card, CardStars } from '../types';

/** 決定的な疑似乱数（シード固定用） */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CARD_NAMES = [
  '赤剣',
  '青盾',
  '星弓',
  '緑癒',
  '氷牙',
  '嵐翼',
  '影忍',
  '光輪',
  '毒牙',
  '双刃',
] as const;

interface SeedCardRecord {
  wins: number;
  losses: number;
  reviveCount: number;
  stars: CardStars;
}

interface SeedDeckDef {
  id: string;
  authorName: string;
  authorLevel: number;
  /** 塗り密度 0〜1（戦利品差の検証用） */
  densities: readonly number[];
  attributes: readonly Attribute[];
  /** 生存・墓地・復活・限界突破（一覧表示用） */
  records: readonly SeedCardRecord[];
}

const SEED_DEFS: readonly SeedDeckDef[] = [
  {
    id: 'seed-ghost-lv3',
    authorName: 'ピクセル初心者',
    authorLevel: 3,
    densities: [0.35, 0.4, 0.3, 0.45, 0.38],
    attributes: ['attack', 'defense', 'attack', 'defense', 'attack'],
    records: [
      { wins: 2, losses: 1, reviveCount: 0, stars: 0 },
      { wins: 1, losses: 2, reviveCount: 0, stars: 0 },
      { wins: 3, losses: 0, reviveCount: 0, stars: 0 },
      { wins: 0, losses: 1, reviveCount: 0, stars: 0 },
      { wins: 1, losses: 1, reviveCount: 0, stars: 0 },
    ],
  },
  {
    id: 'seed-ghost-lv8',
    authorName: 'ドット太郎',
    authorLevel: 8,
    densities: [0.5, 0.55, 0.48, 0.6, 0.52],
    attributes: ['attack', 'defense', 'power', 'attack', 'defense'],
    records: [
      { wins: 8, losses: 3, reviveCount: 0, stars: 0 },
      { wins: 5, losses: 4, reviveCount: 1, stars: 0 },
      { wins: 6, losses: 2, reviveCount: 0, stars: 1 },
      { wins: 4, losses: 5, reviveCount: 0, stars: 0 },
      { wins: 7, losses: 1, reviveCount: 0, stars: 0 },
    ],
  },
  {
    id: 'seed-ghost-lv12',
    authorName: '塗り絵好き',
    authorLevel: 12,
    densities: [0.7, 0.65, 0.72, 0.68, 0.75],
    attributes: ['attack', 'defense', 'power', 'bow', 'attack'],
    records: [
      { wins: 14, losses: 6, reviveCount: 1, stars: 1 },
      { wins: 10, losses: 8, reviveCount: 0, stars: 0 },
      { wins: 12, losses: 5, reviveCount: 0, stars: 1 },
      { wins: 9, losses: 7, reviveCount: 1, stars: 0 },
      { wins: 11, losses: 4, reviveCount: 0, stars: 0 },
    ],
  },
  {
    id: 'seed-ghost-lv18',
    authorName: '双剣使い',
    authorLevel: 18,
    densities: [0.55, 0.58, 0.5, 0.62, 0.54],
    attributes: ['dual', 'bow', 'power', 'defense', 'attack'],
    records: [
      { wins: 22, losses: 9, reviveCount: 1, stars: 1 },
      { wins: 18, losses: 11, reviveCount: 0, stars: 2 },
      { wins: 20, losses: 8, reviveCount: 1, stars: 1 },
      { wins: 15, losses: 12, reviveCount: 2, stars: 0 },
      { wins: 19, losses: 7, reviveCount: 0, stars: 1 },
    ],
  },
  {
    id: 'seed-ghost-lv25',
    authorName: '毒と癒し',
    authorLevel: 25,
    densities: [0.8, 0.78, 0.82, 0.76, 0.85],
    attributes: ['poison', 'heal', 'defense', 'bow', 'power'],
    records: [
      { wins: 35, losses: 14, reviveCount: 1, stars: 2 },
      { wins: 28, losses: 16, reviveCount: 2, stars: 1 },
      { wins: 30, losses: 12, reviveCount: 0, stars: 1 },
      { wins: 24, losses: 18, reviveCount: 1, stars: 2 },
      { wins: 32, losses: 10, reviveCount: 0, stars: 1 },
    ],
  },
  {
    id: 'seed-ghost-lv35',
    authorName: '氷嵐の画家',
    authorLevel: 35,
    densities: [0.9, 0.88, 0.92, 0.86, 0.95],
    attributes: ['ice', 'storm', 'heal', 'dual', 'defense'],
    records: [
      { wins: 48, losses: 20, reviveCount: 2, stars: 2 },
      { wins: 42, losses: 22, reviveCount: 1, stars: 3 },
      { wins: 45, losses: 18, reviveCount: 1, stars: 2 },
      { wins: 38, losses: 24, reviveCount: 2, stars: 1 },
      { wins: 50, losses: 15, reviveCount: 0, stars: 2 },
    ],
  },
  {
    id: 'seed-ghost-lv45',
    authorName: '影の職人',
    authorLevel: 45,
    densities: [0.6, 0.95, 0.7, 0.9, 0.65],
    attributes: ['ninja', 'storm', 'ice', 'poison', 'bow'],
    records: [
      { wins: 62, losses: 28, reviveCount: 2, stars: 2 },
      { wins: 55, losses: 30, reviveCount: 3, stars: 3 },
      { wins: 58, losses: 25, reviveCount: 1, stars: 2 },
      { wins: 50, losses: 32, reviveCount: 2, stars: 1 },
      { wins: 60, losses: 22, reviveCount: 1, stars: 3 },
    ],
  },
  {
    id: 'seed-ghost-lv50',
    authorName: '光の達人',
    authorLevel: 50,
    densities: [1, 0.98, 1, 0.96, 1],
    attributes: ['illuminate', 'heal', 'storm', 'ninja', 'dual'],
    records: [
      { wins: 80, losses: 35, reviveCount: 2, stars: 3 },
      { wins: 72, losses: 38, reviveCount: 3, stars: 3 },
      { wins: 75, losses: 30, reviveCount: 1, stars: 2 },
      { wins: 68, losses: 40, reviveCount: 2, stars: 3 },
      { wins: 78, losses: 28, reviveCount: 1, stars: 3 },
    ],
  },
];

function buildSeedCard(
  ghostId: string,
  cardIndex: number,
  authorLevel: number,
  attribute: Attribute,
  density: number,
  patternIndex: number,
  record: SeedCardRecord,
): Card {
  const seed =
    ghostId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 31 +
    cardIndex * 997;
  const random = mulberry32(seed);
  const pattern = CPU_PATTERNS[patternIndex % CPU_PATTERNS.length]!;
  const colors = unlockedPaletteColors(getUnlockedPaletteCount(authorLevel));
  const pixels = buildCpuPixelArt({
    pattern,
    canvasSize: 16,
    colors,
    targetDensity: density,
    random,
  });
  const name = CARD_NAMES[cardIndex % CARD_NAMES.length]!;
  const card = createCardFromDrawing(name, pixels, {
    userLevel: authorLevel,
    forceAttribute: attribute,
    random: mulberry32(seed + 17),
    unlockedPaletteCount: getUnlockedPaletteCount(authorLevel),
  });
  const withRecord: Card = {
    ...card,
    id: `${ghostId}-card-${cardIndex}`,
    wins: record.wins,
    losses: record.losses,
    reviveCount: record.reviveCount,
    stars: record.stars,
  };
  if (record.stars === 0) return withRecord;
  return {
    ...withRecord,
    bp: recalculateCardBp(withRecord, authorLevel),
  };
}

function buildSeedDeck(def: SeedDeckDef): PublicGhostDeck {
  const deck = def.attributes.map((attribute, index) =>
    buildSeedCard(
      def.id,
      index,
      def.authorLevel,
      attribute,
      def.densities[index] ?? 0.5,
      index + def.authorLevel,
      def.records[index] ?? {
        wins: 0,
        losses: 0,
        reviveCount: 0,
        stars: 0,
      },
    ),
  );
  return {
    id: def.id,
    authorName: def.authorName,
    authorLevel: def.authorLevel,
    deck,
    publishedAt: '2026-07-04T00:00:00.000Z',
  };
}

/** 同梱シード公開デッキ（モジュール読み込み時に一度だけ構築） */
export const SEED_GHOST_DECKS: readonly PublicGhostDeck[] =
  SEED_DEFS.map(buildSeedDeck);
