import {
  calcLimitBreakBpGain,
  LIMIT_BREAK_SHARDS_REQUIRED,
} from '../config/economy';
import { getRarityMeta } from '../config/rarity';
import { getCardFoundationBp } from './createCard';
import { isCardLost } from './status';
import type { Card, CardRarity, CardStars } from '../types';

const STAR_EMPTY_COLOR = '#c8ced8';

export type LimitBreakOutcomeKind = 'star' | 'rarity';

export type LimitBreakShardSpendPlan = {
  attrSpend: number;
  universalSpend: number;
};

/** 限界突破1回分（10個）の消費内訳。専用かけらを優先し、不足分を汎用で補う（デフォルト案）。 */
export function planLimitBreakShardSpend(
  attributeShardCount: number,
  universalShardCount: number,
): LimitBreakShardSpendPlan | null {
  const total = attributeShardCount + universalShardCount;
  if (total < LIMIT_BREAK_SHARDS_REQUIRED) return null;

  const attrSpend = Math.min(attributeShardCount, LIMIT_BREAK_SHARDS_REQUIRED);
  const universalSpend = LIMIT_BREAK_SHARDS_REQUIRED - attrSpend;
  if (universalSpend > universalShardCount) return null;

  return { attrSpend, universalSpend };
}

export function getLimitBreakAttrSpendRange(
  attributeShardCount: number,
  universalShardCount: number,
): { min: number; max: number } | null {
  if (planLimitBreakShardSpend(attributeShardCount, universalShardCount) == null) {
    return null;
  }
  const min = Math.max(0, LIMIT_BREAK_SHARDS_REQUIRED - universalShardCount);
  const max = Math.min(attributeShardCount, LIMIT_BREAK_SHARDS_REQUIRED);
  if (min > max) return null;
  return { min, max };
}

export function defaultLimitBreakAttrSpend(
  attributeShardCount: number,
  universalShardCount: number,
): number {
  return (
    planLimitBreakShardSpend(attributeShardCount, universalShardCount)?.attrSpend ??
    getLimitBreakAttrSpendRange(attributeShardCount, universalShardCount)?.min ??
    0
  );
}

export function isValidLimitBreakShardSpend(
  spend: LimitBreakShardSpendPlan,
  attributeShardCount: number,
  universalShardCount: number,
): boolean {
  const { attrSpend, universalSpend } = spend;
  if (!Number.isInteger(attrSpend) || !Number.isInteger(universalSpend)) return false;
  if (attrSpend < 0 || universalSpend < 0) return false;
  if (attrSpend + universalSpend !== LIMIT_BREAK_SHARDS_REQUIRED) return false;
  if (attrSpend > attributeShardCount) return false;
  if (universalSpend > universalShardCount) return false;
  return true;
}

export function describeLimitBreakSpendPlan(
  attributeLabel: string,
  spend: LimitBreakShardSpendPlan,
): string {
  const parts: string[] = [];
  if (spend.attrSpend > 0) {
    parts.push(`${attributeLabel}のかけら ${spend.attrSpend}`);
  }
  if (spend.universalSpend > 0) {
    parts.push(`汎用 ${spend.universalSpend}`);
  }
  return parts.join(' + ');
}

export function describeLimitBreakCost(
  attributeLabel: string,
  attributeShardCount: number,
  universalShardCount: number,
): string {
  const plan = planLimitBreakShardSpend(attributeShardCount, universalShardCount);
  if (!plan) return '';
  return describeLimitBreakSpendPlan(attributeLabel, plan);
}

export function formatLimitBreakStars(stars: CardStars): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

export function getLimitBreakStarColor(
  filled: boolean,
  rarity: CardRarity,
): string {
  return filled ? getRarityMeta(rarity).rowBorder : STAR_EMPTY_COLOR;
}

export function getUpgradedRarity(rarity: CardRarity): CardRarity | null {
  if (rarity === 'N') return 'R';
  if (rarity === 'R') return 'SR';
  return null;
}

/** v1 上限: SR★3 まで（UR 未実装のためレア昇格不可） */
export function isLimitBreakCapReached(card: Card): boolean {
  return card.rarity === 'SR' && card.stars >= 3;
}

export function getLimitBreakOutcomeKind(card: Card): LimitBreakOutcomeKind | null {
  if (isLimitBreakCapReached(card)) return null;
  if (card.stars < 3) return 'star';
  return getUpgradedRarity(card.rarity) ? 'rarity' : null;
}

export function canLimitBreakCard(card: Card): boolean {
  return !isCardLost(card) && getLimitBreakOutcomeKind(card) != null;
}

export function applyLimitBreakToCard(card: Card, userLevel: number): Card {
  const kind = getLimitBreakOutcomeKind(card);
  if (!kind) return card;

  let next: Card;
  if (kind === 'star') {
    const nextStars = Math.min(3, card.stars + 1) as CardStars;
    next = { ...card, stars: nextStars };
  } else {
    const nextRarity = getUpgradedRarity(card.rarity);
    if (!nextRarity) return card;
    next = { ...card, rarity: nextRarity, stars: 0 };
  }

  const gain = calcLimitBreakBpGain(getCardFoundationBp(card, userLevel));
  return {
    ...next,
    bp: card.bp + gain,
  };
}

export function describeLimitBreakResult(card: Card): string {
  const kind = getLimitBreakOutcomeKind(card);
  if (!kind) return '限界突破の上限に達しています';
  if (kind === 'star') {
    return `★${card.stars} → ★${card.stars + 1}`;
  }
  const nextRarity = getUpgradedRarity(card.rarity);
  return nextRarity
    ? `${card.rarity}★3 → ${nextRarity}★0`
    : 'レア昇格';
}
