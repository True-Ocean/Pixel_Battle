import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from 'react';
import { canReviveLostCard, computeDeckPower, isCardLost, isTalismanEquipped, type LimitBreakShardSpendPlan } from '../card';
import {
  calcFullReviveCost,
  calcLostCardDeleteRewards,
  type CardDeleteOutcome,
  JEWEL_COST_DELETE,
  JEWEL_COST_MEMORY_ALBUM_ROW,
} from '../config/economy';
import { memoryAlbumHasSpace } from '../user/memoryAlbum';
import { DECK_MAX, DECK_SLOT_COUNT } from '../config/balance';
import {
  countDeckCards,
  findFirstEmptySlotInLayout,
  getDeckCards,
  getDeckDisplayName,
  getDeckTabShortLabel,
  isDeckSlotUnlocked,
  moveCardInLayout,
  normalizeDeckLayout,
} from '../deckSlots';
import type { Attribute, Card, DeckLayout, MemoryAlbumState, UserInventory } from '../types';
import { getRarityMeta, type RarityMeta } from '../config/rarity';
import { AttributeBadge } from './AttributeBadge';
import { CardBattleRecord } from './CardBattleRecord';
import { LimitBreakStars } from './LimitBreakStars';
import { RarityBadge } from './RarityBadge';
import { CardPreview } from './CardPreview';
import { CardDeleteResultModal } from './CardDeleteResultModal';
import { CardDeckDispositionDialog, MemoryAlbumFullDialog, MEMORY_ALBUM_SAVE_CONFIRM_MESSAGE } from './MemoryAlbumDialogs';
import { ConfirmDialog } from './ConfirmDialog';
import { DeckCardDetailOverlay } from './DeckCardDetailOverlay';
import type { AttributeSelectOutcome } from './attributeSelectTypes';
import type { AttributeRetouchResult } from './AttributeRetouchModal';
import { DeckRenameDialog } from './DeckRenameDialog';
import { DeckUnlockModal } from './DeckUnlockModal';
import { LostCardDeckNoticeModal } from './LostCardDeckNoticeModal';
import { TalismanCardBadge } from './TalismanCardBadge';
import { TalismanIcon } from './TalismanIcon';
import { JewelAmount } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';
import {
  findDeckDropIndex,
  findDeckTabIndexAtPoint,
  getDeckRowShift,
} from './deckReorder';
import { isLossEnabledAtUserLevel } from '../user/talismanStarter';

const DECK_DRAG_CHIP_SIZE = 56;
const DECK_TAB_LONG_PRESS_MS = 500;
const DECK_TAB_DOUBLE_TAP_MS = 320;

export interface DeckScreenProps {
  deck: DeckLayout;
  decks: DeckLayout[];
  activeDeckIndex: number;
  unlockedDeckCount: number;
  userLevel: number;
  deckNames?: string[];
  reorderMode: boolean;
  onReorderModeChange: (active: boolean) => void;
  detailCardId: string | null;
  onDetailCardIdChange: (id: string | null) => void;
  onSelectDeckIndex: (index: number) => void;
  onCreateCard: () => void;
  onEditCard: (card: Card, options?: { returnToDetail?: boolean }) => void;
  onDeleteCard: (id: string) => CardDeleteOutcome | null;
  onReviveLostCard: (id: string) => void;
  onAddCardToMemoryAlbum: (id: string) => 'ok' | 'full' | null;
  onUnlockMemoryAlbumRow: () => string | null;
  onOpenMemoryAlbum: () => void;
  memoryAlbum: MemoryAlbumState;
  inventory: UserInventory;
  onLimitBreakCard: (id: string, spend: LimitBreakShardSpendPlan) => void;
  onRetouchCardAttribute: (
    cardId: string,
  ) => AttributeRetouchResult | { error: string };
  onCommitRetouchCardAttribute: () => void;
  onSelectCardAttribute: (cardId: string, attribute: Attribute) => AttributeSelectOutcome;
  paletteShopUnlocks?: readonly number[];
  freePixels: number;
  jewels: number;
  onReorderDeck: (deck: DeckLayout) => void;
  onMoveCardBetweenDecks: (
    fromDeckIndex: number,
    fromCardIndex: number,
    toDeckIndex: number,
    toCardIndex: number,
  ) => void;
  onUnlockDeck?: (slotIndex: number) => string | null;
  onRenameDeck?: (deckIndex: number, name: string) => void;
  onEquipTalisman: (cardId: string) => void;
  onUnequipTalisman: (cardId: string) => void;
  showLostCardDeckNotice?: boolean;
  onDismissLostCardDeckNoticeForToday?: () => void;
}

interface DeckDragState {
  cardId: string;
  sourceDeckIndex: number;
  fromIndex: number;
  dropIndex: number;
  targetDeckIndex: number | null;
  targetDropIndex: number | null;
  ghostLeft: number;
  ghostTop: number;
  ghostWidth: number;
  rowHeight: number;
  rowPointerOffsetX: number;
  rowPointerOffsetY: number;
}

function isPointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function deckRowStyle(rarityMeta: RarityMeta): CSSProperties {
  return {
    '--rarity-border': rarityMeta.rowBorder,
    '--rarity-bg': rarityMeta.rowBg,
    '--rarity-border-width': rarityMeta.rowBorderWidth,
    '--rarity-shadow': rarityMeta.rowBoxShadow ?? 'none',
  } as CSSProperties;
}

