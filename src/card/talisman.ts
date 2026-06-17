import type { Card, DeckLayout, UserInventory } from '../types';
import { addInventoryCount, spendInventoryCount } from '../user/inventory';

export function normalizeTalismanEquipped(value: unknown): boolean {
  return value === true;
}

export function isTalismanEquipped(card: Pick<Card, 'talismanEquipped'>): boolean {
  return card.talismanEquipped === true;
}

export function equipTalismanOnCard(card: Card): Card {
  if (isTalismanEquipped(card)) return card;
  return { ...card, talismanEquipped: true };
}

export function unequipTalismanFromCard(card: Card): Card {
  if (!isTalismanEquipped(card)) return card;
  return { ...card, talismanEquipped: false };
}

/** 敗北時の護符発動（インベントリは装備時に既に消費済み） */
export function consumeTalismanFromCard(card: Card): Card {
  return unequipTalismanFromCard(card);
}

export function countEquippedTalismans(decks: readonly DeckLayout[]): number {
  let count = 0;
  for (const deck of decks) {
    for (const card of deck) {
      if (card != null && isTalismanEquipped(card)) {
        count += 1;
      }
    }
  }
  return count;
}

export function updateCardInDeckLayout(
  deck: DeckLayout,
  cardId: string,
  updater: (card: Card) => Card,
): DeckLayout {
  return deck.map((card) => (card?.id === cardId ? updater(card) : card));
}

export interface TalismanDeckMutationResult {
  deck: DeckLayout;
  inventory: UserInventory;
}

export function tryEquipTalismanInDeck(
  deck: DeckLayout,
  cardId: string,
  inventory: UserInventory,
): TalismanDeckMutationResult | null {
  const target = deck.find((card) => card?.id === cardId);
  if (target == null || isTalismanEquipped(target)) return null;

  const nextInventory = spendInventoryCount(inventory, 'talisman', 1);
  if (!nextInventory) return null;

  return {
    deck: updateCardInDeckLayout(deck, cardId, equipTalismanOnCard),
    inventory: nextInventory,
  };
}

export function tryUnequipTalismanInDeck(
  deck: DeckLayout,
  cardId: string,
  inventory: UserInventory,
): TalismanDeckMutationResult | null {
  const target = deck.find((card) => card?.id === cardId);
  if (target == null || !isTalismanEquipped(target)) return null;

  return {
    deck: updateCardInDeckLayout(deck, cardId, unequipTalismanFromCard),
    inventory: addInventoryCount(inventory, 'talisman', 1),
  };
}
