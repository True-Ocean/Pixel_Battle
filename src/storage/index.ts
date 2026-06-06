import type { SaveData } from '../types';
import { DECK_MAX } from '../config/balance';

const STORAGE_KEY = 'dot5-battle-save-v1';

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { deck: [] };
    const parsed = JSON.parse(raw) as SaveData;
    if (!Array.isArray(parsed.deck)) return { deck: [] };
    return { deck: parsed.deck.slice(0, DECK_MAX) };
  } catch {
    return { deck: [] };
  }
}

export function saveDeck(deck: SaveData['deck']): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ deck: deck.slice(0, DECK_MAX) }),
  );
}
