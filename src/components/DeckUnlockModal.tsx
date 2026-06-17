import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  canAffordDeckUnlock,
  JEWEL_COST_DECK_UNLOCK,
} from '../config/economy';
import { getDeckUnlockModalContent, getDefaultDeckSlotLabel } from '../deckSlots';
import { JewelAmount, JewelIcon } from './JewelIcon';

interface DeckUnlockModalProps {
  slotIndex: number;
  unlockedDeckCount: number;
  userLevel: number;
  jewels: number;
  onClose: () => void;
  onUnlock?: (slotIndex: number) => string | null;
}

export function DeckUnlockModal({
  slotIndex,
  unlockedDeckCount,
  userLevel,
  jewels,
  onClose,
  onUnlock,
}: DeckUnlockModalProps) {
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const content = getDeckUnlockModalContent(
    slotIndex,
    unlockedDeckCount,
    userLevel,
  );
  const canAfford = canAffordDeckUnlock({ jewels });
  const readyToUnlock = content.canUnlockWithJewels;
  const showUnlockButton = readyToUnlock && onUnlock != null;
  const deckLabel = getDefaultDeckSlotLabel(slotIndex);
  const unlockButtonLabel = `${deckLabel}を解放する`;

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

  const handleUnlock = () => {
    if (!showUnlockButton || !canAfford) return;
    const error = onUnlock(slotIndex);
    if (error) {
      setUnlockError(error);
    }
  };

  return createPortal(
    <div className="deck-unlock-backdrop" onClick={onClose}>
      <div
        className={`deck-unlock-panel${readyToUnlock ? ' deck-unlock-panel--ready' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-unlock-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="deck-unlock-title" className="deck-unlock-title">
          {readyToUnlock ? 'デッキ解放' : content.title}
        </h2>
        {!readyToUnlock && content.message && (
          <p className="deck-unlock-message">{content.message}</p>
        )}
        {!readyToUnlock && content.note && (
          <p className="deck-unlock-note muted">{content.note}</p>
        )}
        {showUnlockButton && !canAfford && (
          <p
            className="deck-unlock-message deck-unlock-insufficient"
            aria-label="解放に必要なジュエルが不足しています。"
          >
            解放に必要な
            <JewelIcon className="deck-unlock-insufficient-jewel-icon" />
            が不足しています。
          </p>
        )}
        {unlockError && (
          <p className="deck-unlock-error" role="alert">
            {unlockError}
          </p>
        )}
        {showUnlockButton && (
          <button
            type="button"
            className="deck-unlock-confirm-btn"
            disabled={!canAfford}
            aria-label={`${unlockButtonLabel}、ジュエル ${JEWEL_COST_DECK_UNLOCK.toLocaleString()}`}
            onClick={handleUnlock}
          >
            <span>{unlockButtonLabel}</span>
            <JewelAmount
              amount={JEWEL_COST_DECK_UNLOCK}
              className="deck-unlock-confirm-jewel"
              iconClassName="deck-unlock-confirm-jewel-icon"
            />
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
