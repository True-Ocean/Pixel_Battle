import { countPaintedCells, countUniqueColors } from '../card/paintStats';
import type { Card, CardRarity, CardStars } from '../types';

/** カード削除時のピクセル返還率（塗り数に対する割合） */
export const CARD_DELETE_PIXEL_REFUND_RATE = 0.01;

/** ロスト抽選: レア度倍率 */
export const LOST_WEIGHT_RARITY: Record<Extract<CardRarity, 'N' | 'R' | 'SR'>, number> = {
  N: 1.0,
  R: 1.3,
  SR: 1.6,
};

/** ロスト抽選: ★倍率 */
export const LOST_WEIGHT_STARS: Record<CardStars, number> = {
  0: 1.0,
  1: 1.15,
  2: 1.3,
  3: 1.5,
};

/** レベルアップ1回あたりのジュエル */
export const JEWELS_PER_LEVEL = 3;

/** L ≡ 4 (mod 5), L ≥ 5 のジュエル追加ボーナス */
export const JEWELS_BONUS_MOD4 = 10;

/** Lv20,30,40… 到達時の汎用かけら付与数 */
export const UNIVERSAL_LIMIT_BREAK_LEVEL_REWARD = 10;

/** 通常カード削除のジュエルコスト */
export const JEWEL_COST_DELETE = 30;

/** カード名変更（2回目以降）のジュエルコスト。初回命名は無料 */
export const JEWEL_COST_RENAME = 50;

/** デッキ3〜5解放のジュエルコスト（各1回） */
export const JEWEL_COST_DECK_UNLOCK = 200;

/** バトルマッチングキャンセル時の px コスト */
export const BATTLE_MATCH_CANCEL_COST = 25;

/** 限界突破に必要な属性かけら数 */
export const LIMIT_BREAK_SHARDS_REQUIRED = 10;

/** レア昇格時のジュエルコスト（現在レア→次レア） */
export const LIMIT_BREAK_RARITY_JEWEL_COST: Partial<
  Record<Extract<CardRarity, 'N' | 'R' | 'SR'>, number>
> = {
  N: 10,
  R: 20,
  SR: 40,
};

export function getLimitBreakRarityJewelCost(rarity: CardRarity): number | null {
  return (
    LIMIT_BREAK_RARITY_JEWEL_COST[
      rarity as keyof typeof LIMIT_BREAK_RARITY_JEWEL_COST
    ] ?? null
  );
}

/** ★数ごとの BP 倍率（非推奨: 限界突破は `LIMIT_BREAK_BP_GAIN_RATE` で均等加算） */
export const LIMIT_BREAK_STAR_BP_MULTIPLIER: Record<CardStars, number> = {
  0: 1,
  1: 1.03,
  2: 1.06,
  3: 1.09,
};

/** 限界突破1回あたりのBP増加率（基礎BPに対する割合。★アップ・レア昇格で同じ加算量） */
export const LIMIT_BREAK_BP_GAIN_RATE = 0.03;

export function calcLimitBreakBpGain(foundationBp: number): number {
  return Math.max(1, Math.round(foundationBp * LIMIT_BREAK_BP_GAIN_RATE));
}

/** Lv20,30,40… 到達時の汎用かけら付与数 */
export function calcLevelUpUniversalLimitBreak(level: number): number {
  const L = Math.floor(level);
  if (L < 20 || L % 10 !== 0) return 0;
  return UNIVERSAL_LIMIT_BREAK_LEVEL_REWARD;
}

/** 墓地戦利品の属性かけら（レア度別） */
export const GRAVEYARD_SHARD_REWARD: Record<Extract<CardRarity, 'N' | 'R' | 'SR'>, number> = {
  N: 1,
  R: 2,
  SR: 3,
};

/** 非会員の1日無料バトル上限 */
export const BATTLE_DAILY_FREE_LIMIT = 10;

/** バトル回数日次リセットのタイムゾーン */
export const BATTLE_DAILY_RESET_TIMEZONE = 'Asia/Tokyo';

/** 護符購入価格（px 枠） */
export const SHOP_TALISMAN_PX = 300;

/** 護符購入価格（💎 枠） */
export const SHOP_TALISMAN_JEWELS = 25;

/** 開発用モックジュエルパック */
export const MOCK_JEWEL_PACK_SMALL = 100;

/** 完全復活に必要な px（一律） */
export const FULL_REVIVE_COST = 4000;

/** 降格復活に必要な px（一律） */
export const DOWNGRADE_REVIVE_COST = 2000;

/** 勝利時・生存1枚あたりのピクセル */
export const PIXELS_PER_SURVIVOR = 10;

/** 戦利品 = floor(√塗り) × K × 色係数 */
export const GRAVEYARD_SQRT_MULTIPLIER = 1;

/** 使用色が1色増えるごとの係数加算（1色=1.0） */
export const COLOR_DIVERSITY_BONUS_PER_EXTRA_COLOR = 0.05;

/** 色係数の上限 */
export const COLOR_DIVERSITY_MAX_MULTIPLIER = 1.3;

