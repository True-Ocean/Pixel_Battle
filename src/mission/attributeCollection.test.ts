import { describe, expect, it } from 'vitest';
import type { Attribute, Card, DeckLayout } from '../types';
import { createInitialMemoryAlbum } from '../user/memoryAlbum';
import {
  collectOwnedAttributes,
  hasAllAttributesCollected,
} from './attributeCollection';

function card(id: string, attribute: Attribute): Card {
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
    rarity: 'N',
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

  it('detects when all 11 attributes are owned', () => {
    const attributes: Attribute[] = [
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
    const decks: DeckLayout[] = [
      attributes.slice(0, 5).map((attribute, index) => card(`d${index}`, attribute)),
    ];
    const album = createInitialMemoryAlbum();
    album.cards.push(
      ...attributes.slice(5).map((attribute, index) => card(`a${index}`, attribute)),
    );

    expect(hasAllAttributesCollected(decks, album)).toBe(true);
  });
});
