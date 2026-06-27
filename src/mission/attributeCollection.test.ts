import { describe, expect, it } from 'vitest';
import type { Attribute, Card, DeckLayout } from '../types';
import { createInitialMemoryAlbum } from '../user/memoryAlbum';
import {
  collectOwnedAttributes,
  collectOwnedRarities,
  countRarityInDeck,
  deckContainsAttribute,
  deckContainsRarity,
} from './attributeCollection';

function card(
  id: string,
  attribute: Attribute,
  rarity: Card['rarity'] = 'N',
): Card {
  return {
    id,
    name: id,
    pixels: [[null]],
    canvasSize: 1,
    attribute,
    bp: 100,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity,
    stars: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('attributeCollection', () => {
  it('collects attributes from all decks and memory album', () => {
    const decks: DeckLayout[] = [
      [card('a', 'attack'), card('b', 'defense'), null, null, null],
    ];
    const album = createInitialMemoryAlbum();
    album.cards.push(card('c', 'heal'));

    const owned = collectOwnedAttributes(decks, album);
    expect(owned.has('attack')).toBe(true);
    expect(owned.has('defense')).toBe(true);
    expect(owned.has('heal')).toBe(true);
    expect(owned.has('ninja')).toBe(false);
  });

  it('collects rarities from all decks and memory album', () => {
    const decks: DeckLayout[] = [[card('a', 'attack', 'R'), null, null, null, null]];
    const album = createInitialMemoryAlbum();
    album.cards.push(card('b', 'defense', 'SR'));

    const owned = collectOwnedRarities(decks, album);
    expect(owned.has('R')).toBe(true);
    expect(owned.has('SR')).toBe(true);
    expect(owned.has('UR')).toBe(false);
  });

  it('detects deck composition for attribute and rarity wins', () => {
    const deck = [card('a', 'ice', 'SR'), card('b', 'attack', 'N')];
    expect(deckContainsAttribute(deck, 'ice')).toBe(true);
    expect(deckContainsAttribute(deck, 'poison')).toBe(false);
    expect(deckContainsRarity(deck, 'SR')).toBe(true);
    expect(deckContainsRarity(deck, 'R')).toBe(false);
    expect(countRarityInDeck(deck, 'SR')).toBe(1);
  });
});