/** Lost 解禁の最低ユーザーレベル */
export const LOST_MIN_USER_LEVEL = 5;

/** 初回無償護符の配布レベル */
export const TALISMAN_STARTER_GRANT_LEVEL = 5;

/** 初回無償護符の個数 */
export const TALISMAN_STARTER_GRANT_COUNT = 1;

/** レベルアップ1回あたりの px（固定） */
export const LEVEL_UP_PIXEL_REWARD = 500;

export function calcLevelUpPixels(_level?: number): number {
  return LEVEL_UP_PIXEL_REWARD;
}

export function calcLevelUpJewels(_level?: number): number {
  return JEWELS_PER_LEVEL;
}

/** L ≡ 4 (mod 5), L ≥ 5 のジュエル追加ボーナス */
export function calcLevelUpJewelBonus(level: number): number {
  const L = Math.max(1, Math.floor(level));
  if (L < 5) return 0;
  return L % 5 === 4 ? JEWELS_BONUS_MOD4 : 0;
}

export function calcTotalLevelUpJewels(levelsGained: readonly number[]): number {
  let total = 0;
  for (const level of levelsGained) {
    total += calcLevelUpJewels(level) + calcLevelUpJewelBonus(level);
  }
  return total;
}

export function calcFullReviveCost(): number {
  return FULL_REVIVE_COST;
}

export function calcDowngradeReviveCost(): number {
  return DOWNGRADE_REVIVE_COST;
}

export function calcColorDiversityMultiplier(uniqueColors: number): number {
  const count = Math.max(1, Math.floor(uniqueColors));
  const raw = 1 + COLOR_DIVERSITY_BONUS_PER_EXTRA_COLOR * (count - 1);
  return Math.min(COLOR_DIVERSITY_MAX_MULTIPLIER, raw);
}

export function countBattleSurvivors(
  playerCardIds: string[],
  defeatedPlayerCardIds: string[],
): number {
  return Math.max(0, playerCardIds.length - defeatedPlayerCardIds.length);
}

export function calcSurvivorPixels(survivorCount: number): number {
  return Math.max(0, Math.floor(survivorCount)) * PIXELS_PER_SURVIVOR;
}

export function calcGraveyardPixelReward(card: Card): number {
  const painted = countPaintedCells(card.pixels);
  if (painted <= 0) return 0;
  const colorMult = calcColorDiversityMultiplier(countUniqueColors(card.pixels));
  return Math.floor(
    Math.sqrt(painted) * GRAVEYARD_SQRT_MULTIPLIER * colorMult,
  );
}

/** 墓地戦利品の属性かけら数（レア度別） */
export function calcGraveyardShardReward(card: Card): number {
  if (card.rarity === 'SR') return GRAVEYARD_SHARD_REWARD.SR;
  if (card.rarity === 'R') return GRAVEYARD_SHARD_REWARD.R;
  return GRAVEYARD_SHARD_REWARD.N;
}

export interface VictoryPixelBreakdown {
  survivorCount: number;
  survivorPixels: number;
  graveyardPixels: number;
  total: number;
}

export function calcVictoryBattlePixels(
  playerCardIds: string[],
  defeatedPlayerCardIds: string[],
  graveyardCard: Card,
): VictoryPixelBreakdown {
  const survivorCount = countBattleSurvivors(
    playerCardIds,
    defeatedPlayerCardIds,
  );
  const survivorPixels = calcSurvivorPixels(survivorCount);
  const graveyardPixels = calcGraveyardPixelReward(graveyardCard);
  return {
    survivorCount,
    survivorPixels,
    graveyardPixels,
    total: survivorPixels + graveyardPixels,
  };
}

function lostWeightRarityMultiplier(rarity: CardRarity): number {
  if (rarity === 'R' || rarity === 'SR') return LOST_WEIGHT_RARITY[rarity];
  if (rarity === 'N') return LOST_WEIGHT_RARITY.N;
  return LOST_WEIGHT_RARITY.SR;
}

/** CPU 敗北時ロスト抽選の重み（px × レア × ★） */
export function calcLostSelectionWeight(card: Card): number {
  const pxWeight = Math.max(1, calcGraveyardPixelReward(card));
  return (
    pxWeight *
    lostWeightRarityMultiplier(card.rarity) *
    LOST_WEIGHT_STARS[card.stars]
  );
}

export function pickWeightedLostCard(
  cards: readonly Card[],
  random: () => number = Math.random,
): Card {
  if (cards.length === 0) {
    throw new Error('pickWeightedLostCard: empty candidates');
  }
  if (cards.length === 1) return cards[0]!;
  const weights = cards.map(calcLostSelectionWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let i = 0; i < cards.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return cards[i]!;
  }
  return cards[cards.length - 1]!;
}

/** カード削除時の px 返還 */
export function calcCardDeleteRefundPixels(card: Card): number {
  const painted = countPaintedCells(card.pixels);
  return Math.ceil(painted * CARD_DELETE_PIXEL_REFUND_RATE);
}
