import { recalculateCardBp } from './createCard';
import type { Card, CardRarity, CardStatus } from '../types';

export function normalizeCardStatus(status: unknown): CardStatus {
  return status === 'lost' ? 'lost' : 'active';
}

export function isCardLost(card: Card): boolean {
  return normalizeCardStatus(card.status) === 'lost';
}

export function isCardActive(card: Card): boolean {
  return !isCardLost(card);
}

export function markCardLost(card: Card): Card {
  if (isCardLost(card)) return card;
  return { ...card, status: 'lost' };
}

export function markCardActive(card: Card): Card {
  if (isCardActive(card)) return card;
  const { status: _status, ...rest } = card;
  return { ...rest, status: 'active' as const };
}

/** 降格復活可能なレア（R / SR のみ） */
export function canDowngradeRevive(card: Card): boolean {
  return isCardLost(card) && (card.rarity === 'R' || card.rarity === 'SR');
}

export function getDowngradedRarity(rarity: CardRarity): CardRarity | null {
  if (rarity === 'SR') return 'R';
  if (rarity === 'R') return 'N';
  return null;
}

/** ロストカードを完全復活（active 化 + reviveCount +1） */
export function applyCardFullRevive(card: Card): Card {
  if (!isCardLost(card)) return card;
  return {
    ...markCardActive(card),
    reviveCount: card.reviveCount + 1,
  };
}

/** ロストカードを降格復活（active 化、レア1段階下降、★維持、reviveCount 維持） */
export function applyCardDowngradeRevive(card: Card, userLevel: number): Card {
  if (!canDowngradeRevive(card)) return card;
  const nextRarity = getDowngradedRarity(card.rarity);
  if (!nextRarity) return card;

  const downgraded: Card = {
    ...markCardActive(card),
    rarity: nextRarity,
  };
  return {
    ...downgraded,
    bp: recalculateCardBp(downgraded, userLevel),
  };
}
