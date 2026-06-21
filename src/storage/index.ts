import type { BattleHistoryEntry, Card, CardRarity, CardStars, MemoryAlbumState, SaveData } from '../types';
import { rescaleDeckBp } from '../card';
import {
  clampDeckSlotIndex,
  clampUnlockedDeckCount,
  countDeckCards,
  createEmptyDeckSlots,
  getDeckCards,
  normalizeDeckLayout,
  normalizeDeckSlots,
  resetAllDeckCardRecords,
  type DeckLayout,
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
import { effectiveDevPreferSavedLevel, normalizeUserProfile, resolveDevUserProfileOnLoad } from '../user';
import { normalizeCardStatus } from '../card/status';
import { normalizeTalismanEquipped } from '../card/talisman';
import { createInitialEconomy, normalizeUserEconomy } from '../user/economy';
import { createInitialInventory, applyDevInventoryFill, inventoryMatchesDevFill, normalizeUserInventory } from '../user/inventory';
import { createInitialAdState, normalizeAdState } from '../user/adState';
import {
  createInitialMemoryAlbum,
  normalizeMemoryAlbum,
} from '../user/memoryAlbum';
import { normalizeEditorShopUnlocks } from '../config/editorShop';
import { normalizePaletteShopUnlocks, migratePaletteShopUnlocksForSchema } from '../config/paletteUnlock';
import {
  createInitialMissionState,
  normalizeMissionState,
} from '../user/missionState';
import { applyMissionResets } from '../mission/reset';
import {
  applyDueSubscriptionGrants,
  createInitialShopPurchaseState,
  createInitialSubscription,
  normalizeShopPurchaseState,
  normalizeUserSubscription,
} from '../user/shop';
import { normalizeSoundEnabled } from '../user/preferences';

const STORAGE_KEY = 'dot5-battle-save-v1';
export const SAVE_SCHEMA_VERSION = 8;

function readPaletteShopUnlocks(
  raw: unknown,
  schemaVersion: number,
): number[] {
  return migratePaletteShopUnlocksForSchema(
    raw,
    schemaVersion,
    SAVE_SCHEMA_VERSION,
  );
}

function emptySave(): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    user: null,
    economy: createInitialEconomy(),
    inventory: createInitialInventory(),
    adState: createInitialAdState(),
    decks: createEmptyDeckSlots(),
    activeDeckIndex: 0,
    lastBattleDeckIndex: 0,
    unlockedDeckCount: DECK_SLOT_INITIAL_UNLOCKED,
    battleHistory: [],
    talismanStarterGranted: false,
    paletteShopUnlocks: [],
    editorShopUnlocks: [],
    memoryAlbum: createInitialMemoryAlbum(),
    shopPurchase: createInitialShopPurchaseState(),
    subscription: createInitialSubscription(),
    missionState: createInitialMissionState(),
  };
}

function migrateMemoryAlbumCards(
  raw: unknown,
  userLevel: number,
  paletteShopUnlocks: readonly number[],
): MemoryAlbumState {
  const album = normalizeMemoryAlbum(raw);
  const cards = album.cards
    .map((entry) =>
      migrateCard(entry as unknown as Record<string, unknown>),
    )
    .filter((card): card is Card => card != null);
  const rescaled = rescaleDeckBp(cards, userLevel, paletteShopUnlocks);
  return { ...album, cards: rescaled };
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
    status,
    talismanEquipped,
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
      | 'status'
      | 'talismanEquipped'
      | 'createdAt'
    >),
    canvasSize: resolvedCanvasSize,
    bp,
    wins: typeof wins === 'number' ? wins : 0,
    losses: typeof losses === 'number' ? losses : 0,
    reviveCount: typeof reviveCount === 'number' ? reviveCount : 0,
    rarity: parseRarity(rarity),
    stars: parseStars(stars),
    status: normalizeCardStatus(status),
    talismanEquipped: normalizeTalismanEquipped(talismanEquipped),
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
  };
}

function shouldRescaleDeckForDev(): boolean {
  return (
    import.meta.env.DEV &&
    (DEV_USER_LEVEL_OVERRIDE != null || DEV_FORCE_MAX_USER_LEVEL)
  );
}

function deckBpChanged(before: DeckLayout, after: DeckLayout): boolean {
  return after.some((card, index) => card?.bp !== before[index]?.bp);
}

function anyDeckBpChanged(before: DeckLayout[], after: DeckLayout[]): boolean {
  return after.some((deck, index) => deckBpChanged(before[index] ?? [], deck));
}

