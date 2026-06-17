import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { JEWEL_COST_DECK_UNLOCK } from '../config/economy';
import { getDeckUnlockModalContent } from '../deckSlots';
import { JewelAmount } from './JewelIcon';

interface DeckUnlockModalProps {
  slotIndex: number;
  unlockedDeckCount: number;
  userLevel: number;
  onClose: () => void;
  onPrototypeUnlock?: () => void;
}

export function DeckUnlockModal({
  slotIndex,
  unlockedDeckCount,
  userLevel,
  onClose,
  onPrototypeUnlock,
}: DeckUnlockModalProps) {
  const isDev = import.meta.env.DEV;
  const content = getDeckUnlockModalContent(
    slotIndex,
    unlockedDeckCount,
    userLevel,
  );
  const canPrototypeUnlock =
    isDev &&
    onPrototypeUnlock != null &&
    content.allowPrototypeUnlock &&
    slotIndex === unlockedDeckCount;

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
    <div className="deck-unlock-backdrop" onClick={onClose}>
      <div
        className="deck-unlock-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-unlock-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="deck-unlock-title" className="deck-unlock-title">
          {content.title}
        </h2>
        <p className="deck-unlock-message">{content.message}</p>
        {content.showJewelCost && (
          <p className="deck-unlock-jewel-row">
            必要:{' '}
            <JewelAmount
              amount={JEWEL_COST_DECK_UNLOCK}
              className="deck-unlock-jewel-cost"
              iconClassName="deck-unlock-jewel-icon"
            />
          </p>
        )}
        {content.note && <p className="deck-unlock-note muted">{content.note}</p>}
        {canPrototypeUnlock && (
          <button
            type="button"
            className="deck-unlock-prototype-btn"
            onClick={onPrototypeUnlock}
          >
            プロトタイプで解放
          </button>
        )}
        <button type="button" className="deck-unlock-close" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>,
    document.body,
  );
}
