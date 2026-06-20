import {
  getMemoryAlbumCapacity,
  MEMORY_ALBUM_INITIAL_ROWS,
} from '../config/economy';
import { markCardActive } from '../card/status';
import type { Card, MemoryAlbumState } from '../types';

export function createInitialMemoryAlbum(): MemoryAlbumState {
  return {
    cards: [],
    unlockedRows: MEMORY_ALBUM_INITIAL_ROWS,
  };
}

export function normalizeMemoryAlbum(raw: unknown): MemoryAlbumState {
  if (raw == null || typeof raw !== 'object') {
    return createInitialMemoryAlbum();
  }
  const candidate = raw as {
    cards?: unknown;
    unlockedRows?: unknown;
  };
  const cards = Array.isArray(candidate.cards)
    ? candidate.cards.filter((entry): entry is Card => {
        return (
          entry != null &&
          typeof entry === 'object' &&
          typeof (entry as Card).id === 'string'
        );
      })
    : [];
  const unlockedRows =
    typeof candidate.unlockedRows === 'number' &&
    Number.isFinite(candidate.unlockedRows)
      ? Math.max(MEMORY_ALBUM_INITIAL_ROWS, Math.floor(candidate.unlockedRows))
      : MEMORY_ALBUM_INITIAL_ROWS;
  return { cards, unlockedRows };
}

export function memoryAlbumHasSpace(album: MemoryAlbumState): boolean {
  return album.cards.length < getMemoryAlbumCapacity(album.unlockedRows);
}

export function archiveCardForMemoryAlbum(card: Card): Card {
  return markCardActive(card);
}

export function addCardToMemoryAlbum(
  album: MemoryAlbumState,
  card: Card,
): MemoryAlbumState | null {
  if (!memoryAlbumHasSpace(album)) return null;
  return {
    ...album,
    cards: [...album.cards, archiveCardForMemoryAlbum(card)],
  };
}

export function removeCardFromMemoryAlbumById(
  album: MemoryAlbumState,
  cardId: string,
): { album: MemoryAlbumState; card: Card | null } {
  const index = album.cards.findIndex((entry) => entry.id === cardId);
  if (index < 0) {
    return { album, card: null };
  }
  const card = album.cards[index]!;
  const cards = album.cards.filter((entry) => entry.id !== cardId);
  return { album: { ...album, cards }, card };
}

export function unlockMemoryAlbumRow(album: MemoryAlbumState): MemoryAlbumState {
  return {
    ...album,
    unlockedRows: album.unlockedRows + 1,
  };
}
