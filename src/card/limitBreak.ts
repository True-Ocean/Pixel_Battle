import { getRarityMeta } from '../config/rarity';
import type { CardRarity, CardStars } from '../types';

const STAR_EMPTY_COLOR = '#c8ced8';

export function formatLimitBreakStars(stars: CardStars): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

export function getLimitBreakStarColor(
  filled: boolean,
  rarity: CardRarity,
): string {
  return filled ? getRarityMeta(rarity).rowBorder : STAR_EMPTY_COLOR;
}
