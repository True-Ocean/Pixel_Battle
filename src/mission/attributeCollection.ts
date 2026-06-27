import type { Card, CardRarity, DeckLayout, MemoryAlbumState } from '../types';

function addCardAttribute(
  attributes: Set<import('../types').Attribute>,
  card: Card | null | undefined,
): void {
  if (card) {
    attributes.add(card.attribute);
  }
}

function addCardRarity(
  rarities: Set<CardRarity>,
  card: Card | null | undefined,
): void {
  if (card) {
    rarities.add(card.rarity);
  }
}

/** デッキと思い出アルバムに存在する属性の集合 */
export function collectOwnedAttributes(
  decks: readonly DeckLayout[],
  album: MemoryAlbumState,
): Set<import('../types').Attribute> {
  const attributes = new Set<import('../types').Attribute>();
  for (const deck of decks) {
    for (const card of deck) {
      addCardAttribute(attributes, card);
    }
  }
  for (const card of album.cards) {
    attributes.add(card.attribute);
  }
  return attributes;
}

/** デッキと思い出アルバムに存在するレア度の集合 */
export function collectOwnedRarities(
  decks: readonly DeckLayout[],
  album: MemoryAlbumState,
): Set<CardRarity> {
  const rarities = new Set<CardRarity>();
  for (const deck of decks) {
    for (const card of deck) {
      addCardRarity(rarities, card);
    }
  }
  for (const card of album.cards) {
    rarities.add(card.rarity);
  }
  return rarities;
}

export function deckContainsAttribute(
  deck: readonly Card[],
  attribute: import('../types').Attribute,
): boolean {
  return deck.some((card) => card.attribute === attribute);
}

export function deckContainsRarity(
  deck: readonly Card[],
  rarity: CardRarity,
): boolean {
  return countRarityInDeck(deck, rarity) > 0;
}

export function countOwnedRarity(
  decks: readonly DeckLayout[],
  album: MemoryAlbumState,
  rarity: CardRarity,
): number {
  let count = 0;
  for (const deck of decks) {
    for (const card of deck) {
      if (card?.rarity === rarity) count += 1;
    }
  }
  for (const card of album.cards) {
    if (card.rarity === rarity) count += 1;
  }
  return count;
}

export function countRarityInDeck(
  deck: readonly Card[],
  rarity: CardRarity,
): number {
  return deck.filter((card) => card.rarity === rarity).length;
}
