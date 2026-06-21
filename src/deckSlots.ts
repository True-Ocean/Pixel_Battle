import {
  DECK_MAX,
  DECK_NAME_MAX_LENGTH,
  DECK_SLOT_COUNT,
  DECK_SLOT_INITIAL_UNLOCKED,
} from './config/balance';
import type { Card, DeckLayout } from './types';
import { isCardActive } from './card/status';

/** 固定5スロットのデッキ（null = 空きスロット） */
export type { DeckLayout } from './types';

export function createEmptyDeckLayout(): DeckLayout {
  return Array.from({ length: DECK_MAX }, () => null);
}

export function createEmptyDeckSlots(): DeckLayout[] {
  return Array.from({ length: DECK_SLOT_COUNT }, () => createEmptyDeckLayout());
}

export function clampDeckSlotIndex(index: number): number {
  return Math.max(0, Math.min(DECK_SLOT_COUNT - 1, Math.floor(index)));
}

export function clampUnlockedDeckCount(count: number): number {
  return Math.max(
    DECK_SLOT_INITIAL_UNLOCKED,
    Math.min(DECK_SLOT_COUNT, Math.floor(count)),
  );
}

/** デッキ名配列を正規化（空のみの場合は undefined） */
export function normalizeDeckNames(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const names = raw
    .slice(0, DECK_SLOT_COUNT)
    .map((name) =>
      typeof name === 'string'
        ? name.trim().slice(0, DECK_NAME_MAX_LENGTH)
        : '',
    );
  return names.some((name) => name.length > 0) ? names : undefined;
}

/** 1スロット分の名前を更新 */
export function setDeckNameAt(
  deckNames: string[] | undefined,
  deckIndex: number,
  rawName: string,
): string[] | undefined {
  const next = Array.from({ length: DECK_SLOT_COUNT }, (_, i) =>
    i === deckIndex
      ? sanitizeDeckNameInput(rawName)
      : deckNames?.[i]?.trim() ?? '',
  );
  return next.some((name) => name.length > 0) ? next : undefined;
}

export function sanitizeDeckNameInput(raw: string): string {
  return raw.trim().slice(0, DECK_NAME_MAX_LENGTH);
}

/** 解放済みの別デッキが同じカスタム名を使っているか（空欄は重複なし） */
export function isDeckNameTakenByOtherDeck(
  deckNames: string[] | undefined,
  deckIndex: number,
  rawName: string,
  unlockedDeckCount: number,
): boolean {
  const name = sanitizeDeckNameInput(rawName);
  if (!name) return false;

  for (let i = 0; i < unlockedDeckCount; i++) {
    if (i === deckIndex) continue;
    if ((deckNames?.[i]?.trim() ?? '') === name) return true;
  }
  return false;
}

/** ヘッダー・Hub 等の表示名（未設定時は「デッキN」） */
export function getDeckDisplayName(index: number, deckNames?: string[]): string {
  const custom = deckNames?.[index]?.trim();
  if (custom) return custom;
  return `デッキ${index + 1}`;
}

/** タブ上のラベル（未設定時は数字。名前は CSS で省略） */
export function getDeckTabShortLabel(index: number, deckNames?: string[]): string {
  const custom = deckNames?.[index]?.trim();
  if (custom) return custom;
  return String(index + 1);
}

export function isDeckSlotUnlocked(
  slotIndex: number,
  unlockedDeckCount: number,
): boolean {
  return slotIndex >= 0 && slotIndex < unlockedDeckCount;
}

/** 解放条件モーダル用の固定表示名（カスタム名は使わない） */
export function getDefaultDeckSlotLabel(index: number): string {
  return `デッキ${index + 1}`;
}

export interface DeckJewelUnlockMessageParts {
  prefix: string;
  suffix: string;
}

export interface DeckUnlockModalContent {
  title: string;
  message: string;
  note?: string;
  showJewelCost: boolean;
  canUnlockWithJewels: boolean;
  /** デッキ3以降: 「{deck}は{prev}解放後に」+ 💎 + 「で解放できます。」 */
  jewelUnlockMessage?: DeckJewelUnlockMessageParts;
}

