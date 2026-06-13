import type { BattleHistoryEntry, Card, CardRarity, CardStars, SaveData } from '../types';
import { rescaleDeckBp } from '../card';
import {
  clampDeckSlotIndex,
  clampUnlockedDeckCount,
  createEmptyDeckSlots,
  normalizeDeckSlots,
  resetAllDeckCardRecords,
} from '../deckSlots';
import {
  CANVAS_SIZE_DEFAULT,
  DECK_MAX,
  DECK_SLOT_COUNT,
  DECK_SLOT_INITIAL_UNLOCKED,
  DEV_FORCE_MAX_USER_LEVEL,
  USER_INITIAL_EXP,
  USER_INITIAL_LEVEL,
} from '../config/balance';
import { DEV_USER_LEVEL_OVERRIDE } from '../config/devUserLevel';
import { gridSize } from '../canvas';
import { applyDevUserProfile, normalizeUserProfile } from '../user';

const STORAGE_KEY = 'dot5-battle-save-v1';

function emptySave(): SaveData {
  return {
    user: null,
    decks: createEmptyDeckSlots(),
    activeDeckIndex: 0,
    unlockedDeckCount: DECK_SLOT_INITIAL_UNLOCKED,
    battleHistory: [],
  };
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

function anyDeckBpChanged(before: Card[][], after: Card[][]): boolean {
  return after.some((deck, index) => deckBpChanged(before[index] ?? [], deck));
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

function migrateDecks(parsed: Record<string, unknown>): Card[][] {
  if (Array.isArray(parsed.decks)) {
    const slots = createEmptyDeckSlots();
    for (let i = 0; i < DECK_SLOT_COUNT; i++) {
      const raw = parsed.decks[i];
      if (Array.isArray(raw)) {
        slots[i] = migrateDeck(raw);
      }
    }
    return slots;
  }
  if (Array.isArray(parsed.deck)) {
    const slots = createEmptyDeckSlots();
    slots[0] = migrateDeck(parsed.deck);
    return slots;
  }
  return createEmptyDeckSlots();
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

function normalizeSaveFields(parsed: Record<string, unknown>, decks: Card[][]): Pick<
  SaveData,
  'activeDeckIndex' | 'unlockedDeckCount' | 'deckNames'
> {
  const activeDeckIndex = clampDeckSlotIndex(
    typeof parsed.activeDeckIndex === 'number' ? parsed.activeDeckIndex : 0,
  );
  const unlockedDeckCount = clampUnlockedDeckCount(
    typeof parsed.unlockedDeckCount === 'number'
      ? parsed.unlockedDeckCount
      : DECK_SLOT_INITIAL_UNLOCKED,
  );
  const deckNames = Array.isArray(parsed.deckNames)
    ? parsed.deckNames
        .slice(0, DECK_SLOT_COUNT)
        .map((name) => (typeof name === 'string' ? name : ''))
    : undefined;
  const safeActiveIndex =
    activeDeckIndex < unlockedDeckCount ? activeDeckIndex : 0;
  return { activeDeckIndex: safeActiveIndex, unlockedDeckCount, deckNames };
}

function rescaleAllDecks(decks: Card[][], level: number): Card[][] {
  return decks.map((deck) => rescaleDeckBp(deck, level));
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const hasLegacyDeck = Array.isArray(parsed.deck);
    const hasDecks = Array.isArray(parsed.decks);
    if (!hasLegacyDeck && !hasDecks) return emptySave();

    const user = normalizeUserProfile(parsed.user);
    const decks = normalizeDeckSlots(migrateDecks(parsed));
    const battleHistory = migrateBattleHistory(parsed.battleHistory);
    const { activeDeckIndex, unlockedDeckCount, deckNames } = normalizeSaveFields(
      parsed,
      decks,
    );

    const baseSave: SaveData = {
      user,
      decks,
      activeDeckIndex,
      unlockedDeckCount,
      deckNames,
      battleHistory,
    };

    if (user) {
      const devAdjusted = applyDevUserProfile(user);
      const rescale = shouldRescaleDeckForDev();
      const finalDecks = rescale
        ? rescaleAllDecks(decks, devAdjusted.level)
        : decks;
      const finalSave: SaveData = {
        ...baseSave,
        user: devAdjusted,
        decks: finalDecks,
      };
      if (
        devAdjusted.level !== user.level ||
        devAdjusted.exp !== user.exp ||
        (rescale && anyDeckBpChanged(decks, finalDecks))
      ) {
        saveSave(finalSave);
      }
      return finalSave;
    }
    return baseSave;
  } catch {
    return emptySave();
  }
}

export function saveSave(data: SaveData): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: data.user,
      decks: normalizeDeckSlots(data.decks).map((deck) => deck.slice(0, DECK_MAX)),
      activeDeckIndex: clampDeckSlotIndex(data.activeDeckIndex),
      unlockedDeckCount: clampUnlockedDeckCount(data.unlockedDeckCount),
      deckNames: data.deckNames,
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
    decks: resetAllDeckCardRecords(normalizeDeckSlots(data.decks)),
    activeDeckIndex: clampDeckSlotIndex(data.activeDeckIndex),
    unlockedDeckCount: clampUnlockedDeckCount(data.unlockedDeckCount),
    deckNames: data.deckNames,
    battleHistory: [],
  };
}

/** @deprecated saveSave を使用 */
export function saveDeck(deck: Card[]): void {
  const current = loadSave();
  const nextDecks = normalizeDeckSlots(current.decks);
  nextDecks[clampDeckSlotIndex(current.activeDeckIndex)] = deck.slice(0, DECK_MAX);
  saveSave({ ...current, decks: nextDecks });
}
