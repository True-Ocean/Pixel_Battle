import type { Attribute, Card, DeckLayout, MemoryAlbumState } from '../types';

const ALL_ATTRIBUTES: readonly Attribute[] = [
  'attack',
  'defense',
  'power',
  'bow',
  'dual',
  'poison',
  'heal',
  'ice',
  'storm',
  'ninja',
  'illuminate',
];

function addCardAttribute(attributes: Set<Attribute>, card: Card | null | undefined): void {
  if (card) {
    attributes.add(card.attribute);
  }
}

/** デッキと思い出アルバムに存在する属性の集合 */
export function collectOwnedAttributes(
  decks: readonly DeckLayout[],
  album: MemoryAlbumState,
): Set<Attribute> {
  const attributes = new Set<Attribute>();
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

export function hasAllAttributesCollected(
  decks: readonly DeckLayout[],
  album: MemoryAlbumState,
): boolean {
  const owned = collectOwnedAttributes(decks, album);
  return ALL_ATTRIBUTES.every((attribute) => owned.has(attribute));
}
