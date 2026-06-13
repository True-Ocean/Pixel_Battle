import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getDeckDisplayName } from '../deckSlots';

interface DeckUnlockModalProps {
  slotIndex: number;
  unlockedDeckCount: number;
  deckNames?: string[];
  onClose: () => void;
  onPrototypeUnlock?: () => void;
}

export function DeckUnlockModal({
  slotIndex,
  unlockedDeckCount,
  deckNames,
  onClose,
  onPrototypeUnlock,
}: DeckUnlockModalProps) {
  const slotNumber = slotIndex + 1;
  const deckLabel = getDeckDisplayName(slotIndex, deckNames);
  const isDev = import.meta.env.DEV;
  const nextUnlockIndex = unlockedDeckCount;
  const canPrototypeUnlock =
    isDev &&
    onPrototypeUnlock != null &&
    slotIndex === nextUnlockIndex;

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
          {deckLabel} は未解放
        </h2>
        <p className="deck-unlock-message">
          ショップでの購入、または報酬での解放が必要です。
        </p>
        {isDev && !canPrototypeUnlock && slotIndex > nextUnlockIndex && (
          <p className="deck-unlock-note muted">
            プロトタイプでは {getDeckDisplayName(nextUnlockIndex, deckNames)}{' '}
            から順に解放できます。
          </p>
        )}
        <p className="deck-unlock-note muted">ショップ連携は準備中</p>
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
