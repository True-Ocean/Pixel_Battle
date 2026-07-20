import { createPortal } from 'react-dom';
import { getRarityMeta } from '../config/rarity';
import type { Card } from '../types';
import { CardPreview } from './CardPreview';
import { useModalScrollLock } from './useModalScrollLock';

interface CardImportModalProps {
  cards: readonly Card[];
  onSelect: (card: Card) => void;
  onClose: () => void;
  title?: string;
  description?: string;
  titleId?: string;
}

export function CardImportModal({
  cards,
  onSelect,
  onClose,
  title = 'カードから読み込む',
  description = '読み込むカードを選んでください。読み込み後も自由に編集できます。',
  titleId = 'card-import-title',
}: CardImportModalProps) {
  useModalScrollLock(true);

  return createPortal(
    <div className="card-import-backdrop" onClick={onClose}>
      <div
        className="card-import-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="card-import-title">
          {title}
        </h2>
        <p className="card-import-description">{description}</p>
        {cards.length > 0 ? (
          <div className="card-import-list">
            {cards.map((card) => {
              const rarityMeta = getRarityMeta(card.rarity);
              return (
                <button
                  key={card.id}
                  type="button"
                  className="card-import-item"
                  style={{
                    borderColor: rarityMeta.rowBorder,
                    background: rarityMeta.rowBg,
                  }}
                  aria-label={`${card.name}を読み込む`}
                  onClick={() => onSelect(card)}
                >
                  <span className="card-import-preview" aria-hidden>
                    <CardPreview pixels={card.pixels} />
                  </span>
                  <span className="card-import-name">{card.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="card-import-empty">読み込めるカードがありません</p>
        )}
        <button type="button" className="card-import-close" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>,
    document.body,
  );
}
