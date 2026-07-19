import { createPortal } from 'react-dom';
import { getRarityMeta } from '../config/rarity';
import type { Card } from '../types';
import { CardPreview } from './CardPreview';
import { useModalScrollLock } from './useModalScrollLock';

interface AvatarCardImportModalProps {
  cards: readonly Card[];
  onSelect: (card: Card) => void;
  onClose: () => void;
}

export function AvatarCardImportModal({
  cards,
  onSelect,
  onClose,
}: AvatarCardImportModalProps) {
  useModalScrollLock(true);

  return createPortal(
    <div className="avatar-card-import-backdrop" onClick={onClose}>
      <div
        className="avatar-card-import-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-card-import-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="avatar-card-import-title" className="avatar-card-import-title">
          カードから読み込む
        </h2>
        <p className="avatar-card-import-description">
          アバターの元にするカードを選んでください。読み込み後も自由に編集できます。
        </p>
        {cards.length > 0 ? (
          <div className="avatar-card-import-list">
            {cards.map((card) => {
              const rarityMeta = getRarityMeta(card.rarity);
              return (
                <button
                  key={card.id}
                  type="button"
                  className="avatar-card-import-item"
                  style={{
                    borderColor: rarityMeta.rowBorder,
                    background: rarityMeta.rowBg,
                  }}
                  aria-label={`${card.name}を読み込む`}
                  onClick={() => onSelect(card)}
                >
                  <span className="avatar-card-import-preview" aria-hidden>
                    <CardPreview pixels={card.pixels} />
                  </span>
                  <span className="avatar-card-import-name">{card.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="avatar-card-import-empty">
            読み込めるカードがありません
          </p>
        )}
        <button
          type="button"
          className="avatar-card-import-close"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>,
    document.body,
  );
}