function migrateDeck(deck: unknown[]): DeckLayout {
  const slots = Array.from({ length: DECK_MAX }, () => null) as DeckLayout;
  const hasExplicitNull = deck.some((item) => item === null);
  for (let i = 0; i < Math.min(deck.length, DECK_MAX); i++) {
    const item = deck[i];
    if (item === null) {
      slots[i] = null;
      continue;
    }
    if (item && typeof item === 'object') {
      slots[i] = migrateCard(item as Record<string, unknown>);
    }
  }
  if (hasExplicitNull || deck.length === DECK_MAX) {
    return slots;
  }
  return normalizeDeckLayout(getDeckCards(slots));
}

function migrateDecks(parsed: Record<string, unknown>): DeckLayout[] {
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
    const opponentDeck = getDeckCards(migrateDeck(record.opponentDeck));
    if (opponentDeck.length === 0) continue;
    const playerDeckRaw = Array.isArray(record.playerDeck)
      ? getDeckCards(migrateDeck(record.playerDeck))
      : undefined;
    const playerLevel =
      typeof record.playerLevel === 'number'
        ? Math.floor(record.playerLevel)
        : undefined;
    entries.push({
      id: record.id,
      playedAt: record.playedAt,
      winner: record.winner,
      opponentName: record.opponentName,
      opponentLevel: Math.floor(record.opponentLevel),
      opponentDeckPower: Math.floor(record.opponentDeckPower),
      playerDeckPower: Math.floor(record.playerDeckPower),
      opponentDeck,
      ...(playerDeckRaw && playerDeckRaw.length > 0
        ? { playerDeck: playerDeckRaw }
        : {}),
      ...(playerLevel != null ? { playerLevel } : {}),
    });
  }
  return entries;
}

function parseDevSaveFields(parsed: Record<string, unknown>): Pick<
  SaveData,
  'devPreferSavedLevel' | 'devFileOverrideLevel'
> {
  const devPreferSavedLevel = parsed.devPreferSavedLevel === true;
  const rawFileOverride = parsed.devFileOverrideLevel;
  const devFileOverrideLevel =
    typeof rawFileOverride === 'number'
      ? rawFileOverride
      : rawFileOverride === null
        ? null
        : undefined;
  return { devPreferSavedLevel, devFileOverrideLevel };
}

function buildDevSaveFields(
  preferSaved: boolean,
  savedFileOverrideLevel: number | null | undefined,
): Pick<SaveData, 'devPreferSavedLevel' | 'devFileOverrideLevel'> {
  if (!preferSaved) {
    return {};
  }
  return {
    devPreferSavedLevel: true,
    devFileOverrideLevel: savedFileOverrideLevel ?? DEV_USER_LEVEL_OVERRIDE ?? null,
  };
}

function normalizeSaveFields(parsed: Record<string, unknown>, _decks: DeckLayout[]): Pick<
  SaveData,
  'activeDeckIndex' | 'lastBattleDeckIndex' | 'unlockedDeckCount' | 'deckNames'
