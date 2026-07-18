import { DECK_SLOT_COUNT } from '../config/balance';
import { getDeckDisplayName, normalizeDeckLayout } from '../deckSlots';
import type { DeckLayout, UserProfile } from '../types';
import { canPublishDeck, unpublishDeck, upsertPublishedDeck } from './publish';
import {
  clearPublishedDeckRemoteIds,
  normalizePublishedDeckRemoteIds,
  normalizePublishedDeckSlots,
  setPublishedRemoteId,
  setPublishedSlot,
} from './publishedSlots';
import { isOfflinePvpUnlockedAtUserLevel } from './unlock';

/** Lv 不足などでリモート公開だけ止める（端末の公開 ON 意図は維持） */
async function suspendRemotePublishedDecks(options: {
  publishedSlots: readonly boolean[];
  remoteIds: readonly (string | null)[];
}): Promise<{ remoteIds: (string | null)[]; changed: boolean }> {
  let ids = normalizePublishedDeckRemoteIds(options.remoteIds);
  let changed = false;

  for (let slotIndex = 0; slotIndex < DECK_SLOT_COUNT; slotIndex++) {
    if (!ids[slotIndex]) continue;
    const result = await unpublishDeck({
      slotIndex,
      remoteId: ids[slotIndex],
    });
    if (result.ok) {
      ids = setPublishedRemoteId(ids, slotIndex, null);
      changed = true;
    }
  }

  return { remoteIds: ids, changed };
}

/** 認証切替後など、端末に残った remoteId を使わず公開デッキを現在の owner に揃える */
export async function republishOwnedPublishedDecks(options: {
  publishedSlots: readonly boolean[];
  remoteIds: readonly (string | null)[];
  decks: readonly DeckLayout[];
  deckNames?: string[];
  user: UserProfile;
  unlockedDeckCount: number;
  /** true のとき stored remoteId を無視する（auth user_id 変更後） */
  resetRemoteIds?: boolean;
}): Promise<{
  slots: boolean[];
  remoteIds: (string | null)[];
  changed: boolean;
}> {
  let slots = normalizePublishedDeckSlots(options.publishedSlots);
  let ids = options.resetRemoteIds
    ? clearPublishedDeckRemoteIds()
    : normalizePublishedDeckRemoteIds(options.remoteIds);
  let changed = options.resetRemoteIds ?? false;

  if (!isOfflinePvpUnlockedAtUserLevel(options.user.level)) {
    const suspended = await suspendRemotePublishedDecks({
      publishedSlots: slots,
      remoteIds: ids,
    });
    return { slots, remoteIds: suspended.remoteIds, changed: changed || suspended.changed };
  }

  for (let slotIndex = 0; slotIndex < options.unlockedDeckCount; slotIndex++) {
    if (!slots[slotIndex]) continue;
    const layout = normalizeDeckLayout(options.decks[slotIndex] ?? []);
    if (!canPublishDeck(layout)) {
      const result = await unpublishDeck({ slotIndex, remoteId: ids[slotIndex] });
      if (result.ok) {
        slots = setPublishedSlot(slots, slotIndex, false);
        ids = setPublishedRemoteId(ids, slotIndex, null);
        changed = true;
      }
      continue;
    }
    const result = await upsertPublishedDeck({
      slotIndex,
      deckName: getDeckDisplayName(slotIndex, options.deckNames),
      deck: layout,
      user: options.user,
      remoteId: ids[slotIndex],
    });
    if (result.ok && result.remoteId !== ids[slotIndex]) {
      ids = setPublishedRemoteId(ids, slotIndex, result.remoteId);
      changed = true;
    }
  }

  return { slots, remoteIds: ids, changed };
}
