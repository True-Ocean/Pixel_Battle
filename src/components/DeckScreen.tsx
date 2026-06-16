import { useCallback, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from 'react';
import { canDowngradeRevive, computeDeckPower, getDowngradedRarity, isCardLost, type LimitBreakShardSpendPlan } from '../card';
import { calcCardDeleteRefundPixels } from '../config/economy';
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
import type { Card, DeckLayout, UserInventory } from '../types';
import { getRarityMeta, type RarityMeta } from '../config/rarity';
import { AttributeBadge } from './AttributeBadge';
import { CardBattleRecord } from './CardBattleRecord';
import { LimitBreakStars } from './LimitBreakStars';
import { RarityBadge } from './RarityBadge';
import { CardPreview } from './CardPreview';
import { ConfirmDialog } from './ConfirmDialog';
import { DeckCardDetailOverlay } from './DeckCardDetailOverlay';
import { DeckRenameDialog } from './DeckRenameDialog';
import { DeckUnlockModal } from './DeckUnlockModal';
import {
  findDeckDropIndex,
  findDeckTabIndexAtPoint,
  getDeckRowShift,
} from './deckReorder';

const DECK_DRAG_CHIP_SIZE = 56;
const DECK_TAB_LONG_PRESS_MS = 500;
const DECK_TAB_DOUBLE_TAP_MS = 320;

interface DeckScreenProps {
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
  onDeleteCard: (id: string) => void;
  onReviveLostCard: (id: string) => void;
  onDowngradeReviveLostCard: (id: string) => void;
  inventory: UserInventory;
  onLimitBreakCard: (id: string, spend: LimitBreakShardSpendPlan) => void;
  freePixels: number;
  jewels: number;
  reviveCost: number;
  downgradeReviveCost: number;
  onReorderDeck: (deck: DeckLayout) => void;
  onMoveCardBetweenDecks: (
    fromDeckIndex: number,
    fromCardIndex: number,
    toDeckIndex: number,
    toCardIndex: number,
  ) => void;
  onPrototypeUnlockDeck?: () => void;
  onRenameDeck?: (deckIndex: number, name: string) => void;
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
  rowHeight: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
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
          <span className="deck-card-name">{card.name}</span>
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

function formatReviveConfirmMessage(card: Card, reviveCost: number): string {
  return `「${card.name}」を完全復活させます。${reviveCost.toLocaleString()}pxを消費します。`;
}

function formatDowngradeReviveConfirmMessage(
  card: Card,
  downgradeReviveCost: number,
): string {
  const nextRarity = getDowngradedRarity(card.rarity);
  const transition =
    nextRarity != null
      ? `${card.rarity}★${card.stars}→${nextRarity}★${card.stars}`
      : '';
  const transitionNote = transition ? `（${transition}）` : '';
  return `${downgradeReviveCost.toLocaleString()}px消費して「${card.name}」を降格復活${transitionNote}させます。`;
}

function formatDeleteConfirmMessage(card: Card): string {
  const refundPixels = calcCardDeleteRefundPixels(card);
  const refundNote =
    refundPixels > 0
      ? ` 削除すると +${refundPixels.toLocaleString()}px 返還されます。`
      : '';
  return `「${card.name}」をデッキから削除します。戦績も失われます。${refundNote}`;
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
  onDowngradeReviveLostCard,
  inventory,
  onLimitBreakCard,
  freePixels,
  jewels,
  reviveCost,
  downgradeReviveCost,
  onReorderDeck,
  onMoveCardBetweenDecks,
  onPrototypeUnlockDeck,
  onRenameDeck,
}: DeckScreenProps) {
  const [dragState, setDragState] = useState<DeckDragState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null);
  const [deleteConfirmFinal, setDeleteConfirmFinal] = useState(false);
  const [pendingRevive, setPendingRevive] = useState<Card | null>(null);
  const [pendingDowngradeRevive, setPendingDowngradeRevive] = useState<Card | null>(null);
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

  const selectedCard =
    detailCardId != null
      ? deckLayout.find((item) => item?.id === detailCardId) ?? null
      : null;

  const closeDetail = useCallback(() => {
    onDetailCardIdChange(null);
  }, [onDetailCardIdChange]);

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

  const handleDeleteRequest = useCallback((card: Card) => {
    setDeleteConfirmFinal(false);
    setPendingDelete(card);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!pendingDelete) return;
    if (!deleteConfirmFinal) {
      setDeleteConfirmFinal(true);
      return;
    }
    onDeleteCard(pendingDelete.id);
    setPendingDelete(null);
    setDeleteConfirmFinal(false);
    if (deckCardCount <= 1) {
      exitReorderMode();
    }
  }, [
    deckCardCount,
    deleteConfirmFinal,
    exitReorderMode,
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
    if (freePixels < reviveCost) return;
    setPendingRevive(selectedCard);
  }, [freePixels, reviveCost, selectedCard]);

  const handleReviveConfirm = useCallback(() => {
    if (!pendingRevive) return;
    onReviveLostCard(pendingRevive.id);
    setPendingRevive(null);
  }, [onReviveLostCard, pendingRevive]);

  const handleReviveCancel = useCallback(() => {
    setPendingRevive(null);
  }, []);

  const handleDowngradeReviveRequest = useCallback(() => {
    if (!selectedCard || !canDowngradeRevive(selectedCard)) return;
    if (freePixels < downgradeReviveCost) return;
    setPendingDowngradeRevive(selectedCard);
  }, [downgradeReviveCost, freePixels, selectedCard]);

  const handleDowngradeReviveConfirm = useCallback(() => {
    if (!pendingDowngradeRevive) return;
    onDowngradeReviveLostCard(pendingDowngradeRevive.id);
    setPendingDowngradeRevive(null);
  }, [onDowngradeReviveLostCard, pendingDowngradeRevive]);

  const handleDowngradeReviveCancel = useCallback(() => {
    setPendingDowngradeRevive(null);
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

      const session: DeckDragState = {
        cardId: deckLayout[index]?.id ?? '',
        sourceDeckIndex: activeDeckIndex,
        fromIndex: index,
        dropIndex: index,
        targetDeckIndex: null,
        targetDropIndex: null,
        ghostLeft: event.clientX - DECK_DRAG_CHIP_SIZE / 2,
        ghostTop: event.clientY - DECK_DRAG_CHIP_SIZE / 2,
        rowHeight: rect.height,
        pointerOffsetX: DECK_DRAG_CHIP_SIZE / 2,
        pointerOffsetY: DECK_DRAG_CHIP_SIZE / 2,
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

        const next: DeckDragState = {
          ...prev,
          ghostLeft: clientX - prev.pointerOffsetX,
          ghostTop: clientY - prev.pointerOffsetY,
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
    <section className={`screen screen-deck${dragState ? ' screen-deck-dragging' : ''}`}>
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
                    onClick={() => onDetailCardIdChange(card.id)}
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

      {(reorderMode || deckCardCount > 0) && (
        <div className="deck-screen-footer">
          <button
            type="button"
            className={`deck-reorder-toggle${reorderMode ? ' active' : ''}`}
            onClick={toggleReorderMode}
            disabled={dragState != null || (!reorderMode && deckCardCount === 0)}
          >
            {reorderMode ? '完了' : '並べ替え'}
          </button>
        </div>
      )}

      {dragState && draggedCard && (
        <div
          className={`deck-drag-chip-float${
            crossDeckTargetIndex != null ? ' deck-drag-chip-float--cross-deck' : ''
          }${dragState.targetDropIndex != null ? ' deck-drag-chip-float--slot-ready' : ''}`}
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
      )}

      {selectedCard && (
        <DeckCardDetailOverlay
          card={selectedCard}
          isLost={selectedIsLost}
          freePixels={freePixels}
          reviveCost={reviveCost}
          downgradeReviveCost={downgradeReviveCost}
          attributeShardCount={
            inventory.limitBreakShards[selectedCard.attribute] ?? 0
          }
          universalShardCount={inventory.limitBreakUniversal}
          jewels={jewels}
          onClose={closeDetail}
          onEdit={handleEditFromDetail}
          onDelete={() => handleDeleteRequest(selectedCard)}
          onDeleteLost={handleLostDeleteRequest}
          onReviveLost={handleReviveRequest}
          onDowngradeReviveLost={handleDowngradeReviveRequest}
          onLimitBreak={(spend) => onLimitBreakCard(selectedCard.id, spend)}
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
          deckNames={deckNames}
          onClose={() => setUnlockModalSlot(null)}
          onPrototypeUnlock={
            onPrototypeUnlockDeck
              ? () => {
                  onPrototypeUnlockDeck();
                  setUnlockModalSlot(null);
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
              : formatDeleteConfirmMessage(pendingDelete)
            : ''
        }
        confirmLabel={deleteConfirmFinal ? 'はい（削除する）' : '削除する'}
        cancelLabel={deleteConfirmFinal ? 'いいえ' : 'キャンセル'}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <ConfirmDialog
        open={pendingRevive != null}
        title="完全復活しますか？"
        message={
          pendingRevive
            ? formatReviveConfirmMessage(pendingRevive, reviveCost)
            : ''
        }
        confirmLabel="復活する"
        cancelLabel="キャンセル"
        onConfirm={handleReviveConfirm}
        onCancel={handleReviveCancel}
      />

      <ConfirmDialog
        open={pendingDowngradeRevive != null}
        title="降格復活しますか？"
        message={
          pendingDowngradeRevive
            ? formatDowngradeReviveConfirmMessage(
                pendingDowngradeRevive,
                downgradeReviveCost,
              )
            : ''
        }
        confirmLabel="降格復活する"
        cancelLabel="キャンセル"
        onConfirm={handleDowngradeReviveConfirm}
        onCancel={handleDowngradeReviveCancel}
      />
    </section>
  );
}