function DeckDragChip({ card }: { card: Card }) {
  const rarityMeta = getRarityMeta(card.rarity);
  return (
    <div
      className={`deck-drag-chip deck-drag-chip--${card.rarity}`}
      style={
        {
          '--rarity-border': rarityMeta.rowBorder,
          '--rarity-bg': rarityMeta.rowBg,
          '--rarity-border-width': rarityMeta.rowBorderWidth,
          '--rarity-shadow': rarityMeta.rowBoxShadow ?? 'none',
        } as CSSProperties
      }
    >
      <RarityBadge rarity={card.rarity} size="deck" className="deck-drag-chip-rarity" />
      <div className="deck-drag-chip-art">
        <CardPreview pixels={card.pixels} />
      </div>
      <span className="deck-drag-chip-bp">{card.bp}</span>
    </div>
  );
}

function TargetDeckDropPanel({
  deck,
  targetDropIndex,
  listRef,
}: {
  deck: DeckLayout;
  targetDropIndex: number | null;
  listRef: RefObject<HTMLUListElement | null>;
}) {
  const layout = normalizeDeckLayout(deck);
  return (
    <div className="deck-cross-drop-panel">
      <ul ref={listRef} className="card-list deck-cross-drop-list">
        {Array.from({ length: DECK_MAX }, (_, index) => {
          const slotCard = layout[index];
          const isActive = targetDropIndex === index;
          if (!slotCard) {
            return (
              <li
                key={`drop-empty-${index}`}
                data-deck-index={index}
                className={`deck-card-row deck-card-row--empty deck-cross-drop-slot${isActive ? ' is-drop-slot-active' : ''}`}
              >
                <div className="deck-cross-drop-slot-inner">
                  <span className="deck-cross-drop-slot-label">
                    スロット {index + 1}
                  </span>
                </div>
              </li>
            );
          }

          const rarityMeta = getRarityMeta(slotCard.rarity);
          const slotCardIsLost = isCardLost(slotCard);
          return (
            <li
              key={slotCard.id}
              data-deck-index={index}
              className={[
                'deck-card-row',
                `deck-card-row--${slotCard.rarity}`,
                'deck-cross-drop-slot',
                slotCardIsLost ? 'deck-card-row--lost' : '',
                isActive ? 'is-drop-slot-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={deckRowStyle(rarityMeta)}
            >
              <div className="deck-card-main deck-cross-drop-card">
                <DeckCardRowBody card={slotCard} />
                {slotCardIsLost && (
                  <span className="card-lost-badge card-lost-badge--row" aria-hidden>
                    ロスト中
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DeckCardRowBody({ card }: { card: Card }) {
  return (
    <>
      <RarityBadge rarity={card.rarity} size="deck" className="deck-card-rarity-corner" />
      <LimitBreakStars
        stars={card.stars}
        rarity={card.rarity}
        className="deck-card-stars-corner"
      />
      <div className="deck-card-content">
        <div className="deck-card-art">
          <CardPreview pixels={card.pixels} />
        </div>
        <div className="deck-card-body">
          <div className="deck-card-name-row">
            <span className="deck-card-name">{card.name}</span>
            {isTalismanEquipped(card) && (
              <TalismanCardBadge variant="equipped" size="deck" />
            )}
          </div>
          <div className="deck-card-meta-row">
            <div className="deck-card-stats-primary">
              <span className="deck-card-bp">{card.bp}</span>
              <AttributeBadge
                attribute={card.attribute}
                className="deck-card-attribute"
                size="deck"
              />
            </div>
            <CardBattleRecord
              className="deck-card-record muted"
              wins={card.wins}
              losses={card.losses}
              reviveCount={card.reviveCount}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function formatReviveConfirmMessage(card: Card): string {
  const reviveCost = calcFullReviveCost(card);
  return `「${card.name}」を復活させます。${reviveCost.toLocaleString()}pxを消費します。`;
}

function DeleteConfirmMessage({ card }: { card: Card }) {
  const { pixels, shards } = calcLostCardDeleteRewards(card);
  const hasRefund = pixels > 0 || shards > 0;
  const returnsTalisman = isTalismanEquipped(card);

  return (
    <span className="confirm-dialog-message-body">
      <span className="confirm-dialog-message-line">
        <JewelAmount
          amount={JEWEL_COST_DELETE}
          className="confirm-dialog-jewel-amount"
          iconClassName="confirm-dialog-jewel-icon"
        />
        を消費して、「{card.name}」をデッキから削除します。
      </span>
      {(hasRefund || returnsTalisman) && (
        <span className="confirm-dialog-message-line confirm-dialog-message-line--refund">
          {pixels > 0 && (
            <span className="confirm-dialog-px-reward">
              <PixelCoinIcon className="confirm-dialog-coin-icon" />
              {pixels.toLocaleString()}
            </span>
          )}
          {pixels > 0 && shards > 0 ? 'と' : null}
          {shards > 0 && (
            <span className="confirm-dialog-shard-reward">
              <AttributeBadge
                attribute={card.attribute}
                className="confirm-dialog-shard-badge"
              />
              <span className="confirm-dialog-shard-label">
                のかけら{shards > 1 ? `${shards.toLocaleString()}個` : '1個'}
              </span>
            </span>
          )}
          {returnsTalisman && (
            <span className="confirm-dialog-talisman-reward">
              {(pixels > 0 || shards > 0) && 'と'}
              <TalismanIcon className="confirm-dialog-talisman-icon" />
              <span className="confirm-dialog-talisman-label">護符1個</span>
            </span>
          )}
          が返還されます。
        </span>
      )}
    </span>
  );
}

export function DeckScreen({
  deck,
  decks,
  activeDeckIndex,
  unlockedDeckCount,
  userLevel,
  deckNames,
  reorderMode,
  onReorderModeChange,
  detailCardId,
  onDetailCardIdChange,
  onSelectDeckIndex,
  onCreateCard,
  onEditCard,
  onDeleteCard,
  onReviveLostCard,
  onAddCardToMemoryAlbum,
  onUnlockMemoryAlbumRow,
  onOpenMemoryAlbum,
  memoryAlbum,
  inventory,
  onLimitBreakCard,
  onRetouchCardAttribute,
  onCommitRetouchCardAttribute,
  onSelectCardAttribute,
  paletteShopUnlocks = [],
  freePixels,
  jewels,
  onReorderDeck,
  onMoveCardBetweenDecks,
  onUnlockDeck,
  onRenameDeck,
  onEquipTalisman,
  onUnequipTalisman,
  showLostCardDeckNotice = false,
  onDismissLostCardDeckNoticeForToday,
}: DeckScreenProps) {
  const [dragState, setDragState] = useState<DeckDragState | null>(null);
  const [lostCardNoticePendingId, setLostCardNoticePendingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null);
  const [deleteConfirmFinal, setDeleteConfirmFinal] = useState(false);
  const [deleteResult, setDeleteResult] = useState<CardDeleteOutcome | null>(null);
  const [pendingRevive, setPendingRevive] = useState<Card | null>(null);
  const [pendingDisposition, setPendingDisposition] = useState<Card | null>(null);
  const [pendingAlbumAdd, setPendingAlbumAdd] = useState<Card | null>(null);
  const [pendingAlbumFull, setPendingAlbumFull] = useState<Card | null>(null);
  const [pendingEquipTalisman, setPendingEquipTalisman] = useState<Card | null>(null);
  const [pendingUnequipTalisman, setPendingUnequipTalisman] = useState<Card | null>(null);
  const [unlockModalSlot, setUnlockModalSlot] = useState<number | null>(null);
  const [renameDeckIndex, setRenameDeckIndex] = useState<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const lastTabTapRef = useRef<{ index: number; at: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const targetDropListRef = useRef<HTMLUListElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DeckDragState | null>(null);

  const deckLayout = normalizeDeckLayout(deck);
  const deckCardCount = countDeckCards(deckLayout);

  useEffect(() => {
    if (!reorderMode) return;
    const el = listRef.current;
    if (!el) return;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener('selectstart', prevent);
    el.addEventListener('contextmenu', prevent);
    return () => {
      el.removeEventListener('selectstart', prevent);
      el.removeEventListener('contextmenu', prevent);
    };
  }, [reorderMode]);

  useEffect(() => {
    setLostCardNoticePendingId(null);
  }, [activeDeckIndex]);

  const selectedCard =
    detailCardId != null
      ? deckLayout.find((item) => item?.id === detailCardId) ?? null
      : null;

  const closeDetail = useCallback(() => {
    onDetailCardIdChange(null);
  }, [onDetailCardIdChange]);

  const handleCardPress = useCallback(
    (card: Card) => {
      if (isCardLost(card) && showLostCardDeckNotice) {
        setLostCardNoticePendingId(card.id);
        return;
      }
      onDetailCardIdChange(card.id);
    },
    [onDetailCardIdChange, showLostCardDeckNotice],
  );

  const handleLostCardNoticeConfirm = useCallback(
    (options: { suppressToday: boolean }) => {
      const cardId = lostCardNoticePendingId;
      if (!cardId) return;
      if (options.suppressToday) {
        onDismissLostCardDeckNoticeForToday?.();
      }
      setLostCardNoticePendingId(null);
      onDetailCardIdChange(cardId);
    },
    [lostCardNoticePendingId, onDetailCardIdChange, onDismissLostCardDeckNoticeForToday],
  );

  const exitReorderMode = useCallback(() => {
    onReorderModeChange(false);
    dragSessionRef.current = null;
    setDragState(null);
  }, [onReorderModeChange]);

  const moveCard = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || from >= DECK_MAX || to < 0 || to >= DECK_MAX) return;
      onReorderDeck(moveCardInLayout(deckLayout, from, to));
    },
    [deckLayout, onReorderDeck],
  );

  const handleDeleteRequest = useCallback(
    (card: Card) => {
      if (jewels < JEWEL_COST_DELETE) return;
      setDeleteConfirmFinal(false);
      setPendingDelete(card);
    },
    [jewels],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!pendingDelete) return;
    if (jewels < JEWEL_COST_DELETE) return;
    if (!deleteConfirmFinal) {
      setDeleteConfirmFinal(true);
      return;
    }
    const outcome = onDeleteCard(pendingDelete.id);
    setPendingDelete(null);
    setDeleteConfirmFinal(false);
    if (outcome) {
      setDeleteResult(outcome);
    }
    if (deckCardCount <= 1) {
      exitReorderMode();
    }
  }, [
    deckCardCount,
    deleteConfirmFinal,
    exitReorderMode,
    jewels,
    onDeleteCard,
    pendingDelete,
  ]);

  const handleDeleteCancel = useCallback(() => {
    setPendingDelete(null);
    setDeleteConfirmFinal(false);
  }, []);

  const handleEditFromDetail = useCallback(() => {
    if (!selectedCard || isCardLost(selectedCard)) return;
    onEditCard(selectedCard, { returnToDetail: true });
  }, [onEditCard, selectedCard]);

  const handleLostDeleteRequest = useCallback(() => {
    if (!selectedCard || !isCardLost(selectedCard)) return;
    handleDeleteRequest(selectedCard);
  }, [handleDeleteRequest, selectedCard]);

  const handleReviveRequest = useCallback(() => {
    if (!selectedCard || !isCardLost(selectedCard)) return;
    if (!canReviveLostCard(selectedCard)) return;
    if (freePixels < calcFullReviveCost(selectedCard)) return;
    setPendingRevive(selectedCard);
  }, [freePixels, selectedCard]);

  const handleReviveConfirm = useCallback(() => {
    if (!pendingRevive) return;
    onReviveLostCard(pendingRevive.id);
    setPendingRevive(null);
  }, [onReviveLostCard, pendingRevive]);

  const handleReviveCancel = useCallback(() => {
    setPendingRevive(null);
  }, []);

  const handleActiveRemoveRequest = useCallback(() => {
    if (!selectedCard || isCardLost(selectedCard)) return;
    setPendingDisposition(selectedCard);
  }, [selectedCard]);

  const handleAlbumAddRequest = useCallback(() => {
    if (!selectedCard) return;
    if (memoryAlbumHasSpace(memoryAlbum)) {
      setPendingAlbumAdd(selectedCard);
      return;
    }
    setPendingAlbumFull(selectedCard);
  }, [memoryAlbum, selectedCard]);

  const handleAlbumAddConfirm = useCallback(() => {
    if (!pendingAlbumAdd) return;
    const result = onAddCardToMemoryAlbum(pendingAlbumAdd.id);
    setPendingAlbumAdd(null);
    if (result === 'ok') {
      onDetailCardIdChange(null);
    } else if (result === 'full') {
      setPendingAlbumFull(pendingAlbumAdd);
    }
  }, [onAddCardToMemoryAlbum, onDetailCardIdChange, pendingAlbumAdd]);

  const handleAlbumFullUnlock = useCallback(() => {
    const card = pendingAlbumFull;
    const error = onUnlockMemoryAlbumRow();
    if (error || !card) return;
    if (memoryAlbumHasSpace({ ...memoryAlbum, unlockedRows: memoryAlbum.unlockedRows + 1 })) {
      const result = onAddCardToMemoryAlbum(card.id);
      setPendingAlbumFull(null);
      if (result === 'ok') {
        onDetailCardIdChange(null);
      }
    }
  }, [
    memoryAlbum,
    onAddCardToMemoryAlbum,
    onDetailCardIdChange,
    onUnlockMemoryAlbumRow,
    pendingAlbumFull,
  ]);

  const handleAlbumFullDelete = useCallback(() => {
    if (!pendingAlbumFull) return;
    handleDeleteRequest(pendingAlbumFull);
    setPendingAlbumFull(null);
  }, [handleDeleteRequest, pendingAlbumFull]);

  const showTalismanUi =
    isLossEnabledAtUserLevel(userLevel) &&
    selectedCard != null &&
    !isCardLost(selectedCard);

  const handleTalismanPress = useCallback(() => {
    if (!selectedCard || !showTalismanUi) return;
    if (isTalismanEquipped(selectedCard)) {
      setPendingUnequipTalisman(selectedCard);
      return;
    }
    if (inventory.talisman <= 0) return;
    setPendingEquipTalisman(selectedCard);
  }, [inventory.talisman, selectedCard, showTalismanUi]);

  const handleEquipTalismanConfirm = useCallback(() => {
    if (!pendingEquipTalisman) return;
    onEquipTalisman(pendingEquipTalisman.id);
    setPendingEquipTalisman(null);
  }, [onEquipTalisman, pendingEquipTalisman]);

  const handleEquipTalismanCancel = useCallback(() => {
    setPendingEquipTalisman(null);
  }, []);

  const handleUnequipTalismanConfirm = useCallback(() => {
    if (!pendingUnequipTalisman) return;
    onUnequipTalisman(pendingUnequipTalisman.id);
    setPendingUnequipTalisman(null);
  }, [onUnequipTalisman, pendingUnequipTalisman]);

  const handleUnequipTalismanCancel = useCallback(() => {
    setPendingUnequipTalisman(null);
  }, []);

  const finishDrag = useCallback(
    (state: DeckDragState, endX: number, endY: number) => {
      dragSessionRef.current = null;
      setDragState(null);

      const crossDeck =
        state.targetDeckIndex != null &&
        state.targetDeckIndex !== state.sourceDeckIndex;

      if (crossDeck && state.targetDeckIndex != null) {
        const targetListEl = targetDropListRef.current;
        const overPanel =
          targetListEl != null &&
          isPointInRect(endX, endY, targetListEl.getBoundingClientRect());

        if (overPanel && targetListEl) {
          const slotIndex =
            state.targetDropIndex ?? findDeckDropIndex(endY, targetListEl);
          if (slotIndex != null) {
            onMoveCardBetweenDecks(
              state.sourceDeckIndex,
              state.fromIndex,
              state.targetDeckIndex,
              slotIndex,
            );
          }
          return;
        }

        const tabsEl = tabsRef.current;
        const tabAtEnd =
          tabsEl != null
            ? findDeckTabIndexAtPoint(endX, endY, tabsEl)
            : null;
        if (
          tabAtEnd != null &&
          tabAtEnd === state.targetDeckIndex &&
          isDeckSlotUnlocked(tabAtEnd, unlockedDeckCount)
        ) {
          const targetLayout = normalizeDeckLayout(decks[tabAtEnd] ?? []);
          const emptyIndex = findFirstEmptySlotInLayout(targetLayout);
          if (emptyIndex >= 0) {
            onMoveCardBetweenDecks(
              state.sourceDeckIndex,
              state.fromIndex,
              tabAtEnd,
              emptyIndex,
            );
          }
        }
        return;
      }

      if (state.fromIndex !== state.dropIndex) {
        moveCard(state.fromIndex, state.dropIndex);
      }
    },
    [decks, moveCard, onMoveCardBetweenDecks, unlockedDeckCount],
  );

  const handleHandlePointerDown = useCallback(
    (index: number, event: PointerEvent<HTMLSpanElement>) => {
      if (!reorderMode || event.button !== 0 || dragSessionRef.current) return;
      const row = event.currentTarget.closest<HTMLElement>('[data-deck-index]');
      if (!row || !listRef.current) return;

      event.preventDefault();

      const rect = row.getBoundingClientRect();
      listRef.current.style.setProperty('--deck-row-shift', `${rect.height}px`);

      const rowPointerOffsetX = event.clientX - rect.left;
      const rowPointerOffsetY = event.clientY - rect.top;

      const session: DeckDragState = {
        cardId: deckLayout[index]?.id ?? '',
        sourceDeckIndex: activeDeckIndex,
        fromIndex: index,
        dropIndex: index,
        targetDeckIndex: null,
        targetDropIndex: null,
        ghostLeft: event.clientX - rowPointerOffsetX,
        ghostTop: event.clientY - rowPointerOffsetY,
        ghostWidth: rect.width,
        rowHeight: rect.height,
        rowPointerOffsetX,
        rowPointerOffsetY,
      };
      dragSessionRef.current = session;
      setDragState(session);

      const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
        const prev = dragSessionRef.current;
        const listEl = listRef.current;
        const tabsEl = tabsRef.current;
        const targetListEl = targetDropListRef.current;
        if (!prev) return;

        const { clientX, clientY } = moveEvent;
        let targetDeckIndex = prev.targetDeckIndex;
        let targetDropIndex = prev.targetDropIndex;
        let dropIndex = prev.dropIndex;

        if (tabsEl) {
          const tabIndex = findDeckTabIndexAtPoint(clientX, clientY, tabsEl);
          if (tabIndex != null && isDeckSlotUnlocked(tabIndex, unlockedDeckCount)) {
            if (tabIndex !== prev.sourceDeckIndex) {
              if (targetDeckIndex !== tabIndex) {
                targetDeckIndex = tabIndex;
                targetDropIndex = null;
              }
            } else {
              targetDeckIndex = null;
              targetDropIndex = null;
            }
          }
        }

        const crossDeckTarget =
          targetDeckIndex != null && targetDeckIndex !== prev.sourceDeckIndex;

        if (
          crossDeckTarget &&
          targetListEl &&
          isPointInRect(clientX, clientY, targetListEl.getBoundingClientRect())
        ) {
          targetDropIndex =
            findDeckDropIndex(clientY, targetListEl) ?? targetDropIndex;
          dropIndex = prev.fromIndex;
        } else if (
          !crossDeckTarget &&
          listEl &&
          isPointInRect(clientX, clientY, listEl.getBoundingClientRect())
        ) {
          dropIndex = findDeckDropIndex(clientY, listEl) ?? dropIndex;
          targetDropIndex = null;
        } else if (crossDeckTarget) {
          dropIndex = prev.fromIndex;
        }

        const ghostLeft = crossDeckTarget
          ? clientX - DECK_DRAG_CHIP_SIZE / 2
          : clientX - prev.rowPointerOffsetX;
        const ghostTop = crossDeckTarget
          ? clientY - DECK_DRAG_CHIP_SIZE / 2
          : clientY - prev.rowPointerOffsetY;

        const next: DeckDragState = {
          ...prev,
          ghostLeft,
          ghostTop,
          dropIndex,
          targetDeckIndex,
          targetDropIndex,
        };
        dragSessionRef.current = next;
        setDragState(next);
      };

      const onPointerEnd = (endEvent: globalThis.PointerEvent) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerEnd);
        window.removeEventListener('pointercancel', onPointerEnd);
        const state = dragSessionRef.current;
        if (state) finishDrag(state, endEvent.clientX, endEvent.clientY);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerEnd);
      window.addEventListener('pointercancel', onPointerEnd);
    },
    [activeDeckIndex, deckLayout, finishDrag, reorderMode, unlockedDeckCount],
  );

  const toggleReorderMode = () => {
    if (reorderMode) {
      exitReorderMode();
      return;
    }
    if (deckCardCount === 0) return;
    closeDetail();
    onReorderModeChange(true);
  };

  const clearDeckTabLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openDeckRenameDialog = useCallback(
    (index: number) => {
      if (!onRenameDeck || reorderMode || dragState) return;
      if (!isDeckSlotUnlocked(index, unlockedDeckCount)) return;
      longPressTriggeredRef.current = true;
      setRenameDeckIndex(index);
    },
    [dragState, onRenameDeck, reorderMode, unlockedDeckCount],
  );

  const handleDeckTabPointerDown = useCallback(
    (index: number) => {
      if (!onRenameDeck || reorderMode || dragState) return;
      if (!isDeckSlotUnlocked(index, unlockedDeckCount)) return;
      longPressTriggeredRef.current = false;
      clearDeckTabLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        openDeckRenameDialog(index);
      }, DECK_TAB_LONG_PRESS_MS);
    },
    [
      clearDeckTabLongPress,
      dragState,
      onRenameDeck,
      openDeckRenameDialog,
      reorderMode,
      unlockedDeckCount,
    ],
  );

  const handleDeckTabPointerUp = useCallback(() => {
    clearDeckTabLongPress();
  }, [clearDeckTabLongPress]);

  const handleDeckTabSelect = (index: number) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (dragState) return;
    if (!isDeckSlotUnlocked(index, unlockedDeckCount)) {
      setUnlockModalSlot(index);
      return;
    }
    if (index === activeDeckIndex) {
      if (onRenameDeck) {
        const now = Date.now();
        const lastTap = lastTabTapRef.current;
        if (lastTap?.index === index && now - lastTap.at <= DECK_TAB_DOUBLE_TAP_MS) {
          lastTabTapRef.current = null;
          openDeckRenameDialog(index);
          return;
        }
        lastTabTapRef.current = { index, at: now };
      }
      return;
    }
    lastTabTapRef.current = null;
    closeDetail();
    onSelectDeckIndex(index);
  };

  const selectedIsLost =
    selectedCard != null && isCardLost(selectedCard);

  const draggedCard =
    dragState != null
      ? decks[dragState.sourceDeckIndex]?.[dragState.fromIndex] ?? null
      : null;

  const crossDeckTargetIndex =
    dragState?.targetDeckIndex != null &&
    dragState.targetDeckIndex !== dragState.sourceDeckIndex
      ? dragState.targetDeckIndex
      : null;

  const crossDeckTarget =
    crossDeckTargetIndex != null
      ? normalizeDeckLayout(decks[crossDeckTargetIndex] ?? [])
      : [];

  const deckPower = computeDeckPower(getDeckCards(deckLayout));

  return (
    <section
      className={`screen screen-deck${reorderMode ? ' screen-deck-reordering' : ''}${dragState ? ' screen-deck-dragging' : ''}`}
    >
      <div
        ref={tabsRef}
        className={`deck-slot-tabs${reorderMode ? ' deck-slot-tabs-reordering' : ''}${dragState ? ' deck-slot-tabs-dragging' : ''}`}
        role="tablist"
        aria-label="デッキ"
      >
        {Array.from({ length: DECK_SLOT_COUNT }, (_, index) => {
          const unlocked = isDeckSlotUnlocked(index, unlockedDeckCount);
          const isActive = index === activeDeckIndex;
          const slotDeck = normalizeDeckLayout(decks[index] ?? []);
          const slotCount = countDeckCards(slotDeck);
          const sourceDeckIndex = dragState?.sourceDeckIndex ?? activeDeckIndex;
          const isDropTarget =
            dragState?.targetDeckIndex === index ||
            crossDeckTargetIndex === index;
          const customTabName = deckNames?.[index]?.trim();
          const isDropEligible =
            reorderMode && unlocked && index !== sourceDeckIndex;
          const displayName = getDeckDisplayName(index, deckNames);
          const tabLabel = unlocked
            ? isDropEligible
              ? crossDeckTargetIndex === index
                ? `${displayName} ${slotCount}/${DECK_MAX}枚 — 配置先`
                : `${displayName} ${slotCount}/${DECK_MAX}枚 — タップで配置先表示`
              : `${displayName} ${slotCount}/${DECK_MAX}枚`
            : `${displayName} 未解放`;
          return (
            <button
              key={index}
              type="button"
              role="tab"
              data-deck-tab-index={index}
              aria-selected={isActive}
              aria-label={
                unlocked && onRenameDeck && !reorderMode
                  ? `${tabLabel}。長押しまたは選択中にダブルタップで名前を変更`
                  : tabLabel
              }
              title={
                unlocked && onRenameDeck && !reorderMode
                  ? '長押しで名前を変更'
                  : undefined
              }
              className={[
                'deck-slot-tab',
                isActive ? 'is-active' : '',
                !unlocked ? 'is-locked' : '',
                customTabName ? 'has-deck-name' : '',
                isDropEligible ? 'is-drop-eligible' : '',
                isDropTarget ? 'is-drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleDeckTabSelect(index)}
              onPointerDown={() => handleDeckTabPointerDown(index)}
              onPointerUp={handleDeckTabPointerUp}
              onPointerCancel={handleDeckTabPointerUp}
              onPointerLeave={handleDeckTabPointerUp}
              onContextMenu={(event) => {
                if (!onRenameDeck || reorderMode || dragState) return;
                if (!isDeckSlotUnlocked(index, unlockedDeckCount)) return;
                event.preventDefault();
                openDeckRenameDialog(index);
              }}
            >
              <span
                className={[
                  'deck-slot-tab-label',
                  customTabName ? 'deck-slot-tab-label--name' : 'deck-slot-tab-label--index',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {getDeckTabShortLabel(index, deckNames)}
              </span>
              {unlocked ? (
                <span className="deck-slot-tab-count">{slotCount}/{DECK_MAX}</span>
              ) : (
                <span className="deck-slot-tab-lock" aria-hidden>
                  🔒
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="deck-screen-header">
        {crossDeckTargetIndex != null ? (
          <p className="muted deck-cross-drop-hint">
            スロットを選んでドロップ（カード同士は入れ替え）。タブ上でドロップすると空きスロットへ自動配置（満杯のときはキャンセル）
          </p>
        ) : deckCardCount < DECK_MAX && !reorderMode ? (
          <p className="deck-screen-progress-hint muted">
            {deckCardCount} / {DECK_MAX} 枚 — あと {DECK_MAX - deckCardCount}{' '}
            枚でバトル可能
          </p>
        ) : (
          <p className="deck-screen-power" aria-label={`戦力 ${deckPower}`}>
            戦力{' '}
            <span className="deck-screen-power-value">{deckPower}</span>
          </p>
        )}
      </div>

      {crossDeckTargetIndex != null ? (
        <TargetDeckDropPanel
          deck={crossDeckTarget}
          targetDropIndex={dragState?.targetDropIndex ?? null}
          listRef={targetDropListRef}
        />
      ) : (
      <ul
        ref={listRef}
        className={`card-list${reorderMode ? ' card-list-reordering' : ''}${
          dragState ? ' card-list-dragging' : ''
        }`}
      >
        {Array.from({ length: DECK_MAX }, (_, index) => {
          const card = deckLayout[index];
          if (!card) {
            return (
              <li
                key={`empty-${index}`}
                className={`deck-card-row deck-card-row--empty${reorderMode ? ' deck-card-row--empty-disabled' : ''}`}
              >
                <button
                  type="button"
                  className="deck-card-empty-slot"
                  disabled={reorderMode}
                  onClick={onCreateCard}
                  aria-label="新規カードを作成"
                >
                  <span className="deck-card-empty-icon" aria-hidden>
                    ＋
                  </span>
                  <span className="deck-card-empty-label">新規作成</span>
                </button>
              </li>
            );
          }

          const rarityMeta = getRarityMeta(card.rarity);
          const cardIsLost = isCardLost(card);
          const isDragSource = dragState?.fromIndex === index;
          const shift =
            dragState != null && dragState.targetDeckIndex == null
              ? getDeckRowShift(index, dragState.fromIndex, dragState.dropIndex)
              : 0;

          return (
            <li
              key={card.id}
              data-deck-index={index}
              className={[
                'deck-card-row',
                `deck-card-row--${card.rarity}`,
                cardIsLost ? 'deck-card-row--lost' : '',
                reorderMode ? 'deck-card-row-reordering' : '',
                isDragSource ? 'deck-card-row-drag-source' : '',
                shift === -1 ? 'deck-card-row-shift-up' : '',
                shift === 1 ? 'deck-card-row-shift-down' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={deckRowStyle(rarityMeta)}
            >
              {isDragSource && dragState ? (
                <>
                  <div
                    className="deck-card-slot"
                    style={{ minHeight: dragState.rowHeight }}
                    aria-hidden
                  />
                  <span
                    className="deck-card-drag-handle deck-drag-ghost-spacer"
                    aria-hidden
                  >
                    ≡
                  </span>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="deck-card-main"
                    disabled={reorderMode}
                    onClick={() => handleCardPress(card)}
                  >
                    <DeckCardRowBody card={card} />
                    {cardIsLost && (
                      <span className="card-lost-badge card-lost-badge--row" aria-hidden>
                        ロスト中
                      </span>
                    )}
                  </button>
                  {reorderMode && (
                    <span
                      className="deck-card-drag-handle"
                      aria-label="ドラッグで並べ替え、他デッキタブへ移動"
                      title="ドラッグで並べ替え、他デッキタブへ移動"
                      onPointerDown={(event) => handleHandlePointerDown(index, event)}
                    >
                      ≡
                    </span>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      )}

      <div className="deck-screen-footer">
        <button
          type="button"
          className="deck-memory-album-btn"
          onClick={onOpenMemoryAlbum}
        >
          思い出アルバム
        </button>
        {(reorderMode || deckCardCount > 0) && (
          <button
            type="button"
            className={`deck-reorder-toggle${reorderMode ? ' active' : ''}`}
            onClick={toggleReorderMode}
            disabled={dragState != null || (!reorderMode && deckCardCount === 0)}
          >
            {reorderMode ? '完了' : '並べ替え'}
          </button>
        )}
      </div>

      {dragState && draggedCard && (
        crossDeckTargetIndex != null ? (
          <div
            className={`deck-drag-chip-float deck-drag-chip-float--cross-deck${
              dragState.targetDropIndex != null ? ' deck-drag-chip-float--slot-ready' : ''
            }`}
            style={{
              left: dragState.ghostLeft,
              top: dragState.ghostTop,
              width: DECK_DRAG_CHIP_SIZE,
              height: DECK_DRAG_CHIP_SIZE,
            }}
            aria-hidden
          >
            <DeckDragChip card={draggedCard} />
          </div>
        ) : (
          <div
            className={[
              'deck-drag-ghost',
              'deck-card-row',
              `deck-card-row--${draggedCard.rarity}`,
              isCardLost(draggedCard) ? 'deck-card-row--lost' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: dragState.ghostLeft,
              top: dragState.ghostTop,
              width: dragState.ghostWidth,
              minHeight: dragState.rowHeight,
              ...deckRowStyle(getRarityMeta(draggedCard.rarity)),
            }}
            aria-hidden
          >
            <div className="deck-card-main deck-drag-ghost-inner">
              <DeckCardRowBody card={draggedCard} />
              {isCardLost(draggedCard) && (
                <span className="card-lost-badge card-lost-badge--row" aria-hidden>
                  ロスト中
                </span>
              )}
            </div>
            <span className="deck-card-drag-handle deck-drag-ghost-spacer" aria-hidden>
              ≡
            </span>
          </div>
        )
      )}

      {lostCardNoticePendingId != null && (
        <LostCardDeckNoticeModal onConfirm={handleLostCardNoticeConfirm} />
      )}

      {selectedCard && (
        <DeckCardDetailOverlay
          card={selectedCard}
          isLost={selectedIsLost}
          userLevel={userLevel}
          freePixels={freePixels}
          reviveCost={calcFullReviveCost(selectedCard)}
          attributeShardCount={
            inventory.limitBreakShards[selectedCard.attribute] ?? 0
          }
          universalShardCount={inventory.limitBreakUniversal}
          jewels={jewels}
          onClose={closeDetail}
          onEdit={handleEditFromDetail}
          onDelete={handleActiveRemoveRequest}
          onDeleteLost={handleLostDeleteRequest}
          onReviveLost={handleReviveRequest}
          onAddToAlbum={handleAlbumAddRequest}
          onLimitBreak={(spend) => onLimitBreakCard(selectedCard.id, spend)}
          onRetouchCardAttribute={onRetouchCardAttribute}
          onCommitRetouchCardAttribute={onCommitRetouchCardAttribute}
          onSelectCardAttribute={onSelectCardAttribute}
          paletteShopUnlocks={paletteShopUnlocks}
          showTalismanUi={showTalismanUi}
          unusedTalismanCount={inventory.talisman}
          onTalismanPress={showTalismanUi ? handleTalismanPress : undefined}
        />
      )}

      {renameDeckIndex != null && onRenameDeck && (
        <DeckRenameDialog
          deckIndex={renameDeckIndex}
          deckNames={deckNames}
          unlockedDeckCount={unlockedDeckCount}
          onSave={onRenameDeck}
          onClose={() => setRenameDeckIndex(null)}
        />
      )}

      {unlockModalSlot != null && (
        <DeckUnlockModal
          slotIndex={unlockModalSlot}
          unlockedDeckCount={unlockedDeckCount}
          userLevel={userLevel}
          jewels={jewels}
          onClose={() => setUnlockModalSlot(null)}
          onUnlock={
            onUnlockDeck
              ? (slotIndex) => {
                  const error = onUnlockDeck(slotIndex);
                  if (!error) {
                    setUnlockModalSlot(null);
                  }
                  return error;
                }
              : undefined
          }
        />
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        title={deleteConfirmFinal ? '本当に削除しますか？' : 'カードを削除しますか？'}
        message={
          pendingDelete
            ? deleteConfirmFinal
              ? 'この操作は取り消せません。'
              : <DeleteConfirmMessage card={pendingDelete} />
            : ''
        }
        confirmLabel={deleteConfirmFinal ? 'はい（削除する）' : '削除する'}
        cancelLabel={deleteConfirmFinal ? 'いいえ' : 'キャンセル'}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {deleteResult != null && (
        <CardDeleteResultModal
          outcome={deleteResult}
          onClose={() => setDeleteResult(null)}
        />
      )}

      <ConfirmDialog
        open={pendingRevive != null}
        title="復活しますか？"
        message={
          pendingRevive ? formatReviveConfirmMessage(pendingRevive) : ''
        }
        confirmLabel="復活する"
        cancelLabel="キャンセル"
        onConfirm={handleReviveConfirm}
        onCancel={handleReviveCancel}
      />

      <CardDeckDispositionDialog
        open={pendingDisposition != null}
        cardName={pendingDisposition?.name ?? ''}
        onDelete={() => {
          if (!pendingDisposition) return;
          handleDeleteRequest(pendingDisposition);
          setPendingDisposition(null);
        }}
        onAddToAlbum={() => {
          if (!pendingDisposition) return;
          const card = pendingDisposition;
          setPendingDisposition(null);
          if (memoryAlbumHasSpace(memoryAlbum)) {
            setPendingAlbumAdd(card);
          } else {
            setPendingAlbumFull(card);
          }
        }}
        onCancel={() => setPendingDisposition(null)}
      />

      <ConfirmDialog
        open={pendingAlbumAdd != null}
        title="思い出アルバムに保存"
        message={MEMORY_ALBUM_SAVE_CONFIRM_MESSAGE}
        confirmLabel="保存する"
        cancelLabel="キャンセル"
        confirmVariant="primary"
        onConfirm={handleAlbumAddConfirm}
        onCancel={() => setPendingAlbumAdd(null)}
      />

      <MemoryAlbumFullDialog
        open={pendingAlbumFull != null}
        cardName={pendingAlbumFull?.name ?? ''}
        jewelCost={JEWEL_COST_MEMORY_ALBUM_ROW}
        canAffordUnlock={jewels >= JEWEL_COST_MEMORY_ALBUM_ROW}
        onUnlockRow={handleAlbumFullUnlock}
        onDelete={handleAlbumFullDelete}
        onCancel={() => setPendingAlbumFull(null)}
      />

      <ConfirmDialog
        open={pendingEquipTalisman != null}
        title="護符をつけますか？"
        message={
          pendingEquipTalisman
            ? `このカードに護符を適用します。よろしいですか？`
            : ''
        }
        confirmLabel="はい"
        cancelLabel="いいえ"
        confirmVariant="primary"
        onConfirm={handleEquipTalismanConfirm}
        onCancel={handleEquipTalismanCancel}
      />

      <ConfirmDialog
        open={pendingUnequipTalisman != null}
        title="護符を外しますか？"
        message={
          pendingUnequipTalisman
            ? `このカードから護符を外します。よろしいですか？`
            : ''
        }
        confirmLabel="はい"
        cancelLabel="いいえ"
        confirmVariant="primary"
        onConfirm={handleUnequipTalismanConfirm}
        onCancel={handleUnequipTalismanCancel}
      />
    </section>
  );
}
