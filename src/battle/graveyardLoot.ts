import type { BattleUnit } from '../types/battle';
import type { BattleOutcome, Card } from '../types';

/** 撃破ユニットとデッキから、墓地戦利品用のカードを組み立てる */
export function buildDefeatedCpuLootCards(
  defeatedUnits: BattleUnit[],
  battleDeck: readonly Card[],
): Card[] {
  const deckById = new Map(battleDeck.map((card) => [card.id, card]));
  return defeatedUnits
    .map((unit) => {
      const card = deckById.get(unit.cardId);
      if (!card) return null;
      return {
        ...card,
        rarity: unit.rarity,
        stars: unit.stars,
      };
    })
    .filter((card): card is Card => card != null);
}

/** バトル結果から戦利品モーダル用の相手カードを解決する（相手デッキスナップショット優先） */
export function resolveGraveyardLootCards(outcome: BattleOutcome): Card[] {
  const defeatedIds = new Set(outcome.defeatedCpuCards.map((card) => card.id));
  const rarityById = new Map(
    outcome.defeatedCpuCards.map((card) => [card.id, card.rarity]),
  );
  const starsById = new Map(
    outcome.defeatedCpuCards.map((card) => [card.id, card.stars]),
  );
  const deckSource =
    outcome.opponent.deck.length > 0
      ? outcome.opponent.deck
      : outcome.defeatedCpuCards;

  return deckSource
    .filter((card) => defeatedIds.has(card.id))
    .map((card) => ({
      ...card,
      rarity: rarityById.get(card.id) ?? card.rarity,
      stars: starsById.get(card.id) ?? card.stars,
    }));
}
