import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import { createInitialInventory } from '../user/inventory';
import {
  consumeTalismanFromCard,
  countEquippedTalismans,
  equipTalismanOnCard,
  isTalismanEquipped,
  tryEquipTalismanInDeck,
  tryUnequipTalismanInDeck,
  unequipTalismanFromCard,
} from './talisman';

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    name: 'test',
    pixels: [[null]],
    canvasSize: 1,
    attribute: 'attack',
    bp: 10,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('talisman card helpers', () => {
  it('equips and unequips on card', () => {
    const base = card();
    const equipped = equipTalismanOnCard(base);
    expect(isTalismanEquipped(equipped)).toBe(true);
    expect(unequipTalismanFromCard(equipped).talismanEquipped).toBe(false);
    expect(consumeTalismanFromCard(equipped).talismanEquipped).toBe(false);
  });
});

describe('countEquippedTalismans', () => {
  it('counts across decks', () => {
    const decks = [
      [card({ id: 'a', talismanEquipped: true }), card({ id: 'b' })],
      [card({ id: 'c', talismanEquipped: true }), null],
    ];
    expect(countEquippedTalismans(decks)).toBe(2);
  });
});

describe('tryEquipTalismanInDeck', () => {
  it('spends inventory and equips card', () => {
    const deck = [card({ id: 'a' }), null];
    const inventory = { ...createInitialInventory(), talisman: 1 };
    const result = tryEquipTalismanInDeck(deck, 'a', inventory);
    expect(result?.inventory.talisman).toBe(0);
    expect(isTalismanEquipped(result!.deck[0]!)).toBe(true);
  });

  it('returns null when inventory is empty', () => {
    const deck = [card({ id: 'a' })];
    expect(tryEquipTalismanInDeck(deck, 'a', createInitialInventory())).toBeNull();
  });
});

describe('tryUnequipTalismanInDeck', () => {
  it('returns talisman to inventory', () => {
    const deck = [card({ id: 'a', talismanEquipped: true })];
    const inventory = createInitialInventory();
    const result = tryUnequipTalismanInDeck(deck, 'a', inventory);
    expect(result?.inventory.talisman).toBe(1);
    expect(isTalismanEquipped(result!.deck[0]!)).toBe(false);
  });
});