> {
  const activeDeckIndex = clampDeckSlotIndex(
    typeof parsed.activeDeckIndex === 'number' ? parsed.activeDeckIndex : 0,
  );
  const lastBattleDeckIndex = clampDeckSlotIndex(
    typeof parsed.lastBattleDeckIndex === 'number'
      ? parsed.lastBattleDeckIndex
      : activeDeckIndex,
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
  const safeLastBattleIndex =
    lastBattleDeckIndex < unlockedDeckCount ? lastBattleDeckIndex : safeActiveIndex;
  return {
    activeDeckIndex: safeActiveIndex,
    lastBattleDeckIndex: safeLastBattleIndex,
    unlockedDeckCount,
    deckNames,
  };
}

function rescaleAllDecks(
  decks: DeckLayout[],
  level: number,
  paletteShopUnlocks: readonly number[] = [],
): DeckLayout[] {
  return decks.map((deck) => {
    const cards = getDeckCards(deck);
    const rescaled = rescaleDeckBp(cards, level, paletteShopUnlocks);
    const next = normalizeDeckLayout(deck);
    let cursor = 0;
    return next.map((card) => {
      if (card == null) return null;
      const updated = rescaled[cursor];
      cursor += 1;
      return updated ?? card;
    });
  });
}

export function applyProgressionMigrations(save: SaveData): SaveData {
  let next: SaveData = {
    ...save,
    schemaVersion: SAVE_SCHEMA_VERSION,
    economy: normalizeUserEconomy(save.economy),
    inventory: normalizeUserInventory(save.inventory),
    adState: normalizeAdState(save.adState),
    talismanStarterGranted: save.talismanStarterGranted === true,
    paletteShopUnlocks: normalizePaletteShopUnlocks(save.paletteShopUnlocks),
    editorShopUnlocks: normalizeEditorShopUnlocks(save.editorShopUnlocks),
    shopPurchase: normalizeShopPurchaseState(save.shopPurchase),
    subscription: normalizeUserSubscription(save.subscription),
    missionState: applyMissionResets(normalizeMissionState(save.missionState)),
  };

  const subscriptionSync = applyDueSubscriptionGrants(
    next.economy ?? createInitialEconomy(),
    next.inventory ?? createInitialInventory(),
    next.subscription ?? createInitialSubscription(),
  );
  next = {
    ...next,
    economy: subscriptionSync.economy,
    inventory: subscriptionSync.inventory,
    subscription: subscriptionSync.subscription,
  };

  if (next.user && next.user.level >= 10 && next.unlockedDeckCount < 2) {
    next = {
      ...next,
      unlockedDeckCount: Math.max(2, next.unlockedDeckCount),
    };
  }

  return next;
}

function shouldPersistMigration(
  parsed: Record<string, unknown>,
  migrated: SaveData,
  beforeDecks: DeckLayout[],
  afterDecks: DeckLayout[],
): boolean {
  const parsedVersion =
    typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 0;
  if (parsedVersion < SAVE_SCHEMA_VERSION) return true;
  if (
    migrated.user &&
    migrated.user.level >= 10 &&
    (typeof parsed.unlockedDeckCount !== 'number' || parsed.unlockedDeckCount < 2)
  ) {
    return true;
  }
  return anyDeckBpChanged(beforeDecks, afterDecks);
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
    const economy = normalizeUserEconomy(parsed.economy);
    const inventory = applyDevInventoryFill(normalizeUserInventory(parsed.inventory));
    const adState = normalizeAdState(parsed.adState);
    const decks = normalizeDeckSlots(migrateDecks(parsed));
    const battleHistory = migrateBattleHistory(parsed.battleHistory);
    const { activeDeckIndex, lastBattleDeckIndex, unlockedDeckCount, deckNames } =
      normalizeSaveFields(parsed, decks);
    const { devPreferSavedLevel, devFileOverrideLevel } = parseDevSaveFields(parsed);
    const preferSaved = effectiveDevPreferSavedLevel(
      devPreferSavedLevel === true,
      DEV_USER_LEVEL_OVERRIDE,
      devFileOverrideLevel,
    );

    const parsedVersion =
      typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 0;
    const paletteShopUnlocks = readPaletteShopUnlocks(
      parsed.paletteShopUnlocks,
      parsedVersion,
    );

    const baseSave = applyProgressionMigrations({
      schemaVersion: SAVE_SCHEMA_VERSION,
      user,
      economy,
      inventory,
      adState,
      decks,
      activeDeckIndex,
      lastBattleDeckIndex,
      unlockedDeckCount,
      deckNames,
      battleHistory,
      talismanStarterGranted: parsed.talismanStarterGranted === true,
      paletteShopUnlocks,
      memoryAlbum: migrateMemoryAlbumCards(
        parsed.memoryAlbum,
        user?.level ?? USER_INITIAL_LEVEL,
        paletteShopUnlocks,
      ),
      shopPurchase: normalizeShopPurchaseState(parsed.shopPurchase),
      subscription: normalizeUserSubscription(parsed.subscription),
      missionState: applyMissionResets(
        normalizeMissionState(parsed.missionState),
      ),
      soundEnabled: normalizeSoundEnabled(parsed.soundEnabled),
      deckIntroSeen: parsed.deckIntroSeen === true,
      ...buildDevSaveFields(preferSaved, devFileOverrideLevel),
    });

    if (user) {
      const devAdjusted = resolveDevUserProfileOnLoad(user, {
        fileOverrideLevel: DEV_USER_LEVEL_OVERRIDE,
        preferSavedLevel: preferSaved,
        savedFileOverrideLevel: devFileOverrideLevel,
      });
      const rescale = shouldRescaleDeckForDev() || preferSaved;
      const finalDecks = rescale
        ? rescaleAllDecks(
            decks,
            devAdjusted.level,
            paletteShopUnlocks,
          )
        : decks;
      const finalSave = applyProgressionMigrations({
        ...baseSave,
        user: devAdjusted,
        decks: finalDecks,
        ...buildDevSaveFields(preferSaved, devFileOverrideLevel),
      });
      if (
        devAdjusted.level !== user.level ||
        devAdjusted.exp !== user.exp ||
        (rescale && anyDeckBpChanged(decks, finalDecks)) ||
        (parsed.devPreferSavedLevel === true && !preferSaved) ||
        !inventoryMatchesDevFill(normalizeUserInventory(parsed.inventory)) ||
        shouldPersistMigration(parsed, finalSave, decks, finalDecks)
      ) {
        saveSave(finalSave);
      }
      return finalSave;
    }

    if (
      !inventoryMatchesDevFill(normalizeUserInventory(parsed.inventory)) ||
      shouldPersistMigration(parsed, baseSave, decks, decks)
    ) {
      saveSave(baseSave);
    }
    return baseSave;
  } catch {
    return emptySave();
  }
}

