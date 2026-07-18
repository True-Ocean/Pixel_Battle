import { describe, expect, it, vi } from 'vitest';
import { createEmptyDeckSlots } from '../deckSlots';
import { createInitialProfile } from '../user/profile';
import { republishOwnedPublishedDecks } from './republishPublishedDecks';

vi.mock('./publish', () => ({
  canPublishDeck: vi.fn(() => true),
  unpublishDeck: vi.fn(async () => ({ ok: true as const })),
  upsertPublishedDeck: vi.fn(async () => ({
    ok: true as const,
    remoteId: 'new-remote-id',
  })),
}));

import { unpublishDeck, upsertPublishedDeck } from './publish';

describe('republishOwnedPublishedDecks', () => {
  it('Lv10 未満ではリモート公開を止め、端末の公開 ON は維持する', async () => {
    vi.mocked(unpublishDeck).mockClear();
    vi.mocked(upsertPublishedDeck).mockClear();

    const user = { ...createInitialProfile('tester'), level: 5, exp: 0 };
    const result = await republishOwnedPublishedDecks({
      publishedSlots: [true, false, false, false, false],
      remoteIds: ['remote-1', null, null, null, null],
      decks: createEmptyDeckSlots(),
      user,
      unlockedDeckCount: 1,
    });

    expect(unpublishDeck).toHaveBeenCalledTimes(1);
    expect(upsertPublishedDeck).not.toHaveBeenCalled();
    expect(result.slots[0]).toBe(true);
    expect(result.remoteIds[0]).toBeNull();
    expect(result.changed).toBe(true);
  });

  it('Lv10 以上では公開 ON のスロットを upsert する', async () => {
    vi.mocked(unpublishDeck).mockClear();
    vi.mocked(upsertPublishedDeck).mockClear();

    const user = { ...createInitialProfile('tester'), level: 10, exp: 0 };
    const result = await republishOwnedPublishedDecks({
      publishedSlots: [true, false, false, false, false],
      remoteIds: [null, null, null, null, null],
      decks: createEmptyDeckSlots(),
      deckNames: ['最強デッキ'],
      user,
      unlockedDeckCount: 1,
    });

    expect(unpublishDeck).not.toHaveBeenCalled();
    expect(upsertPublishedDeck).toHaveBeenCalledWith(
      expect.objectContaining({ slotIndex: 0, deckName: '最強デッキ' }),
    );
    expect(result.remoteIds[0]).toBe('new-remote-id');
    expect(result.changed).toBe(true);
  });
});
