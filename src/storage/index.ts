import type { SaveData } from '../types';
import { DECK_MAX } from '../config/balance';
import { normalizeUserProfile } from '../user';

const STORAGE_KEY = 'dot5-battle-save-v1';

function emptySave(): SaveData {
  return { user: null, deck: [] };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (!Array.isArray(parsed.deck)) return emptySave();
    return {
      user: normalizeUserProfile(parsed.user),
      deck: parsed.deck.slice(0, DECK_MAX),
    };
  } catch {
    return emptySave();
  }
}

export function saveSave(data: SaveData): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: data.user,
      deck: data.deck.slice(0, DECK_MAX),
    }),
  );
}

/** @deprecated saveSave を使用 */
export function saveDeck(deck: SaveData['deck']): void {
  const current = loadSave();
  saveSave({ ...current, deck: deck.slice(0, DECK_MAX) });
}
