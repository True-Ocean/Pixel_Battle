/**
 * プロトタイプ調整パラメータ（単一参照: docs/PROTOTYPE_DEVELOPMENT_SPEC.md §13）
 */

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

export const HP_RANGE: Record<'attack' | 'defense', { min: number; max: number }> = {
  attack: { min: 70, max: 100 },
  defense: { min: 55, max: 85 },
};
