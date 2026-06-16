import type { CardRarity } from '../types';

/** v1 抽選対象のレア度 */
export type RollableCardRarity = 'N' | 'R' | 'SR';

export interface RarityMeta {
  label: CardRarity;
  ariaName: string;
  /** 丸バッジ */
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  /** リスト行の枠・背景 */
  rowBorder: string;
  rowBg: string;
  rowBorderWidth: string;
  rowBoxShadow?: string;
}

/** 新規作成時のデフォルト抽選（§9.2.1） */
export const CREATE_RARITY_DEFAULT: Record<RollableCardRarity, number> = {
  N: 0.92,
  R: 0.06,
  SR: 0.02,
};

/** 創作ボーナス達成時の抽選（§9.2.2） */
export const CREATE_RARITY_BONUS: Record<RollableCardRarity, number> = {
  N: 0.8,
  R: 0.15,
  SR: 0.05,
};

/** 創作ボーナス: 塗り比率の下限（100%） */
export const CREATE_BONUS_PAINT_RATIO = 1;

/** 創作ボーナス: 各色のキャンバス占有率の合計分子（(100-20)% を N 色で分配） */
export const CREATE_BONUS_COLOR_SHARE_TOTAL = 0.8;

export const RARITY_META: Record<CardRarity, RarityMeta> = {
  N: {
    label: 'N',
    ariaName: 'ノーマルレア',
    badgeBg: '#eef1f5',
    badgeBorder: '#a8b0bc',
    badgeText: '#5a6478',
    rowBorder: '#c8ced8',
    rowBg: '#fafafa',
    rowBorderWidth: '1px',
  },
  R: {
    label: 'R',
    ariaName: 'レア',
    badgeBg: '#d8efff',
    badgeBorder: '#3d9fd4',
    badgeText: '#0d5f8f',
    rowBorder: '#3d9fd4',
    rowBg: '#f2f9ff',
    rowBorderWidth: '1.5px',
  },
  SR: {
    label: 'SR',
    ariaName: 'スーパーレア',
    badgeBg: '#fff3c4',
    badgeBorder: '#c9a227',
    badgeText: '#7a5f00',
    rowBorder: '#c9a227',
    rowBg: '#fffbf0',
    rowBorderWidth: '2px',
  },
  UR: {
    label: 'UR',
    ariaName: 'ウルトラレア',
    badgeBg: '#ede4ff',
    badgeBorder: '#8b4fd4',
    badgeText: '#4a2080',
    rowBorder: '#8b4fd4',
    rowBg: '#f9f3ff',
    rowBorderWidth: '2px',
    rowBoxShadow: '0 0 6px #8b4fd433',
  },
  L: {
    label: 'L',
    ariaName: 'レジェンド',
    badgeBg: '#1e1e2e',
    badgeBorder: '#e8b923',
    badgeText: '#ffd95a',
    rowBorder: '#c41e3a',
    rowBg: '#fff8f5',
    rowBorderWidth: '2px',
    rowBoxShadow: '0 0 0 1px #e8b923',
  },
};

export const RARITY_ROLL_ORDER: RollableCardRarity[] = ['N', 'R', 'SR'];

export function getRarityMeta(rarity: CardRarity): RarityMeta {
  return RARITY_META[rarity];
}
