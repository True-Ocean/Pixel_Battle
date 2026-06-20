import { countPaintedCells, countUniqueColors } from '../card/paintStats';
import type { Attribute, Card, CardRarity, CardStars } from '../types';

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
export const JEWELS_PER_LEVEL = 30;

/** L ≡ 4 (mod 5), L ≥ 5 の汎用かけら付与数 */
export const LEVEL_UP_UNIVERSAL_SHARD_REWARD = 20;

/** Lv20,30,40,50 到達時の護符付与数 */
export const TALISMAN_MILESTONE_GRANT_COUNT = 1;

/** 通常カード削除のジュエルコスト */
export const JEWEL_COST_DELETE = 5;

/** カード名変更（保存時・名前が変わった場合）の px コスト */
export const PIXEL_COST_RENAME = 200;

/** 属性リタッチ1回の px コスト */
export const PIXEL_COST_ATTRIBUTE_RETOUCH = 300;

/** 属性セレクト1回の 💎 コスト */
export const JEWEL_COST_ATTRIBUTE_SELECT = 100;

/** デッキ3〜5解放のジュエルコスト（各1回） */
export const JEWEL_COST_DECK_UNLOCK = 1000;

/** 1枚あたりの px 復活上限 */
export const REVIVE_CAP = 3;

/** 思い出アルバム: 1行あたりの枠数 */
export const MEMORY_ALBUM_SLOTS_PER_ROW = 5;

/** 思い出アルバム: 初期解放行数 */
export const MEMORY_ALBUM_INITIAL_ROWS = 1;

/** 思い出アルバム: 追加1行（5枠）解放のジュエル */
export const JEWEL_COST_MEMORY_ALBUM_ROW = 1000;

/** 追加色パレット tier1（紫・濃い緑・茶・赤茶）の px コスト */
export const PIXEL_COST_PALETTE_SHOP_TIER1 = 2000;

/** 追加色パレット tier2（薄色系8色）のジュエルコスト */
export const JEWEL_COST_PALETTE_SHOP_TIER2 = 100;

/** 追加色パレット tier2（薄色系8色）の px コスト */
export const PIXEL_COST_PALETTE_SHOP_TIER2 = 2200;

/** バトルマッチングキャンセル時の px コスト */
export const BATTLE_MATCH_CANCEL_COST = 25;

/** 限界突破1回に必要なかけら数（現在レア度別。専用＋汎用の合計） */
export const LIMIT_BREAK_SHARDS_REQUIRED_BY_RARITY: Record<
  Extract<CardRarity, 'N' | 'R' | 'SR' | 'UR' | 'L'>,
  number
> = {
  N: 10,
  R: 15,
  SR: 20,
  UR: 20,
  L: 20,
};

export function getLimitBreakShardsRequired(rarity: CardRarity): number {
  return LIMIT_BREAK_SHARDS_REQUIRED_BY_RARITY[rarity] ?? 20;
}

/** レア昇格時のジュエルコスト（現在レア→次レア） */
export const LIMIT_BREAK_RARITY_JEWEL_COST: Partial<
  Record<Extract<CardRarity, 'N' | 'R' | 'SR'>, number>
