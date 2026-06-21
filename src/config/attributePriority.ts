import type { Attribute, CardRarity, CardStars } from '../types';

/** tie-break 用（大きいほど先に行動）。ATTRIBUTE_SPEC §3.1 */
export const ATTRIBUTE_PRIORITY: Record<Attribute, number> = {
  attack: 1,
  defense: 2,
  power: 3,
  bow: 4,
  dual: 5,
  poison: 6,
  heal: 7,
  ice: 8,
  storm: 9,
  ninja: 10,
  illuminate: 11,
};

const RARITY_ORDER: Record<CardRarity, number> = {
  N: 0,
  R: 1,
  SR: 2,
  UR: 3,
  L: 4,
};

export interface ActionOrderUnit {
  currentBp: number;
  attribute: Attribute;
  rarity: CardRarity;
  stars: CardStars;
}

export interface CompareActionOrderOptions {
  /** 同率時の乱数（0〜1）。テストでは固定値を渡す */
  random?: () => number;
}

/**
 * 行動解決順: currentBp 降順 → 属性 → レア → ★ → ランダム
 * @returns 負: a を先に、正: b を先に
 */
export function compareActionOrder(
  a: ActionOrderUnit,
  b: ActionOrderUnit,
  options: CompareActionOrderOptions = {},
): number {
  if (a.currentBp !== b.currentBp) return b.currentBp - a.currentBp;

  const attrA = ATTRIBUTE_PRIORITY[a.attribute];
  const attrB = ATTRIBUTE_PRIORITY[b.attribute];
  if (attrA !== attrB) return attrB - attrA;

  const rareA = RARITY_ORDER[a.rarity];
  const rareB = RARITY_ORDER[b.rarity];
  if (rareA !== rareB) return rareB - rareA;

  if (a.stars !== b.stars) return b.stars - a.stars;

  const random = options.random ?? Math.random;
  return random() < 0.5 ? -1 : 1;
}
