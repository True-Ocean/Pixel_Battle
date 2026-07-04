import { describe, expect, it } from 'vitest';
import {
  getPublicGhostDeckById,
  getPublicGhostDeckListEmptyMessage,
  listPublicGhostDecks,
  sortByViewerLevel,
} from './listPublicGhostDecks';
import type { PublicGhostDeck } from './types';
import type { Card } from '../types';

function stubCard(id: string): Card {
  return {
    id,
    name: id,
    pixels: [[null]],
    canvasSize: 1,
    attribute: 'attack',
    bp: 100,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '2026-07-04T00:00:00.000Z',
  };
}

function stubDeck(
  id: string,
  authorLevel: number,
  ownerId?: string,
): PublicGhostDeck {
  return {
    id,
    authorName: id,
    authorLevel,
    offlinePvpWins: 0,
    offlinePvpLosses: 0,
    deck: [
      stubCard(`${id}-0`),
      stubCard(`${id}-1`),
      stubCard(`${id}-2`),
      stubCard(`${id}-3`),
      stubCard(`${id}-4`),
    ],
    ...(ownerId ? { ownerId } : {}),
  };
}

describe('listPublicGhostDecks', () => {
  it('returns not_configured when supabase is not configured', async () => {
    const result = await listPublicGhostDecks(10);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('not_configured');
    }
  });
});

describe('getPublicGhostDeckListEmptyMessage', () => {
  it('uses empty copy when fetch succeeded with no decks', () => {
    expect(getPublicGhostDeckListEmptyMessage({ ok: true, decks: [] })).toEqual({
      title: '公開デッキがありません',
    });
  });

  it('uses connection copy when not configured', () => {
    const message = getPublicGhostDeckListEmptyMessage({
      ok: false,
      reason: 'not_configured',
    });
    expect(message.title).toContain('表示できません');
    expect(message.hint).toBeTruthy();
  });

  it('uses network copy when fetch failed', () => {
    const message = getPublicGhostDeckListEmptyMessage({
      ok: false,
      reason: 'fetch_failed',
      error: 'network',
    });
    expect(message.title).toContain('取得できませんでした');
    expect(message.hint).toContain('通信環境');
  });
});

describe('getPublicGhostDeckById', () => {
  it('returns null for unknown id when supabase is not configured', async () => {
    expect(await getPublicGhostDeckById('missing')).toBeNull();
  });
});

describe('sortByViewerLevel', () => {
  it('sorts by level distance then authorLevel then id', () => {
    const decks = [
      stubDeck('a', 50, 'owner-a'),
      stubDeck('b', 10, 'owner-b'),
      stubDeck('c', 12, 'owner-c'),
    ];
    const sorted = sortByViewerLevel(decks, 12);
    expect(sorted.map((d) => d.id)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the input array order source when cloning sort', () => {
    const decks = [stubDeck('a', 50), stubDeck('b', 10)];
    const originalOrder = decks.map((d) => d.id);
    sortByViewerLevel(decks, 12);
    expect(decks.map((d) => d.id)).toEqual(originalOrder);
  });
});
