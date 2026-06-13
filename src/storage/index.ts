import type { BattleHistoryEntry, Card, CardRarity, CardStars, SaveData } from '../types';
import { rescaleDeckBp } from '../card';
import {
  CANVAS_SIZE_DEFAULT,
  DEV_FORCE_MAX_USER_LEVEL,
  DECK_MAX,
  USER_INITIAL_EXP,
  USER_INITIAL_LEVEL,
} from '../config/balance';
import { DEV_USER_LEVEL_OVERRIDE } from '../config/devUserLevel';
import { gridSize } from '../canvas';
import { applyDevUserProfile, normalizeUserProfile } from '../user';

const STORAGE_KEY = 'dot5-battle-save-v1';

function emptySave(): SaveData {
  return { user: null, deck: [], battleHistory: [] };
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
    canvasSize,
    ...rest
  } = raw;

  const pixels = (rest as { pixels?: unknown }).pixels;
  const resolvedCanvasSize =
    typeof canvasSize === 'number' && canvasSize > 0
      ? canvasSize
      : Array.isArray(pixels)
        ? gridSize(pixels as Card['pixels'])
        : CANVAS_SIZE_DEFAULT;

  return {
    ...(rest as Omit<
      Card,
      | 'bp'
      | 'canvasSize'
      | 'wins'
      | 'losses'
      | 'reviveCount'
      | 'rarity'
      | 'stars'
      | 'createdAt'
    >),
    canvasSize: resolvedCanvasSize,
    bp,
    wins: typeof wins === 'number' ? wins : 0,
    losses: typeof losses === 'number' ? losses : 0,
    reviveCount: typeof reviveCount === 'number' ? reviveCount : 0,
    rarity: parseRarity(rarity),
    stars: parseStars(stars),
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
  };
}

function shouldRescaleDeckForDev(): boolean {
  return (
    import.meta.env.DEV &&
    (DEV_USER_LEVEL_OVERRIDE != null || DEV_FORCE_MAX_USER_LEVEL)
  );
}

function deckBpChanged(before: Card[], after: Card[]): boolean {
  return after.some((card, index) => card.bp !== before[index]?.bp);
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

function migrateBattleHistory(raw: unknown): BattleHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: BattleHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.playedAt !== 'string') continue;
    if (record.winner !== 'player' && record.winner !== 'cpu') continue;
    if (typeof record.opponentName !== 'string') continue;
    if (typeof record.opponentLevel !== 'number') continue;
    if (typeof record.opponentDeckPower !== 'number') continue;
    if (typeof record.playerDeckPower !== 'number') continue;
    if (!Array.isArray(record.opponentDeck)) continue;
    const opponentDeck = migrateDeck(record.opponentDeck);
    if (opponentDeck.length === 0) continue;
    entries.push({
      id: record.id,
      playedAt: record.playedAt,
      winner: record.winner,
      opponentName: record.opponentName,
      opponentLevel: Math.floor(record.opponentLevel),
      opponentDeckPower: Math.floor(record.opponentDeckPower),
      playerDeckPower: Math.floor(record.playerDeckPower),
      opponentDeck,
    });
  }
  return entries;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (!Array.isArray(parsed.deck)) return emptySave();
    const user = normalizeUserProfile(parsed.user);
    const deck = migrateDeck(parsed.deck);
    const battleHistory = migrateBattleHistory(parsed.battleHistory);
    if (user) {
      const devAdjusted = applyDevUserProfile(user);
      const rescale = shouldRescaleDeckForDev();
      const finalDeck = rescale
        ? rescaleDeckBp(deck, devAdjusted.level)
        : deck;
      if (
        devAdjusted.level !== user.level ||
        devAdjusted.exp !== user.exp ||
        (rescale && deckBpChanged(deck, finalDeck))
      ) {
        saveSave({ user: devAdjusted, deck: finalDeck, battleHistory });
      }
      return { user: devAdjusted, deck: finalDeck, battleHistory };
    }
    return { user, deck, battleHistory };
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
      battleHistory: data.battleHistory ?? [],
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
    battleHistory: [],
  };
}

/** @deprecated saveSave を使用 */
export function saveDeck(deck: SaveData['deck']): void {
  const current = loadSave();
  saveSave({ ...current, deck: deck.slice(0, DECK_MAX) });
}