function buildDeckJewelUnlockMessageParts(
  slotIndex: number,
): DeckJewelUnlockMessageParts | undefined {
  if (slotIndex < DECK_JEWEL_UNLOCK_MIN_SLOT_INDEX) return undefined;
  const deckLabel = getDefaultDeckSlotLabel(slotIndex);
  const previousDeckLabel = getDefaultDeckSlotLabel(slotIndex - 1);
  return {
    prefix: `${deckLabel}は${previousDeckLabel}解放後に`,
    suffix: 'で解放できます。',
  };
}

/** ジュエルで解放できる最小デッキ index（デッキ3 = index 2） */
export const DECK_JEWEL_UNLOCK_MIN_SLOT_INDEX = 2;

/** ジュエル解放に必要な最低ユーザーレベル */
export const DECK_JEWEL_UNLOCK_MIN_USER_LEVEL = 10;

export function canUnlockDeckSlotWithJewels(
  slotIndex: number,
  unlockedDeckCount: number,
  userLevel: number,
): boolean {
  if (userLevel < DECK_JEWEL_UNLOCK_MIN_USER_LEVEL) return false;
  if (slotIndex < DECK_JEWEL_UNLOCK_MIN_SLOT_INDEX) return false;
  if (slotIndex !== unlockedDeckCount) return false;
  if (unlockedDeckCount >= DECK_SLOT_COUNT) return false;
  return true;
}

/** 未解放デッキタップ時のモーダル文言（順次解放: デッキNはデッキN-1解放後） */
export function getDeckUnlockModalContent(
  slotIndex: number,
  unlockedDeckCount: number,
  userLevel: number,
): DeckUnlockModalContent {
  const deckLabel = getDefaultDeckSlotLabel(slotIndex);
  const nextUnlockIndex = unlockedDeckCount;
  const previousDeckLabel = getDefaultDeckSlotLabel(slotIndex - 1);
  const title = `${deckLabel} は未解放`;

  const jewelUnlockMessage = buildDeckJewelUnlockMessageParts(slotIndex);

  if (slotIndex > nextUnlockIndex) {
    return {
      title,
      message: jewelUnlockMessage ? '' : `${deckLabel}は${previousDeckLabel}解放後に解放できます。`,
      jewelUnlockMessage,
      showJewelCost: false,
      canUnlockWithJewels: false,
    };
  }

  if (slotIndex === 1) {
    if (userLevel >= 10) {
      return {
        title,
        message: `${deckLabel}はレベル10到達で自動解放されます。`,
        showJewelCost: false,
        canUnlockWithJewels: false,
      };
    }
    return {
      title,
      message: `${deckLabel}はユーザーレベル10到達で解放されます。`,
      note: `現在 Lv.${userLevel} です。`,
      showJewelCost: false,
      canUnlockWithJewels: false,
    };
  }

  const canUnlockWithJewels = canUnlockDeckSlotWithJewels(
    slotIndex,
    unlockedDeckCount,
    userLevel,
  );

  if (userLevel < DECK_JEWEL_UNLOCK_MIN_USER_LEVEL) {
    return {
      title,
      message: jewelUnlockMessage ? '' : `${deckLabel}は${previousDeckLabel}解放後に解放できます。`,
      jewelUnlockMessage,
      note: `現在 Lv.${userLevel} です。ユーザーレベル10到達後にジュエルで解放できます。`,
      showJewelCost: false,
      canUnlockWithJewels: false,
    };
  }

  return {
    title,
    message: '',
    jewelUnlockMessage,
    showJewelCost: false,
    canUnlockWithJewels,
  };
}

/** レベルアップ到達時にデッキ2（Lv10）を自動解放 */
export function resolveDeckUnlockOnLevelUp(
  unlockedDeckCount: number,
  levelsGained: readonly number[],
): number {
  if (levelsGained.some((level) => level >= 10)) {
    return Math.max(2, unlockedDeckCount);
  }
  return unlockedDeckCount;
}

export function normalizeDeckLayout(raw: readonly (Card | null)[] | Card[]): DeckLayout {
  const slots = createEmptyDeckLayout();
  const hasExplicitNull =
    raw.length === DECK_MAX && raw.some((card) => card === null);
  if (hasExplicitNull) {
    for (let i = 0; i < DECK_MAX; i++) {
      slots[i] = raw[i] ?? null;
    }
    return slots;
  }
  for (let i = 0; i < Math.min(raw.length, DECK_MAX); i++) {
    const card = raw[i];
    if (card) slots[i] = card;
  }
  return slots;
}

