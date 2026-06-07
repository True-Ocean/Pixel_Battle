import type { Card } from '../types';

/** 出撃カードの生存/撃破に応じて wins / losses を更新する */
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
