/**
 * プロトタイプ調整パラメータ（単一参照: docs/PROTOTYPE_DEVELOPMENT_SPEC.md §13）
 */

import type { Attribute, CardRarity } from '../types';

export const CANVAS_SIZE = 16;
export const DECK_MAX = 5;
export const FRONT_SIZE = 2;
export const BACK_SIZE = 3;
export const FIELD_SIZE = 3;
export const SETUP_TIME_LIMIT_SEC = 30;
export const CPU_RANDOM_ACTION = true;

/** 属性決定: 色スコア vs hash */
export const COLOR_WEIGHT = 0.7;
export const HASH_WEIGHT = 0.3;

/** 黒を攻撃寄りに載せる重み */
export const BLACK_ATTACK_WEIGHT = 0.7;

/** CPU: 有利対面を選ぶ確率 */
export const CPU_AGGRESSIVE_CHANCE = 0.7;

export const PROTOTYPE_FAKE_LOSS = true;

/**
 * 2×8 マスターパレット（左上から行優先・計16色）。
 * Lv0 は先頭3色（白・黒・赤）のみ表示・選択可。将来 Lv アップで順次追加。
 */
export const PALETTE_16 = [
  '#ffffff',
  '#000000',
  '#ff0000',
  '#ff8800',
  '#ffdd00',
  '#44cc44',
  '#44dddd',
  '#4488ff',
  '#2222ff',
  '#8844ff',
  '#ff44ff',
  '#ff4488',
  '#886644',
  '#bbbbbb',
  '#555555',
  '#ffcccc',
] as const;

export const PALETTE_GRID_COLS = 8;
export const PALETTE_GRID_ROWS = 2;
export const PALETTE_UNLOCKED_COUNT_LV0 = 3;

/** Lv0 使用色（PALETTE_16 の先頭3色） */
export const PALETTE_LV0 = [
  PALETTE_16[0],
  PALETTE_16[1],
  PALETTE_16[2],
] as const;

export const BP_RANGE: Record<'attack' | 'defense', { min: number; max: number }> = {
  attack: { min: 70, max: 100 },
  defense: { min: 55, max: 85 },
};

/** 新規作成時: 基礎 BP に乗算（ECONOMY_SPEC §9.4） */
export const RARITY_BP_MULTIPLIER: Record<CardRarity, number> = {
  N: 1,
  R: 1.08,
  SR: 1.15,
  UR: 1.22,
  L: 1.3,
};

/** レア度ごとの BP 下限（同レア帯内で N より低く見えないよう補正） */
export const RARITY_BP_MIN: Record<CardRarity, Record<Attribute, number>> = {
  N: { attack: BP_RANGE.attack.min, defense: BP_RANGE.defense.min },
  R: { attack: 78, defense: 62 },
  SR: { attack: 90, defense: 78 },
  UR: { attack: 95, defense: 81 },
  L: { attack: 98, defense: 83 },
};

export function applyRarityToBp(
  baseBp: number,
  attribute: Attribute,
  rarity: CardRarity,
): number {
  const scaled = Math.round(baseBp * RARITY_BP_MULTIPLIER[rarity]);
  const min = RARITY_BP_MIN[rarity][attribute];
  const max = BP_RANGE[attribute].max;
  return Math.min(max, Math.max(min, scaled));
}

/** カード戦力: BP × bpWeight + flatBonus（属性ごと） */
export const ATTRIBUTE_POWER = {
  attack: { bpWeight: 1, flatBonus: 0 },
  defense: { bpWeight: 1, flatBonus: 20 },
} as const satisfies Record<
  'attack' | 'defense',
  { bpWeight: number; flatBonus: number }
>;

/** 初回セットアップ・ユーザープロフィール */
export const USER_INITIAL_LEVEL = 1;
export const USER_INITIAL_EXP = 0;
export const USERNAME_MAX_LENGTH = 16;
export const MAX_USER_LEVEL = 30;

/** レベル L → L+1 に必要な EXP = EXP_LEVEL_BASE + L */
export const EXP_LEVEL_BASE = 10;

/** プロトタイプ CPU 対戦時の表示レベル */
export const CPU_OPPONENT_LEVEL = 1;

/** 上振れ勝利 EXP（相手デッキ戦力が高いとき・勝利時のみ） */
export const EXP_UPSET_RATIO_TIER1 = 1.1;
export const EXP_UPSET_RATIO_TIER2 = 1.2;
export const EXP_UPSET_RATIO_TIER3 = 1.3;
export const EXP_UPSET_BONUS_MAX = 3;
