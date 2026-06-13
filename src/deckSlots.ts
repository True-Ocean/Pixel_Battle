import { DECK_SLOT_COUNT, DECK_SLOT_INITIAL_UNLOCKED } from './config/balance';
import type { Card } from './types';

export function createEmptyDeckSlots(): Card[][] {
  return Array.from({ length: DECK_SLOT_COUNT }, () => []);
}

export function clampDeckSlotIndex(index: number): number {
  return Math.max(0, Math.min(DECK_SLOT_COUNT - 1, Math.floor(index)));
}

export function clampUnlockedDeckCount(count: number): number {
  return Math.max(
    DECK_SLOT_INITIAL_UNLOCKED,
    Math.min(DECK_SLOT_COUNT, Math.floor(count)),
  );
}

export function isDeckSlotUnlocked(
  slotIndex: number,
  unlockedDeckCount: number,
): boolean {
  return slotIndex >= 0 && slotIndex < unlockedDeckCount;
}

export function normalizeDeckSlots(raw: Card[][]): Card[][] {
  const slots = createEmptyDeckSlots();
  for (let i = 0; i < DECK_SLOT_COUNT; i++) {
    slots[i] = Array.isArray(raw[i]) ? raw[i]! : [];
  }
  return slots;
}

export function updateDeckAtIndex(
  decks: Card[][],
  slotIndex: number,
  nextDeck: Card[],
): Card[][] {
  const index = clampDeckSlotIndex(slotIndex);
  return decks.map((deck, i) => (i === index ? nextDeck : deck));
}

export function resetAllDeckCardRecords(decks: Card[][]): Card[][] {
  return decks.map((deck) =>
    deck.map((card) => ({
      ...card,
      wins: 0,
      losses: 0,
    })),
  );
}
