import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Card } from '../types';
import { BattleCommonRules } from './BattleCommonRules';
import { DeckCardDetailCard } from './DeckCardDetailCard';

interface DeckCardDetailOverlayProps {
  card: Card;
  isLost: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteLost: () => void;
}

export function DeckCardDetailOverlay({
  card,
  isLost,
  onClose,
  onEdit,
  onDelete,
  onDeleteLost,
}: DeckCardDetailOverlayProps) {
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
    <div className="deck-card-detail-backdrop" onClick={onClose}>
      <div
        className="deck-card-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-card-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="deck-card-detail-title" className="sr-only">
          {card.name}
        </h2>

        <div className="deck-card-detail-scroll">
          <DeckCardDetailCard card={card} isLost={isLost} />
          <BattleCommonRules />
        </div>

        <div className="deck-card-detail-actions">
          {isLost ? (
            <>
              <button
                type="button"
                className="deck-card-detail-revive deck-card-detail-revive--pending"
                disabled
              >
                完全復活（準備中）
              </button>
              <button
                type="button"
                className="deck-card-detail-delete"
                onClick={onDeleteLost}
              >
                削除
              </button>
            </>
          ) : (
            <>
              <button type="button" className="deck-card-detail-edit" onClick={onEdit}>
                編集
              </button>
              <button type="button" className="deck-card-detail-delete" onClick={onDelete}>
                削除
              </button>
            </>
          )}
          <button type="button" className="deck-card-detail-close" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
