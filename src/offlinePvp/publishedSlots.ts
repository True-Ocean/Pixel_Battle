import { DECK_SLOT_COUNT } from '../config/balance';

/** スロットごとの公開ON/OFF（長さ DECK_SLOT_COUNT） */
export function normalizePublishedDeckSlots(
  raw: unknown,
): boolean[] {
  const slots = Array.from({ length: DECK_SLOT_COUNT }, () => false);
  if (!Array.isArray(raw)) return slots;
  for (let i = 0; i < DECK_SLOT_COUNT; i++) {
    slots[i] = raw[i] === true;
  }
  return slots;
}

/** スロットごとのリモート公開ID */
export function normalizePublishedDeckRemoteIds(
  raw: unknown,
): (string | null)[] {
  const ids = Array.from({ length: DECK_SLOT_COUNT }, () => null as string | null);
  if (!Array.isArray(raw)) return ids;
  for (let i = 0; i < DECK_SLOT_COUNT; i++) {
    const value = raw[i];
    ids[i] = typeof value === 'string' && value.length > 0 ? value : null;
  }
  return ids;
}

export function setPublishedSlot(
  slots: readonly boolean[],
  index: number,
  published: boolean,
): boolean[] {
  const next = normalizePublishedDeckSlots(slots);
  if (index < 0 || index >= DECK_SLOT_COUNT) return next;
  next[index] = published;
  return next;
}

export function setPublishedRemoteId(
  ids: readonly (string | null)[],
  index: number,
  remoteId: string | null,
): (string | null)[] {
  const next = normalizePublishedDeckRemoteIds(ids);
  if (index < 0 || index >= DECK_SLOT_COUNT) return next;
  next[index] = remoteId;
  return next;
}
