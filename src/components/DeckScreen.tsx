import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { computeDeckPower } from '../card';
import { DECK_MAX, DECK_SLOT_COUNT } from '../config/balance';
import { isDeckSlotUnlocked } from '../deckSlots';
import type { Card } from '../types';
import { getRarityMeta, type RarityMeta } from '../config/rarity';
import { AttributeBadge } from './AttributeBadge';
import { CardBattleRecord } from './CardBattleRecord';
import { LimitBreakStars } from './LimitBreakStars';
import { RarityBadge } from './RarityBadge';
import { CardPreview } from './CardPreview';
import { ConfirmDialog } from './ConfirmDialog';
import { DeckCardDetailOverlay } from './DeckCardDetailOverlay';
import { DeckUnlockModal } from './DeckUnlockModal';
import {
  findDeckDropIndex,
  getDeckRowShift,
  reorderDeckItems,
} from './deckReorder';

interface DeckScreenProps {
  deck: Card[];
  decks: Card[][];
  activeDeckIndex: number;
  unlockedDeckCount: number;
  fauxLostCardId: string | null;
  detailCardId: string | null;
  onDetailCardIdChange: (id: string | null) => void;
  onSelectDeckIndex: (index: number) => void;
  onCreateCard: () => void;
  onEditCard: (card: Card, options?: { returnToDetail?: boolean }) => void;
  onDeleteCard: (id: string) => void;
  onReviveFauxLost?: (id: string) => void;
  onReorderDeck: (deck: Card[]) => void;
}

interface DeckDragState {
  cardId: string;
  fromIndex: number;
  dropIndex: number;
  ghostLeft: number;
  ghostTop: number;
  ghostWidth: number;
  rowHeight: number;
  pointerOffsetY: number;
}

