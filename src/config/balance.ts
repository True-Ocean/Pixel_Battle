/**
 * プロトタイプ調整パラメータ（単一参照: docs/PROTOTYPE_DEVELOPMENT_SPEC.md §13）
 */

import type { Attribute, CardRarity } from '../types';

/** 初期キャンバス・既存セーブ移行のデフォルト値 */
export const CANVAS_SIZE_DEFAULT = 16;

/** @deprecated CANVAS_SIZE_DEFAULT を使用 */
export const CANVAS_SIZE = CANVAS_SIZE_DEFAULT;
export const DECK_MAX = 5;
/** ユーザーが持てるデッキスロット数（各スロット最大 DECK_MAX 枚） */
export const DECK_SLOT_COUNT = 5;
export const DECK_SLOT_INITIAL_UNLOCKED = 1;
/** デッキ名の最大文字数（タブ・Hub 表示用） */
export const DECK_NAME_MAX_LENGTH = 12;
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
export const POWER_BP_RATIO = 1.28;

/** 弓属性の基本BP係数（攻撃比）。ATTRIBUTE_SPEC §4.4 */
export const BOW_BP_RATIO = 0.52;

/** 弓カード1枚あたりの弓矢数（1戦闘）。ATTRIBUTE_SPEC §4.4 */
export const BOW_ARROWS_PER_BATTLE = 2;

/** 毒属性の基本BP係数（攻撃比）。近接＋DoT 分を抑えた値。ATTRIBUTE_SPEC §4.6 */
export const POISON_BP_RATIO = 0.85;

/** 癒属性の基本BP係数（攻撃比）。回復2回・毒解消分を抑えた値。ATTRIBUTE_SPEC §4.7 */
export const HEAL_BP_RATIO = 0.6;

/** 毒スタック1つあたりの DoT（付与時 currentBp 比）。ATTRIBUTE_SPEC §4.6 */
export const POISON_DOT_RATIO = 0.3;

/** 氷属性の基本BP係数（攻撃比）。凍結の付加価値分を抑えた値。ATTRIBUTE_SPEC §4.8 */
export const ICE_BP_RATIO = 0.88;

/** 嵐属性の基本BP係数（後半属性・範囲攻撃型）。ATTRIBUTE_SPEC §4.9 */
export const STORM_BP_RATIO = 0.68;

/** 嵐カード1枚あたりの嵐回数（1戦闘）。ATTRIBUTE_SPEC §4.9 */
export const STORM_USES_PER_BATTLE = 2;

/** 嵐の与ダメ（currentBp × 比率・各ヒット） */
export const STORM_DAMAGE_RATIO = 0.5;

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
  if (attribute === 'heal') return Math.round(attackBase * HEAL_BP_RATIO);
  if (attribute === 'ice') return Math.round(attackBase * ICE_BP_RATIO);
  if (attribute === 'storm') return Math.round(attackBase * STORM_BP_RATIO);
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

/** 相手デッキ戦力に対する EXP 換算率（2%） */
export const EXP_RATE = 0.02;

/** 敗北時の EXP 係数（勝利比 −20%） */
export const EXP_DEFEAT_MULTIPLIER = 0.8;

/** 想定相手戦力のキャリブレーション（Lv21 ≈ 1000 戦力） */
export const EXP_REF_POWER_AT_LEVEL = 21;
export const EXP_REF_POWER_VALUE = 1000;

/** レベル L の標準相手デッキ戦力（Lv L→L+1 に L 勝の目安） */
export function expectedOpponentDeckPower(level: number): number {
  const L = Math.max(USER_INITIAL_LEVEL, Math.floor(level));
  return Math.round((EXP_REF_POWER_VALUE * L) / EXP_REF_POWER_AT_LEVEL);
}

/** @deprecated 対戦相手レベル未指定時のフォールバック。通常はプレイヤーと同レベルを渡す */
export const CPU_OPPONENT_LEVEL = 1;