export function saveSave(data: SaveData): void {
  const payload: Record<string, unknown> = {
    schemaVersion: data.schemaVersion ?? SAVE_SCHEMA_VERSION,
    user: data.user,
    economy: data.economy ?? createInitialEconomy(),
    inventory: data.inventory ?? createInitialInventory(),
    adState: data.adState ?? createInitialAdState(),
    decks: normalizeDeckSlots(data.decks).map((deck) => deck.slice(0, DECK_MAX)),
    activeDeckIndex: clampDeckSlotIndex(data.activeDeckIndex),
    lastBattleDeckIndex: clampDeckSlotIndex(
      data.lastBattleDeckIndex ?? data.activeDeckIndex,
    ),
    unlockedDeckCount: clampUnlockedDeckCount(data.unlockedDeckCount),
    deckNames: data.deckNames,
    battleHistory: data.battleHistory ?? [],
  };
  if (data.talismanStarterGranted === true) {
    payload.talismanStarterGranted = true;
  }
  const paletteShopUnlocks = normalizePaletteShopUnlocks(data.paletteShopUnlocks);
  if (paletteShopUnlocks.length > 0) {
    payload.paletteShopUnlocks = paletteShopUnlocks;
  }
  const editorShopUnlocks = normalizeEditorShopUnlocks(data.editorShopUnlocks);
  if (editorShopUnlocks.length > 0) {
    payload.editorShopUnlocks = editorShopUnlocks;
  }
  payload.memoryAlbum = normalizeMemoryAlbum(data.memoryAlbum);
  const shopPurchase = normalizeShopPurchaseState(data.shopPurchase);
  if (
    shopPurchase.jewelPack200FirstBonusUsed === true ||
    shopPurchase.shopShardPurchasesDayKey != null
  ) {
    payload.shopPurchase = shopPurchase;
  }
  const subscription = normalizeUserSubscription(data.subscription);
  if (subscription.plan !== 'none') {
    payload.subscription = subscription;
  }
  payload.missionState = applyMissionResets(
    normalizeMissionState(data.missionState),
  );
  if (data.soundEnabled === false) {
    payload.soundEnabled = false;
  }
  if (data.deckIntroSeen === true) {
    payload.deckIntroSeen = true;
  }
  if (data.devPreferSavedLevel === true) {
    payload.devPreferSavedLevel = true;
    payload.devFileOverrideLevel =
      data.devFileOverrideLevel ?? DEV_USER_LEVEL_OVERRIDE ?? null;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

/** バトル履歴のみ削除（他のセーブデータは維持） */
export function resetBattleHistory(data: SaveData): SaveData {
  return {
    ...data,
    battleHistory: [],
  };
}

/** 開発用: ユーザー戦績とカード勝敗などを初期化（デッキ内容・ユーザー名は維持） */
export function resetBattleRecords(data: SaveData): SaveData {
  return {
    schemaVersion: data.schemaVersion ?? SAVE_SCHEMA_VERSION,
    user: data.user
      ? {
          ...data.user,
          level: USER_INITIAL_LEVEL,
          exp: USER_INITIAL_EXP,
          battleWins: 0,
          battleLosses: 0,
        }
      : null,
    economy: createInitialEconomy(),
    inventory: createInitialInventory(),
    adState: createInitialAdState(),
    decks: resetAllDeckCardRecords(normalizeDeckSlots(data.decks)),
    activeDeckIndex: clampDeckSlotIndex(data.activeDeckIndex),
    lastBattleDeckIndex: clampDeckSlotIndex(
      data.lastBattleDeckIndex ?? data.activeDeckIndex,
    ),
    unlockedDeckCount: clampUnlockedDeckCount(data.unlockedDeckCount),
    deckNames: data.deckNames,
    battleHistory: [],
    talismanStarterGranted: false,
  };
}

/** @deprecated saveSave を使用 */
export function saveDeck(deck: Card[]): void {
  const current = loadSave();
  const nextDecks = normalizeDeckSlots(current.decks);
  nextDecks[clampDeckSlotIndex(current.activeDeckIndex)] = deck.slice(0, DECK_MAX);
  saveSave({ ...current, decks: nextDecks });
}