export function normalizeDeckSlots(raw: DeckLayout[] | Card[][]): DeckLayout[] {
  const slots = createEmptyDeckSlots();
  for (let i = 0; i < DECK_SLOT_COUNT; i++) {
    slots[i] = normalizeDeckLayout(Array.isArray(raw[i]) ? raw[i]! : []);
  }
  return slots;
}

export function countDeckCards(deck: readonly (Card | null)[]): number {
  return deck.filter((card): card is Card => card != null).length;
}

export function deckHasLostCard(deck: readonly (Card | null)[]): boolean {
  return deck.some((card) => card != null && !isCardActive(card));
}

export function isDeckFilled(deck: readonly (Card | null)[]): boolean {
  return deck.length === DECK_MAX && deck.every((card) => card != null);
}

export function isDeckBattleReady(deck: readonly (Card | null)[]): boolean {
  return (
    isDeckFilled(deck) && deck.every((card) => card != null && isCardActive(card))
  );
}

/** 5枚揃い（ロストカード含む）の解放済みデッキ index 一覧 */
export function getFilledDeckIndices(
  decks: readonly DeckLayout[],
  unlockedDeckCount: number,
): number[] {
  const indices: number[] = [];
  for (let i = 0; i < DECK_SLOT_COUNT; i++) {
    if (!isDeckSlotUnlocked(i, unlockedDeckCount)) continue;
    if (isDeckFilled(normalizeDeckLayout(decks[i] ?? []))) {
      indices.push(i);
    }
  }
  return indices;
}

export function hasHistoryRematchDeck(
  decks: readonly DeckLayout[],
  unlockedDeckCount: number,
): boolean {
  return getFilledDeckIndices(decks, unlockedDeckCount).length > 0;
}

/** 5枚完成かつ解放済みのデッキスロット index 一覧 */
export function getBattleReadyDeckIndices(
  decks: readonly DeckLayout[],
  unlockedDeckCount: number,
): number[] {
  const indices: number[] = [];
  for (let i = 0; i < DECK_SLOT_COUNT; i++) {
    if (!isDeckSlotUnlocked(i, unlockedDeckCount)) continue;
    if (isDeckBattleReady(normalizeDeckLayout(decks[i] ?? []))) {
      indices.push(i);
    }
  }
  return indices;
}

/** Hub 初回選択: 1つなら自動、複数なら前回使用デッキが完成ならそれ、さもなければ null */
export function resolveBattleHubDeckSelection(
  readyIndices: readonly number[],
  lastBattleDeckIndex: number,
): number | null {
  if (readyIndices.length === 0) return null;
  if (readyIndices.length === 1) return readyIndices[0] ?? null;
  if (readyIndices.includes(lastBattleDeckIndex)) return lastBattleDeckIndex;
  return null;
}

export function getDeckCards(deck: readonly (Card | null)[]): Card[] {
  return deck.filter((card): card is Card => card != null);
}

function findFirstEmptySlot(
  layout: DeckLayout,
  excludeIndex?: number,
): number {
  for (let i = 0; i < DECK_MAX; i++) {
    if (i === excludeIndex) continue;
    if (layout[i] == null) return i;
  }
  return -1;
}

export function findFirstEmptySlotInLayout(
  layout: readonly (Card | null)[],
  excludeIndex?: number,
): number {
  return findFirstEmptySlot(normalizeDeckLayout([...layout]), excludeIndex);
}

export function updateDeckAtIndex(
  decks: DeckLayout[],
  slotIndex: number,
  nextDeck: DeckLayout,
): DeckLayout[] {
  const index = clampDeckSlotIndex(slotIndex);
  return decks.map((deck, i) =>
    i === index ? normalizeDeckLayout(nextDeck) : normalizeDeckLayout(deck),
  );
}

