import type { Card } from '../types';

/** 出撃カードの生存/墓地送りに応じて wins（生存）/ losses（墓地）を更新する */
export function applyCardSurvivalRecords(
  deck: Card[],
  playerCardIds: string[],
  defeatedPlayerCardIds: string[],
): Card[] {
  const participated = new Set(playerCardIds);
  const defeated = new Set(defeatedPlayerCardIds);

  return deck.map((card) => {
    if (!participated.has(card.id)) return card;
    if (defeated.has(card.id)) {
      return { ...card, losses: card.losses + 1 };
    }
    return { ...card, wins: card.wins + 1 };
  });
}
