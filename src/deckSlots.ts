import {
  DECK_MAX,
  DECK_SLOT_COUNT,
  DECK_SLOT_INITIAL_UNLOCKED,
} from './config/balance';
import type { Card, DeckLayout } from './types';

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

export function isDeckSlotUnlocked(
  slotIndex: number,
  unlockedDeckCount: number,
): boolean {
  return slotIndex >= 0 && slotIndex < unlockedDeckCount;
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

export function isDeckBattleReady(deck: readonly (Card | null)[]): boolean {
  return deck.length === DECK_MAX && deck.every((card) => card != null);
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

export function resetAllDeckCardRecords(decks: DeckLayout[]): DeckLayout[] {
  return decks.map((deck) =>
    normalizeDeckLayout(deck).map((card) =>
      card ? { ...card, wins: 0, losses: 0 } : null,
    ),
  );
}
