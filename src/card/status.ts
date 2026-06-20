import { REVIVE_CAP } from '../config/economy';
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

export function canReviveLostCard(card: Card): boolean {
  return isCardLost(card) && card.reviveCount < REVIVE_CAP;
}

export function isReviveCapReached(card: Card): boolean {
  return card.reviveCount >= REVIVE_CAP;
}

/** @deprecated 降格復活は廃止 */
export function canDowngradeRevive(_card: Card): boolean {
  return false;
}

/** @deprecated 降格復活は廃止 */
export function getDowngradedRarity(rarity: CardRarity): CardRarity | null {
  if (rarity === 'SR') return 'R';
  if (rarity === 'R') return 'N';
  return null;
}

/** ロストカードを復活（active 化 + reviveCount +1） */
export function applyCardFullRevive(card: Card): Card {
  if (!canReviveLostCard(card)) return card;
  return {
    ...markCardActive(card),
    reviveCount: card.reviveCount + 1,
  };
}

/** @deprecated 降格復活は廃止 */
export function applyCardDowngradeRevive(card: Card, _userLevel: number): Card {
  return card;
}
