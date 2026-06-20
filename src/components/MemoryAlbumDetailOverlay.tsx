import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { JEWEL_COST_DELETE } from '../config/economy';
import type { Card } from '../types';
import { BattleCommonRules } from './BattleCommonRules';
import { DeckCardDetailCard } from './DeckCardDetailCard';
import { JewelAmount } from './JewelIcon';

interface MemoryAlbumDetailOverlayProps {
  card: Card;
  jewels: number;
  onClose: () => void;
  onDelete: () => void;
}

export function MemoryAlbumDetailOverlay({
  card,
  jewels,
  onClose,
  onDelete,
}: MemoryAlbumDetailOverlayProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const canAffordDelete = jewels >= JEWEL_COST_DELETE;

  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';
    style.overflow = 'hidden';

    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return createPortal(
    <div className="deck-card-detail-backdrop deck-card-detail-backdrop--stacked" onClick={onClose}>
      <div
        className="deck-card-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-album-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="memory-album-detail-title" className="sr-only">
          {card.name}
        </h2>

        <div className="deck-card-detail-scroll">
          <DeckCardDetailCard card={card} isLost={false} />
          <BattleCommonRules />
        </div>

        <div className="deck-card-detail-actions deck-card-detail-actions--album">
          <button
            type="button"
            className={`deck-card-detail-delete${
              canAffordDelete ? '' : ' deck-card-detail-delete--pending'
            }`}
            disabled={!canAffordDelete}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <span className="deck-card-detail-delete-label">思い出アルバムから削除</span>
            <JewelAmount
              amount={JEWEL_COST_DELETE}
              className="deck-card-detail-delete-jewel"
              iconClassName="deck-card-detail-delete-jewel-icon"
            />
          </button>
          <button type="button" className="deck-card-detail-close" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>

      {confirmDeleteOpen && (
        <div
          className="confirm-dialog-backdrop confirm-dialog-backdrop--stacked"
          onClick={() => setConfirmDeleteOpen(false)}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="confirm-dialog-title">思い出アルバムから削除しますか？</h2>
            <p className="confirm-dialog-message">
              「{card.name}」を思い出アルバムから削除します。px と属性かけらが返還されます。
            </p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="confirm-dialog-cancel"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="confirm-dialog-confirm"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  onDelete();
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
