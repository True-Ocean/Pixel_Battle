import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import {
  addCardToMemoryAlbum,
  createInitialMemoryAlbum,
  memoryAlbumHasSpace,
  removeCardFromMemoryAlbumById,
  unlockMemoryAlbumRow,
} from './memoryAlbum';

function card(id: string): Card {
  return {
    id,
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
  };
}

describe('memoryAlbum', () => {
  it('starts with one unlocked row (5 slots)', () => {
    const album = createInitialMemoryAlbum();
    expect(album.unlockedRows).toBe(1);
    expect(memoryAlbumHasSpace(album)).toBe(true);
  });

  it('adds cards until full', () => {
    let album = createInitialMemoryAlbum();
    for (let i = 0; i < 5; i += 1) {
      const next = addCardToMemoryAlbum(album, card(`c${i}`));
      expect(next).not.toBeNull();
      album = next!;
    }
    expect(memoryAlbumHasSpace(album)).toBe(false);
    expect(addCardToMemoryAlbum(album, card('overflow'))).toBeNull();
  });

  it('unlocks another row', () => {
    const album = unlockMemoryAlbumRow(createInitialMemoryAlbum());
    expect(album.unlockedRows).toBe(2);
    expect(memoryAlbumHasSpace(album)).toBe(true);
  });

  it('removes card by id', () => {
    const withCard = addCardToMemoryAlbum(createInitialMemoryAlbum(), card('x'))!;
    const { album, card: removed } = removeCardFromMemoryAlbumById(withCard, 'x');
    expect(removed?.id).toBe('x');
    expect(album.cards).toHaveLength(0);
  });
});
