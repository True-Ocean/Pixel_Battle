import type { Card, CardRarity, CardStars, SaveData } from '../types';
import { DECK_MAX, USER_INITIAL_EXP, USER_INITIAL_LEVEL } from '../config/balance';
import { normalizeUserProfile } from '../user';

const STORAGE_KEY = 'dot5-battle-save-v1';

function emptySave(): SaveData {
  return { user: null, deck: [] };
}

function parseRarity(value: unknown): CardRarity {
  if (value === 'R' || value === 'SR' || value === 'UR' || value === 'L') {
    return value;
  }
  return 'N';
}

function parseStars(value: unknown): CardStars {
  if (value === 1 || value === 2 || value === 3) return value;
  return 0;
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

  const {
    hp: _legacyHp,
    wins,
    losses,
    reviveCount,
    rarity,
    stars,
    createdAt,
    ...rest
  } = raw;

  return {
    ...(rest as Omit<
      Card,
      'bp' | 'wins' | 'losses' | 'reviveCount' | 'rarity' | 'stars' | 'createdAt'
    >),
    bp,
    wins: typeof wins === 'number' ? wins : 0,
    losses: typeof losses === 'number' ? losses : 0,
    reviveCount: typeof reviveCount === 'number' ? reviveCount : 0,
    rarity: parseRarity(rarity),
    stars: parseStars(stars),
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
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

/** ユーザー戦績とカード勝敗のみ初期化（デッキ内容・ユーザー名は維持） */
export function resetBattleRecords(data: SaveData): SaveData {
  return {
    user: data.user
      ? {
          ...data.user,
          level: USER_INITIAL_LEVEL,
          exp: USER_INITIAL_EXP,
          battleWins: 0,
          battleLosses: 0,
        }
      : null,
    deck: data.deck.map((card) => ({
      ...card,
      wins: 0,
      losses: 0,
    })),
  };
}

/** @deprecated saveSave を使用 */
export function saveDeck(deck: SaveData['deck']): void {
  const current = loadSave();
  saveSave({ ...current, deck: deck.slice(0, DECK_MAX) });
}
