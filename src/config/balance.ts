/**
 * プロトタイプ調整パラメータ（単一参照: docs/PROTOTYPE_DEVELOPMENT_SPEC.md §13）
 */

import type { Attribute, CardRarity } from '../types';

/** 初期キャンバス・既存セーブ移行のデフォルト値 */
export const CANVAS_SIZE_DEFAULT = 16;

/** @deprecated CANVAS_SIZE_DEFAULT を使用 */
export const CANVAS_SIZE = CANVAS_SIZE_DEFAULT;
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
 * index 0〜9: プレイ用（白→茶、§5.6 の順でレベル解放）。
 * index 10〜15: 将来用に予約。
 */
export const PALETTE_16 = [
  '#ffffff',
  '#000000',
  '#ff0000',
  '#2222ff',
  '#ffdd00',
  '#44cc44',
  '#ff8800',
  '#ff44ff',
  '#8844ff',
  '#886644',
  '#44dddd',
  '#4488ff',
  '#ff4488',
  '#bbbbbb',
  '#555555',
  '#ffcccc',
] as const;

/** マスターパレットのプレイ用色数（index 0〜9。紫・茶含む） */
export const PALETTE_PLAYABLE_COUNT = 10;

/** エディタ1行目に表示する色スロット数（index 0〜7。Lv50 まで） */
export const PALETTE_EDITOR_COLOR_COUNT = 8;

export const PALETTE_GRID_COLS = 8;
export const PALETTE_GRID_ROWS = 2;
export const PALETTE_UNLOCKED_COUNT_LV0 = 3;

/** Lv0 使用色（PALETTE_16 の先頭3色） */
export const PALETTE_LV0 = [
  PALETTE_16[0],
  PALETTE_16[1],
  PALETTE_16[2],
] as const;

/** ユーザーレベルあたりの基本BP（攻撃）。防御は DEFENSE_BP_RATIO を乗算 */
export const USER_BP_PER_LEVEL = 10;

/** カード名・イメージ由来の BP 振れ幅（基本BPに対する ±割合） */
export const CARD_BP_SPREAD = 0.15;

/** 防御カードの基本BP係数（攻撃比） */
export const DEFENSE_BP_RATIO = 0.85;

/** 力属性の基本BP係数（攻撃比）。ATTRIBUTE_SPEC §4.3 */
export const POWER_BP_RATIO = 1.5;

/** 弓属性の基本BP係数（攻撃比）。ATTRIBUTE_SPEC §4.4 */
export const BOW_BP_RATIO = 0.6;

/** 毒属性の基本BP係数（攻撃比）。近接＋DoT 分を抑えた値。ATTRIBUTE_SPEC §4.6 */
export const POISON_BP_RATIO = 0.85;

/** 毒スタック1つあたりの DoT（付与時 currentBp 比）。ATTRIBUTE_SPEC §4.6 */
export const POISON_DOT_RATIO = 0.3;

/** 初回セットアップ・ユーザープロフィール */
export const USER_INITIAL_LEVEL = 1;
export const MAX_USER_LEVEL = 50;

/**
 * プロトタイプ検証用: true のときユーザーを常に最大レベルで扱う。
 * 本番・通常プレイ前に false に戻すこと。
 */
export const DEV_FORCE_MAX_USER_LEVEL = false;

/** @deprecated レベル連動BP以前の固定レンジ（参照用） */
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

function clampUserLevel(userLevel: number): number {
  return Math.max(USER_INITIAL_LEVEL, Math.min(MAX_USER_LEVEL, userLevel));
}

/** 属性別のユーザーレベル基準BP（例: Lv10 攻撃=100, 防御=85） */
export function getUserBaseBp(
  userLevel: number,
  attribute: Attribute,
): number {
  const level = clampUserLevel(userLevel);
  const attackBase = level * USER_BP_PER_LEVEL;
  if (attribute === 'defense') return Math.round(attackBase * DEFENSE_BP_RATIO);
  if (attribute === 'power') return Math.round(attackBase * POWER_BP_RATIO);
  if (attribute === 'bow') return Math.round(attackBase * BOW_BP_RATIO);
  if (attribute === 'poison') return Math.round(attackBase * POISON_BP_RATIO);
  return attackBase;
}

/** カード個別BP（レア適用前）のレンジ */
export function getCardBaseBpRange(
  userLevel: number,
  attribute: Attribute,
): { min: number; max: number } {
  const center = getUserBaseBp(userLevel, attribute);
  return {
    min: Math.round(center * (1 - CARD_BP_SPREAD)),
    max: Math.round(center * (1 + CARD_BP_SPREAD)),
  };
}

/** bpBlend（0〜1）とユーザーレベルからカード基礎BPを算出 */
export function computeCardBaseBp(
  bpBlend: number,
  userLevel: number,
  attribute: Attribute,
): number {
  const blend = Math.min(1, Math.max(0, bpBlend));
  const { min, max } = getCardBaseBpRange(userLevel, attribute);
  return Math.round(min + (max - min) * blend);
}

export function applyRarityToBp(
  baseBp: number,
  attribute: Attribute,
  rarity: CardRarity,
  userLevel: number = USER_INITIAL_LEVEL,
): number {
  const { min, max } = getCardBaseBpRange(userLevel, attribute);
  const mult = RARITY_BP_MULTIPLIER[rarity];
  const scaled = Math.round(baseBp * mult);
  const rarityMin = Math.round(min * mult);
  const rarityMax = Math.round(max * mult);
  return Math.min(rarityMax, Math.max(rarityMin, scaled));
}

/** カード戦力: BP × bpWeight + flatBonus（属性ごと） */
export const ATTRIBUTE_POWER = {
  attack: { bpWeight: 1, flatBonus: 0 },
  defense: { bpWeight: 1, flatBonus: 20 },
  power: { bpWeight: 1, flatBonus: 0 },
  bow: { bpWeight: 1, flatBonus: 0 },
  dual: { bpWeight: 1, flatBonus: 0 },
  poison: { bpWeight: 1, flatBonus: 0 },
  heal: { bpWeight: 1, flatBonus: 0 },
  ice: { bpWeight: 1, flatBonus: 0 },
  storm: { bpWeight: 1, flatBonus: 0 },
  ninja: { bpWeight: 1, flatBonus: 0 },
} as const satisfies Record<
  Attribute,
  { bpWeight: number; flatBonus: number }
>;

export const USER_INITIAL_EXP = 0;
export const USERNAME_MAX_LENGTH = 16;

/** レベル L → L+1 に必要な EXP = EXP_LEVEL_BASE + L */
export const EXP_LEVEL_BASE = 10;

/** @deprecated 対戦相手レベル未指定時のフォールバック。通常はプレイヤーと同レベルを渡す */
export const CPU_OPPONENT_LEVEL = 1;

/** 上振れ勝利 EXP（相手デッキ戦力が高いとき・勝利時のみ） */
export const EXP_UPSET_RATIO_TIER1 = 1.1;
export const EXP_UPSET_RATIO_TIER2 = 1.2;
export const EXP_UPSET_RATIO_TIER3 = 1.3;
export const EXP_UPSET_BONUS_MAX = 3;
