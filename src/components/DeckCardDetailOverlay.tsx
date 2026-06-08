import type { Card } from '../types';
import { DeckCardDetailCard } from './DeckCardDetailCard';

interface DeckCardDetailOverlayProps {
  card: Card;
  isFauxLost: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRevive?: () => void;
}

export function DeckCardDetailOverlay({
  card,
  isFauxLost,
  onClose,
  onEdit,
  onDelete,
  onRevive,
}: DeckCardDetailOverlayProps) {
  return (
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

        <DeckCardDetailCard card={card} isFauxLost={isFauxLost} />

        <div className="deck-card-detail-actions">
          {isFauxLost && onRevive ? (
            <button type="button" className="deck-card-detail-revive" onClick={onRevive}>
              復活
            </button>
          ) : (
            <button type="button" className="deck-card-detail-edit" onClick={onEdit}>
              編集
            </button>
          )}
          <button type="button" className="deck-card-detail-delete" onClick={onDelete}>
            削除
          </button>
          <button type="button" className="deck-card-detail-close" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