/** 同一デッキ内: 空スロットへ移動、占有スロットへは入れ替え */
export function moveCardInLayout(
  layout: DeckLayout,
  from: number,
  to: number,
): DeckLayout {
  if (from === to || from < 0 || from >= DECK_MAX || to < 0 || to >= DECK_MAX) {
    return normalizeDeckLayout(layout);
  }
  const next = normalizeDeckLayout(layout);
  const card = next[from];
  if (card == null) return next;
  if (next[to] != null) {
    next[from] = next[to];
    next[to] = card;
  } else {
    next[from] = null;
    next[to] = card;
  }
  return next;
}

/** デッキ間でカードを移動。空きがあるとき占有スロットへは押し出し、満杯のときは入れ替え */
export function moveCardBetweenDeckSlots(
  decks: DeckLayout[],
  fromSlotIndex: number,
  fromCardIndex: number,
  toSlotIndex: number,
  toCardIndex: number,
): DeckLayout[] | null {
  const fromSlot = clampDeckSlotIndex(fromSlotIndex);
  const toSlot = clampDeckSlotIndex(toSlotIndex);
  if (fromSlot === toSlot) return null;

  const normalized = normalizeDeckSlots(decks);
  const sourceLayout = normalizeDeckLayout(normalized[fromSlot]!);
  const targetLayout = normalizeDeckLayout(normalized[toSlot]!);

  if (fromCardIndex < 0 || fromCardIndex >= DECK_MAX) return null;

  const slotIndex = Math.max(0, Math.min(DECK_MAX - 1, Math.floor(toCardIndex)));
  const card = sourceLayout[fromCardIndex];
  if (card == null) return null;

  const targetHasEmpty = countDeckCards(targetLayout) < DECK_MAX;

  if (targetLayout[slotIndex] != null) {
    if (targetHasEmpty) {
      const displaced = targetLayout[slotIndex];
      const emptyIndex = findFirstEmptySlot(targetLayout, slotIndex);
      if (emptyIndex < 0) return null;
      targetLayout[slotIndex] = card;
      targetLayout[emptyIndex] = displaced;
      sourceLayout[fromCardIndex] = null;
    } else {
      const swapped = targetLayout[slotIndex];
      targetLayout[slotIndex] = card;
      sourceLayout[fromCardIndex] = swapped;
    }
  } else {
    targetLayout[slotIndex] = card;
    sourceLayout[fromCardIndex] = null;
  }

  return normalized.map((deck, i) => {
    if (i === fromSlot) return sourceLayout;
    if (i === toSlot) return targetLayout;
    return normalizeDeckLayout(deck);
  });
}

/** バトル Hub 用: 占有スロットへは常に入れ替え（空きがあっても押し出さない） */
export function moveCardBetweenDeckSlotsSwap(
  decks: DeckLayout[],
  fromSlotIndex: number,
  fromCardIndex: number,
  toSlotIndex: number,
  toCardIndex: number,
): DeckLayout[] | null {
  const fromSlot = clampDeckSlotIndex(fromSlotIndex);
  const toSlot = clampDeckSlotIndex(toSlotIndex);
  if (fromSlot === toSlot) return null;

  const normalized = normalizeDeckSlots(decks);
  const sourceLayout = normalizeDeckLayout(normalized[fromSlot]!);
  const targetLayout = normalizeDeckLayout(normalized[toSlot]!);

  if (fromCardIndex < 0 || fromCardIndex >= DECK_MAX) return null;

  const slotIndex = Math.max(0, Math.min(DECK_MAX - 1, Math.floor(toCardIndex)));
  const card = sourceLayout[fromCardIndex];
  if (card == null) return null;

  if (targetLayout[slotIndex] != null) {
    const swapped = targetLayout[slotIndex];
    targetLayout[slotIndex] = card;
    sourceLayout[fromCardIndex] = swapped;
  } else {
    targetLayout[slotIndex] = card;
    sourceLayout[fromCardIndex] = null;
  }

  return normalized.map((deck, i) => {
    if (i === fromSlot) return sourceLayout;
    if (i === toSlot) return targetLayout;
    return normalizeDeckLayout(deck);
  });
}

export function resetAllDeckCardRecords(decks: DeckLayout[]): DeckLayout[] {
  return decks.map((deck) =>
    normalizeDeckLayout(deck).map((card) =>
      card ? { ...card, wins: 0, losses: 0 } : null,
    ),
  );
}
