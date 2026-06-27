import { REVIVE_CAP } from '../config/economy';
import type { Card, CardStatus } from '../types';

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

export function canReviveLostCard(card: Card): boolean {
  return isCardLost(card) && card.reviveCount < REVIVE_CAP;
}

export function isReviveCapReached(card: Card): boolean {
  return card.reviveCount >= REVIVE_CAP;
}

/** ロストカードを復活（active 化 + reviveCount +1） */
export function applyCardRevive(card: Card): Card {
  if (!canReviveLostCard(card)) return card;
  return {
    ...markCardActive(card),
    reviveCount: card.reviveCount + 1,
  };
}
