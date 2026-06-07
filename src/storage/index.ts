import type { Card, SaveData } from '../types';
import { DECK_MAX } from '../config/balance';
import { normalizeUserProfile } from '../user';

const STORAGE_KEY = 'dot5-battle-save-v1';

function emptySave(): SaveData {
  return { user: null, deck: [] };
}

function migrateCard(raw: Record<string, unknown>): Card | null {
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  if (!Array.isArray(raw.pixels)) return null;
  const bp =
    typeof raw.bp === 'number'
      ? raw.bp
      : typeof raw.hp === 'number'
        ? raw.hp
        : null;
  if (bp == null) return null;

  const { hp: _legacyHp, ...rest } = raw;
  return {
    ...(rest as Omit<Card, 'bp'>),
    bp,
  };
}

function migrateDeck(deck: unknown[]): Card[] {
  return deck
    .map((item) =>
      item && typeof item === 'object'
        ? migrateCard(item as Record<string, unknown>)
        : null,
    )
    .filter((card): card is Card => card != null)
    .slice(0, DECK_MAX);
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (!Array.isArray(parsed.deck)) return emptySave();
    return {
      user: normalizeUserProfile(parsed.user),
      deck: migrateDeck(parsed.deck),
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
