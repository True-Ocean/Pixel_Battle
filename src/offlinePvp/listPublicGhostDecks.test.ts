import { describe, expect, it } from 'vitest';
import { SEED_GHOST_DECKS } from '../data/seedGhostDecks';
import {
  getPublicGhostDeckById,
  listPublicGhostDecks,
} from './listPublicGhostDecks';

describe('listPublicGhostDecks', () => {
  it('returns at least 8 seed decks', () => {
    const list = listPublicGhostDecks(10);
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.length).toBe(SEED_GHOST_DECKS.length);
  });

  it('prioritizes author levels near viewerLevel', () => {
    const list = listPublicGhostDecks(25);
    expect(list[0]?.authorLevel).toBe(25);
    const distances = list.map((g) => Math.abs(g.authorLevel - 25));
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]!).toBeGreaterThanOrEqual(distances[i - 1]!);
    }
  });

  it('does not mutate the seed pool when caller mutates the result', () => {
    const list = listPublicGhostDecks(10);
    const first = list[0]!;
    first.authorName = '改変';
    first.deck[0]!.bp = 1;
    const again = listPublicGhostDecks(10);
    expect(again[0]?.authorName).not.toBe('改変');
    expect(again[0]?.deck[0]?.bp).not.toBe(1);
  });

  it('each deck has exactly 5 cards', () => {
    for (const ghost of listPublicGhostDecks(1)) {
      expect(ghost.deck).toHaveLength(5);
      expect(ghost.authorName).not.toBe('CPU');
    }
  });

  it('seed cards expose battle record and limit-break stars', () => {
    const veteran = listPublicGhostDecks(45).find(
      (ghost) => ghost.authorLevel === 45,
    );
    expect(veteran).toBeDefined();
    const card = veteran!.deck[0]!;
    expect(card.wins).toBeGreaterThan(0);
    expect(card.losses).toBeGreaterThan(0);
    expect(card.stars).toBeGreaterThanOrEqual(0);
    expect(card.stars).toBeLessThanOrEqual(3);
  });
});


describe('getPublicGhostDeckById', () => {
  it('returns a clone for a known id', () => {
    const id = SEED_GHOST_DECKS[0]!.id;
    const ghost = getPublicGhostDeckById(id);
    expect(ghost?.id).toBe(id);
    expect(ghost?.deck).toHaveLength(5);
  });

  it('returns null for unknown id', () => {
    expect(getPublicGhostDeckById('missing')).toBeNull();
  });
});
