import { useCallback, useState } from 'react';
import { DECK_MAX } from '../config/balance';
import type { Card } from '../types';
import { CardPreview } from './CardPreview';
import { ConfirmDialog } from './ConfirmDialog';

interface DeckScreenProps {
  deck: Card[];
  fauxLostCardId: string | null;
  onCreateCard: () => void;
  onStartBattle: () => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
  onReorderDeck: (deck: Card[]) => void;
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const moveCard = useCallback(
    (from: number, to: number) => {
      if (from === to || to < 0 || to >= deck.length) return;
      const next = [...deck];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onReorderDeck(next);
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

  const handleDragStart = (index: number) => {
    setDragIndex(index);
    setOverIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setOverIndex(index);
    moveCard(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const toggleEditMode = () => {
    if (editMode) {
      exitEditMode();
      return;
    }
    if (deck.length === 0) return;
    setEditMode(true);
  };

  return (
    <section className="screen screen-deck">
      <div className="deck-screen-header">
        <div>
          <h1>マイデッキ</h1>
          <p className="muted deck-screen-subtitle">
            最大5枚 · {deck.length} / 5
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
          >
            {editMode ? '完了' : '編集'}
          </button>
        )}
      </div>

      <ul className={`card-list${editMode ? ' card-list-editing' : ''}`}>
        {deck.length === 0 ? (
          <li className="empty">カードがありません</li>
        ) : (
          deck.map((card, index) => (
            <li
              key={card.id}
              className={[
                'deck-card-row',
                card.id === fauxLostCardId ? 'faux-lost' : '',
                editMode ? 'deck-card-row-editing' : '',
                dragIndex === index ? 'deck-card-row-dragging' : '',
                overIndex === index && dragIndex !== null && dragIndex !== index
                  ? 'deck-card-row-over'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              draggable={editMode}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={handleDragEnd}
            >
              {editMode && (
                <div className="deck-card-edit-controls">
                  <button
                    type="button"
                    className="deck-card-delete"
                    aria-label={`${card.name}を削除`}
                    onClick={() => handleDeleteRequest(card)}
                  >
                    −
                  </button>
                  <span
                    className="deck-card-drag-handle"
                    aria-hidden
                    title="ドラッグで並べ替え"
                  >
                    ≡
                  </span>
                </div>
              )}
              <button
                type="button"
                className="deck-card-main"
                disabled={editMode}
                onClick={() => onEditCard(card)}
              >
                <div className="deck-card-art">
                  <CardPreview pixels={card.pixels} />
                </div>
                <div className="deck-card-body">
                  <span className="deck-card-name">{card.name}</span>
                  <div className="deck-card-meta">
                    <span className="deck-card-hp">{card.hp}</span>
                    <span className="deck-card-attribute">
                      属性：
                      {card.attribute === 'attack' ? '攻撃' : '防御'}
                    </span>
                    <span className="deck-card-record muted">
                      {card.wins}勝 {card.losses}敗
                    </span>
                  </div>
                </div>
              </button>
              {editMode && (
                <div className="deck-card-move-buttons">
                  <button
                    type="button"
                    className="deck-card-move"
                    aria-label="上へ移動"
                    disabled={index === 0}
                    onClick={() => moveCard(index, index - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="deck-card-move"
                    aria-label="下へ移動"
                    disabled={index === deck.length - 1}
                    onClick={() => moveCard(index, index + 1)}
                  >
                    ↓
                  </button>
                </div>
              )}
            </li>
          ))
        )}
      </ul>

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
