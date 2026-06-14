import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { isCardLost } from '../card';
import type { Card } from '../types';
import { BattleCommonRules } from './BattleCommonRules';
import { DeckCardDetailCard } from './DeckCardDetailCard';

interface BattleHubCardDetailOverlayProps {
  card: Card;
  onClose: () => void;
  onGoToMyDeck: () => void;
}

export function BattleHubCardDetailOverlay({
  card,
  onClose,
  onGoToMyDeck,
}: BattleHubCardDetailOverlayProps) {
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
        aria-labelledby="battle-hub-card-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="battle-hub-card-detail-title" className="sr-only">
          {card.name}
        </h2>

        <div className="deck-card-detail-scroll">
          <DeckCardDetailCard card={card} isLost={isCardLost(card)} />
          <BattleCommonRules />
        </div>

        <div className="deck-card-detail-actions deck-card-detail-actions--battle-hub">
          <button
            type="button"
            className="deck-card-detail-edit"
            onClick={onGoToMyDeck}
          >
            マイデッキで開く
          </button>
          <button type="button" className="deck-card-detail-close" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
