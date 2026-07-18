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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const content = getDeckUnlockModalContent(
    slotIndex,
    unlockedDeckCount,
    userLevel,
  );
  const canAfford = canAffordDeckUnlock({ jewels });
  const readyToUnlock = content.canUnlockWithJewels;
  const showUnlockButton = readyToUnlock && onUnlock != null;
  const deckLabel = getDefaultDeckSlotLabel(slotIndex);
  const unlockButtonLabel = 'デッキ解放';
  const readyTitle = `${deckLabel}解放`;

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

  const handleRequestUnlock = () => {
    if (!showUnlockButton || !canAfford) return;
    setUnlockError(null);
    setConfirmOpen(true);
  };

  const handleConfirmUnlock = () => {
    if (!showUnlockButton || !canAfford) return;
    const error = onUnlock(slotIndex);
    if (error) {
      setConfirmOpen(false);
      setUnlockError(error);
      return;
    }
    setConfirmOpen(false);
  };

  const handleCancelConfirm = () => {
    setConfirmOpen(false);
    onClose();
  };

  return (
    <>
      {createPortal(
        <div className="deck-unlock-backdrop" onClick={onClose}>
          <div
            className={`deck-unlock-panel${readyToUnlock ? ' deck-unlock-panel--ready' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="deck-unlock-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="deck-unlock-title" className="deck-unlock-title">
              {readyToUnlock ? readyTitle : content.title}
            </h2>
            {content.jewelUnlockMessage && (
              <p
                className="deck-unlock-message"
                aria-label={`${content.jewelUnlockMessage.prefix}ジュエル ${JEWEL_COST_DECK_UNLOCK.toLocaleString()}${content.jewelUnlockMessage.suffix}`}
              >
                {content.jewelUnlockMessage.prefix}
                <JewelAmount
                  amount={JEWEL_COST_DECK_UNLOCK}
                  className="deck-unlock-jewel-cost"
                  iconClassName="deck-unlock-jewel-icon"
                />
                {content.jewelUnlockMessage.suffix}
              </p>
            )}
            {!content.jewelUnlockMessage && !readyToUnlock && content.message && (
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
            {showUnlockButton ? (
              <div className="deck-unlock-actions">
                <button
                  type="button"
                  className="deck-unlock-confirm-btn"
                  disabled={!canAfford}
                  aria-label={`${unlockButtonLabel}、ジュエル ${JEWEL_COST_DECK_UNLOCK.toLocaleString()}`}
                  onClick={handleRequestUnlock}
                >
                  <span className="deck-unlock-confirm-label">
                    {unlockButtonLabel}
                  </span>
                  <JewelAmount
                    amount={JEWEL_COST_DECK_UNLOCK}
                    className="deck-unlock-confirm-jewel"
                    iconClassName="deck-unlock-confirm-jewel-icon"
                  />
                </button>
                <button
                  type="button"
                  className="deck-unlock-close"
                  onClick={onClose}
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="deck-unlock-close"
                onClick={onClose}
              >
                閉じる
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}

      {confirmOpen &&
        createPortal(
          <div
            className="confirm-dialog-backdrop"
            onClick={handleCancelConfirm}
          >
            <div
              className="confirm-dialog deck-unlock-confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="deck-unlock-confirm-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2
                id="deck-unlock-confirm-title"
                className="confirm-dialog-title"
              >
                {readyTitle}
              </h2>
              <p
                className="confirm-dialog-message"
                aria-label={`ジュエル ${JEWEL_COST_DECK_UNLOCK.toLocaleString()}を使ってデッキを解放します。よろしいですか？`}
              >
                <JewelAmount
                  amount={JEWEL_COST_DECK_UNLOCK}
                  className="confirm-dialog-jewel-amount"
                  iconClassName="confirm-dialog-jewel-icon"
                />
                を使ってデッキを解放します。
                <br />
                よろしいですか？
              </p>
              <div className="confirm-dialog-actions">
                <button
                  type="button"
                  className="confirm-dialog-confirm confirm-dialog-confirm-primary"
                  onClick={handleConfirmUnlock}
                >
                  解放する
                </button>
                <button
                  type="button"
                  className="confirm-dialog-cancel"
                  onClick={handleCancelConfirm}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
