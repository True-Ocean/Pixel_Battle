import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { computeDeckPower } from '../card';
import { DECK_MAX } from '../config/balance';
import type { Card } from '../types';
import { getRarityMeta, type RarityMeta } from '../config/rarity';
import { AttributeBadge } from './AttributeBadge';
import { LimitBreakStars } from './LimitBreakStars';
import { RarityBadge } from './RarityBadge';
import { CardPreview } from './CardPreview';
import { ConfirmDialog } from './ConfirmDialog';
import {
  findDeckDropIndex,
  getDeckRowShift,
  reorderDeckItems,
} from './deckReorder';

interface DeckScreenProps {
  deck: Card[];
  fauxLostCardId: string | null;
  onCreateCard: () => void;
  onStartBattle: () => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
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
            <span className="deck-card-record muted">
              {card.wins}勝{card.losses}敗（復活：
              {card.reviveCount}）
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export function DeckScreen({
  deck,
  fauxLostCardId,
  onCreateCard,
  onStartBattle,
  onEditCard,
  onDeleteCard,
  onReorderDeck,
}: DeckScreenProps) {
  const [editMode, setEditMode] = useState(false);
  const [dragState, setDragState] = useState<DeckDragState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dragSessionRef = useRef<DeckDragState | null>(null);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
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

  const handleDeleteRequest = useCallback((card: Card) => {
    setPendingDelete(card);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!pendingDelete) return;
    onDeleteCard(pendingDelete.id);
    setPendingDelete(null);
    if (deck.length <= 1) {
      exitEditMode();
    }
  }, [deck.length, exitEditMode, onDeleteCard, pendingDelete]);

  const handleDeleteCancel = useCallback(() => {
    setPendingDelete(null);
  }, []);

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
      if (!editMode || event.button !== 0 || dragSessionRef.current) return;
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
    [deck, editMode, finishDrag],
  );

  const toggleEditMode = () => {
    if (editMode) {
      exitEditMode();
      return;
    }
    if (deck.length === 0) return;
    setEditMode(true);
  };

  const draggedCard =
    dragState != null ? deck.find((card) => card.id === dragState.cardId) : null;

  return (
    <section className={`screen screen-deck${dragState ? ' screen-deck-dragging' : ''}`}>
      <div className="deck-screen-header">
        <div>
          <h1>マイデッキ</h1>
          <p className="muted deck-screen-subtitle">
            最大5枚 · {deck.length} / 5
            {deck.length > 0 && <> · 戦力 {computeDeckPower(deck)}</>}
            {fauxLostCardId && (
              <> · 仮ロスト演出中（データは保存済み）</>
            )}
            {!editMode && deck.length > 0 && <> · タップで編集</>}
            {editMode && <> · 並べ替え・削除</>}
          </p>
        </div>
        {deck.length > 0 && (
          <button
            type="button"
            className={`deck-edit-toggle${editMode ? ' active' : ''}`}
            onClick={toggleEditMode}
            disabled={dragState != null}
          >
            {editMode ? '完了' : '編集'}
          </button>
        )}
      </div>

      <ul
        ref={listRef}
        className={`card-list${editMode ? ' card-list-editing' : ''}${
          dragState ? ' card-list-dragging' : ''
        }`}
      >
        {deck.length === 0 ? (
          <li className="empty">カードがありません</li>
        ) : (
          deck.map((card, index) => {
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
                  editMode ? 'deck-card-row-editing' : '',
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
                    <button
                      type="button"
                      className="deck-card-delete deck-drag-ghost-spacer"
                      tabIndex={-1}
                      aria-hidden
                      disabled
                    >
                      −
                    </button>
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
                    {editMode && (
                      <button
                        type="button"
                        className="deck-card-delete"
                        aria-label={`${card.name}を削除`}
                        onClick={() => handleDeleteRequest(card)}
                        disabled={dragState != null}
                      >
                        −
                      </button>
                    )}
                    <button
                      type="button"
                      className="deck-card-main"
                      disabled={editMode}
                      onClick={() => onEditCard(card)}
                    >
                      <DeckCardRowBody card={card} />
                    </button>
                    {editMode && (
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
          })
        )}
      </ul>

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
          <button
            type="button"
            className="deck-card-delete deck-drag-ghost-spacer"
            tabIndex={-1}
            aria-hidden
            disabled
          >
            −
          </button>
          <div className="deck-drag-ghost-inner deck-card-main">
            <DeckCardRowBody card={draggedCard} />
          </div>
          <span className="deck-card-drag-handle deck-drag-ghost-spacer" aria-hidden>
            ≡
          </span>
        </div>
      )}

      <div className="actions deck-actions">
        <button
          type="button"
          onClick={onCreateCard}
          disabled={editMode || deck.length >= 5}
        >
          新規カード作成
        </button>
        <button
          type="button"
          onClick={onStartBattle}
          disabled={editMode || deck.length < DECK_MAX}
        >
          バトル
        </button>
      </div>
      {!editMode && deck.length > 0 && deck.length < DECK_MAX && (
        <p className="muted">
          戦闘にはあと {DECK_MAX - deck.length} 枚必要です（合計 {DECK_MAX} 枚）
        </p>
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