> = {
  N: 50,
  R: 100,
  SR: 200,
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

/** L ≡ 4 (mod 5), L ≥ 5 の汎用かけら付与数 */
export function calcLevelUpUniversalShards(level: number): number {
  const L = Math.max(1, Math.floor(level));
  if (L < 5 || L % 5 !== 4) return 0;
  return LEVEL_UP_UNIVERSAL_SHARD_REWARD;
}

/** @deprecated calcLevelUpUniversalShards を使用 */
export function calcLevelUpUniversalLimitBreak(level: number): number {
  return calcLevelUpUniversalShards(level);
}

const TALISMAN_MILESTONE_LEVELS = [20, 30, 40, 50] as const;

/** Lv20,30,40,50 到達時の護符付与数 */
export function calcLevelUpTalismanGrant(level: number): number {
  const L = Math.floor(level);
  if (!(TALISMAN_MILESTONE_LEVELS as readonly number[]).includes(L)) return 0;
  return TALISMAN_MILESTONE_GRANT_COUNT;
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

/** 広告・ショップ日次リセットと同じ TZ */
export const SHOP_DAILY_RESET_TIMEZONE = BATTLE_DAILY_RESET_TIMEZONE;

/** 護符購入価格（px のみ） */
export const SHOP_TALISMAN_PX = 1500;

/** @deprecated 護符の 💎 購入は廃止（2026-06-20） */
export const SHOP_TALISMAN_JEWELS = 125;

/** 開発用モックジュエルパック */
export const MOCK_JEWEL_PACK_SMALL = 500;

/** 復活コスト: 塗りマス数に対する倍率 */
export const REVIVE_PAINTED_MULTIPLIER = 3;

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
export const LEVEL_UP_PIXEL_REWARD = 300;

export function calcLevelUpPixels(_level?: number): number {
  return LEVEL_UP_PIXEL_REWARD;
}

export function calcLevelUpJewels(_level?: number): number {
  return JEWELS_PER_LEVEL;
}

export function calcTotalLevelUpJewels(levelsGained: readonly number[]): number {
  let total = 0;
  for (const level of levelsGained) {
    total += calcLevelUpJewels(level);
  }
  return total;
}

export function reviveRarityMultiplier(rarity: CardRarity): number {
  if (rarity === 'R' || rarity === 'SR') return LOST_WEIGHT_RARITY[rarity];
  if (rarity === 'N') return LOST_WEIGHT_RARITY.N;
  return LOST_WEIGHT_RARITY.SR;
}

export function reviveStarsMultiplier(stars: CardStars): number {
  return LOST_WEIGHT_STARS[stars];
}

function calcReviveCostFromSlope(
  card: Card,
  rarity: CardRarity,
  stars: CardStars,
): number {
  const painted = countPaintedCells(card.pixels);
  if (painted <= 0) return 1;
  const cost =
    painted *
    REVIVE_PAINTED_MULTIPLIER *
    reviveRarityMultiplier(rarity) *
    reviveStarsMultiplier(stars);
  return Math.floor(cost);
}

/** 復活に必要な px（塗り×3 × 現レア × ★） */
export function calcFullReviveCost(card: Card): number {
  return calcReviveCostFromSlope(card, card.rarity, card.stars);
}

export function canReviveCard(card: Card): boolean {
  return card.reviveCount < REVIVE_CAP;
}

export function isReviveCapReached(card: Card): boolean {
  return card.reviveCount >= REVIVE_CAP;
}

export function getMemoryAlbumCapacity(unlockedRows: number): number {
  return Math.max(0, Math.floor(unlockedRows)) * MEMORY_ALBUM_SLOTS_PER_ROW;
}

export function canAffordMemoryAlbumRowUnlock(economy: {
  jewels: number;
}): boolean {
  return economy.jewels >= JEWEL_COST_MEMORY_ALBUM_ROW;
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

/** カード削除時の px 返還（勝利時の墓地戦利品と同式） */
export function calcCardDeleteRefundPixels(card: Card): number {
  return calcGraveyardPixelReward(card);
}

export interface LostCardDeleteRewards {
  pixels: number;
  shards: number;
}

/** カード削除完了モーダル用の残高変化 */
export interface CardDeleteOutcome {
  cardName: string;
  attribute: Attribute;
  previousFreePixels: number;
  nextFreePixels: number;
  previousJewels: number;
  nextJewels: number;
  previousAttributeShards: number;
  nextAttributeShards: number;
}

/** カード削除時に付与する px と属性かけら */
export function calcLostCardDeleteRewards(card: Card): LostCardDeleteRewards {
  return {
    pixels: calcCardDeleteRefundPixels(card),
    shards: calcGraveyardShardReward(card),
  };
}

export function getCardRenameCount(card: Pick<Card, 'renameCount'>): number {
  const count = card.renameCount;
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
    return 0;
  }
  return Math.floor(count);
}

export function isFirstCardRename(renameCount: number): boolean {
  return Math.max(0, Math.floor(renameCount)) === 0;
}

export function canAffordCardRename(economy: { freePixels: number }): boolean {
  return economy.freePixels >= PIXEL_COST_RENAME;
}

export interface EditorSaveCharges {
  canvasUpgradePx: number;
  renamePixelCost: number;
}

export function calcEditorSaveCharges(params: {
  nameChanged: boolean;
  editCanvasSize: number;
  pendingCanvasSize: number;
}): EditorSaveCharges {
  const renamePixelCost = params.nameChanged ? PIXEL_COST_RENAME : 0;
  return {
    canvasUpgradePx: calcCanvasUpgradeCost(
      params.editCanvasSize,
      params.pendingCanvasSize,
    ),
    renamePixelCost,
  };
}

export function getEditorSaveTotalPixelCost(charges: EditorSaveCharges): number {
  return charges.canvasUpgradePx + charges.renamePixelCost;
}

export function canAffordEditorSave(
  economy: { freePixels: number },
  charges: EditorSaveCharges,
): boolean {
  return economy.freePixels >= getEditorSaveTotalPixelCost(charges);
}

export function canAffordAttributeRetouch(economy: {
  freePixels: number;
}): boolean {
  return economy.freePixels >= PIXEL_COST_ATTRIBUTE_RETOUCH;
}

export function canAffordAttributeSelect(economy: { jewels: number }): boolean {
  return economy.jewels >= JEWEL_COST_ATTRIBUTE_SELECT;
}

export function canAffordDeckUnlock(economy: { jewels: number }): boolean {
  return economy.jewels >= JEWEL_COST_DECK_UNLOCK;
}

export function canAffordPaletteShopPixels(
  economy: { freePixels: number },
  cost: number,
): boolean {
  return economy.freePixels >= Math.max(0, Math.floor(cost));
}

export function canAffordPaletteShopJewels(
  economy: { jewels: number },
  cost: number,
): boolean {
  return economy.jewels >= Math.max(0, Math.floor(cost));
}

/** キャンバス拡大コスト（増分マス数 = 新² − 旧²） */
export function calcCanvasUpgradeCost(fromSize: number, toSize: number): number {
  const from = Math.max(1, Math.floor(fromSize));
  const to = Math.max(1, Math.floor(toSize));
  if (to <= from) return 0;
  return to * to - from * from;
}

export function canAffordCanvasUpgrade(
  economy: { freePixels: number },
  cost: number,
): boolean {
  const px = Math.max(0, Math.floor(cost));
  if (px === 0) return true;
  return economy.freePixels >= px;
}