function deckRowStyle(rarityMeta: RarityMeta): CSSProperties {
  return {
    '--rarity-border': rarityMeta.rowBorder,
    '--rarity-bg': rarityMeta.rowBg,
    '--rarity-border-width': rarityMeta.rowBorderWidth,
    '--rarity-shadow': rarityMeta.rowBoxShadow ?? 'none',
  } as CSSProperties;
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

export function DeckScreen({
  deck,
  decks,
  activeDeckIndex,
  unlockedDeckCount,
  fauxLostCardId,
  detailCardId,
  onDetailCardIdChange,
  onSelectDeckIndex,
  onCreateCard,
  onEditCard,
  onDeleteCard,
  onReviveFauxLost,
  onReorderDeck,
}: DeckScreenProps) {
  const [reorderMode, setReorderMode] = useState(false);
  const [dragState, setDragState] = useState<DeckDragState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null);
  const [unlockModalSlot, setUnlockModalSlot] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dragSessionRef = useRef<DeckDragState | null>(null);

  const selectedCard =
    detailCardId != null
      ? deck.find((item) => item.id === detailCardId) ?? null
      : null;

  const closeDetail = useCallback(() => {
    onDetailCardIdChange(null);
  }, [onDetailCardIdChange]);

  const exitReorderMode = useCallback(() => {
    setReorderMode(false);
    dragSessionRef.current = null;
    setDragState(null);
  }, []);

  const moveCard = useCallback(
    (from: number, to: number) => {
      if (from === to || to < 0 || to >= deck.length) return;
      onReorderDeck(reorderDeckItems(deck, from, to));
    },
    [deck, onReorderDeck],
  );

  const handleDeleteRequest = useCallback(
    (card: Card) => {
      closeDetail();
      setPendingDelete(card);
    },
    [closeDetail],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!pendingDelete) return;
    onDeleteCard(pendingDelete.id);
    setPendingDelete(null);
    if (deck.length <= 1) {
      exitReorderMode();
    }
  }, [deck.length, exitReorderMode, onDeleteCard, pendingDelete]);

  const handleDeleteCancel = useCallback(() => {
    setPendingDelete(null);
  }, []);

  const handleEditFromDetail = useCallback(() => {
    if (!selectedCard) return;
    onEditCard(selectedCard, { returnToDetail: true });
  }, [onEditCard, selectedCard]);

  const handleReviveFromDetail = useCallback(() => {
    if (!selectedCard || !onReviveFauxLost) return;
    onReviveFauxLost(selectedCard.id);
    closeDetail();
  }, [closeDetail, onReviveFauxLost, selectedCard]);

  const finishDrag = useCallback(
    (state: DeckDragState) => {
      dragSessionRef.current = null;
      setDragState(null);
      if (state.fromIndex !== state.dropIndex) {
        moveCard(state.fromIndex, state.dropIndex);
      }
    },
    [moveCard],
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
        cardId: deck[index]?.id ?? '',
        fromIndex: index,
        dropIndex: index,
        ghostLeft: rect.left,
        ghostTop: rect.top,
        ghostWidth: rect.width,
        rowHeight: rect.height,
        pointerOffsetY: event.clientY - rect.top,
      };
      dragSessionRef.current = session;
      setDragState(session);

      const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
        const prev = dragSessionRef.current;
        const listEl = listRef.current;
        if (!prev || !listEl) return;

        const dropIndex =
          findDeckDropIndex(moveEvent.clientY, listEl) ?? prev.dropIndex;
        const next: DeckDragState = {
          ...prev,
          ghostTop: moveEvent.clientY - prev.pointerOffsetY,
          dropIndex,
        };
        dragSessionRef.current = next;
        setDragState(next);
      };

      const onPointerEnd = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerEnd);
        window.removeEventListener('pointercancel', onPointerEnd);
        const state = dragSessionRef.current;
        if (state) finishDrag(state);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerEnd);
      window.addEventListener('pointercancel', onPointerEnd);
    },
    [deck, finishDrag, reorderMode],
  );

  const toggleReorderMode = () => {
    if (reorderMode) {
      exitReorderMode();
      return;
    }
    if (deck.length === 0) return;
    closeDetail();
    setReorderMode(true);
  };

  const handleDeckTabSelect = (index: number) => {
    if (reorderMode) return;
    if (!isDeckSlotUnlocked(index, unlockedDeckCount)) {
      setUnlockModalSlot(index);
      return;
    }
    if (index === activeDeckIndex) return;
    closeDetail();
    onSelectDeckIndex(index);
  };

  const selectedIsFauxLost =
    selectedCard != null && selectedCard.id === fauxLostCardId;

  const draggedCard =
    dragState != null ? deck.find((card) => card.id === dragState.cardId) : null;

  const deckPower = computeDeckPower(deck);

  return (
    <section className={`screen screen-deck${dragState ? ' screen-deck-dragging' : ''}`}>
      <div className="deck-slot-tabs" role="tablist" aria-label="デッキ">
        {Array.from({ length: DECK_SLOT_COUNT }, (_, index) => {
          const unlocked = isDeckSlotUnlocked(index, unlockedDeckCount);
          const isActive = index === activeDeckIndex;
          const slotDeck = decks[index] ?? [];
          const slotCount = slotDeck.length;
          const tabLabel = unlocked
            ? `デッキ${index + 1} ${slotCount}/${DECK_MAX}枚`
            : `デッキ${index + 1} 未解放`;
          return (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tabLabel}
              aria-disabled={reorderMode && !isActive ? true : undefined}
              className={`deck-slot-tab${isActive ? ' is-active' : ''}${!unlocked ? ' is-locked' : ''}${reorderMode && !isActive ? ' is-blocked' : ''}`}
              onClick={() => handleDeckTabSelect(index)}
            >
              <span className="deck-slot-tab-label">{index + 1}</span>
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
        <div className="deck-screen-header-row">
          <p className="deck-screen-deck-label">デッキ{activeDeckIndex + 1}</p>
          <p className="deck-screen-card-count" aria-label={`${deck.length}枚 / ${DECK_MAX}枚`}>
            {deck.length}/{DECK_MAX}枚
          </p>
        </div>
        <p className="deck-screen-power" aria-label={`戦力 ${deckPower}`}>
          戦力{' '}
          <span className="deck-screen-power-value">{deckPower}</span>
        </p>
        {fauxLostCardId && (
          <p className="muted deck-screen-notice">仮ロスト演出中（データは保存済み）</p>
        )}
      </div>

      <ul
        ref={listRef}
        className={`card-list${reorderMode ? ' card-list-reordering' : ''}${
          dragState ? ' card-list-dragging' : ''
        }`}
      >
        {Array.from({ length: DECK_MAX }, (_, index) => {
          const card = deck[index];
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
          const isDragSource = dragState?.fromIndex === index;
          const shift =
            dragState != null
              ? getDeckRowShift(index, dragState.fromIndex, dragState.dropIndex)
              : 0;

          return (
            <li
              key={card.id}
              data-deck-index={index}
              className={[
                'deck-card-row',
                `deck-card-row--${card.rarity}`,
                card.id === fauxLostCardId ? 'faux-lost' : '',
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
                  </button>
                  {reorderMode && (
                    <span
                      className="deck-card-drag-handle"
                      aria-label="ドラッグで並べ替え"
                      title="ドラッグで並べ替え"
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

      {deck.length > 0 && (
        <div className="deck-screen-footer">
          <button
            type="button"
            className={`deck-reorder-toggle${reorderMode ? ' active' : ''}`}
            onClick={toggleReorderMode}
            disabled={dragState != null}
          >
            {reorderMode ? '完了' : '並べ替え'}
          </button>
        </div>
      )}

      {dragState && draggedCard && (
        <div
          className={`deck-drag-ghost deck-card-row deck-card-row--${draggedCard.rarity}`}
          style={{
            ...deckRowStyle(getRarityMeta(draggedCard.rarity)),
            left: dragState.ghostLeft,
            top: dragState.ghostTop,
            width: dragState.ghostWidth,
            height: dragState.rowHeight,
          }}
          aria-hidden
        >
          <div className="deck-drag-ghost-inner deck-card-main">
            <DeckCardRowBody card={draggedCard} />
          </div>
          <span className="deck-card-drag-handle deck-drag-ghost-spacer" aria-hidden>
            ≡
          </span>
        </div>
      )}

      {selectedCard && (
        <DeckCardDetailOverlay
          card={selectedCard}
          isFauxLost={selectedIsFauxLost}
          onClose={closeDetail}
          onEdit={handleEditFromDetail}
          onDelete={() => handleDeleteRequest(selectedCard)}
          onRevive={
            selectedIsFauxLost && onReviveFauxLost
              ? handleReviveFromDetail
              : undefined
          }
        />
      )}

      {unlockModalSlot != null && (
        <DeckUnlockModal
          slotNumber={unlockModalSlot + 1}
          onClose={() => setUnlockModalSlot(null)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        title="カードを削除しますか？"
        message={
          pendingDelete
            ? `「${pendingDelete.name}」をデッキから削除します。戦績も失われます。`
            : ''
        }
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </section>
  );
}
