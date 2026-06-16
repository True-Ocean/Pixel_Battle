import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { JEWEL_COST_DECK_UNLOCK } from '../config/economy';
import { getDeckDisplayName } from '../deckSlots';
import { JewelAmount } from './JewelIcon';

interface DeckUnlockModalProps {
  slotIndex: number;
  unlockedDeckCount: number;
  userLevel: number;
  deckNames?: string[];
  onClose: () => void;
  onPrototypeUnlock?: () => void;
}

export function DeckUnlockModal({
  slotIndex,
  unlockedDeckCount,
  userLevel,
  deckNames,
  onClose,
  onPrototypeUnlock,
}: DeckUnlockModalProps) {
  const deckLabel = getDeckDisplayName(slotIndex, deckNames);
  const isDev = import.meta.env.DEV;
  const nextUnlockIndex = unlockedDeckCount;
  const canPrototypeUnlock =
    isDev &&
    onPrototypeUnlock != null &&
    slotIndex === nextUnlockIndex;

  let message: ReactNode;
  let note: ReactNode;

  if (slotIndex === 1) {
    if (userLevel >= 10) {
      message = `${deckLabel} はレベル10到達で自動解放されます。`;
    } else {
      message = `${deckLabel} はユーザーレベル10到達で解放されます。`;
      note = `現在 Lv.${userLevel} です。`;
    }
  } else if (userLevel < 10) {
    message = `${deckLabel} はレベル10到達後に解放できます。`;
    note = (
      <>
        解放には{' '}
        <JewelAmount
          amount={JEWEL_COST_DECK_UNLOCK}
          className="deck-unlock-jewel-cost"
          iconClassName="deck-unlock-jewel-icon"
        />{' '}
        が必要です（準備中）。
      </>
    );
  } else {
    message = (
      <>
        {deckLabel} は{' '}
        <JewelAmount
          amount={JEWEL_COST_DECK_UNLOCK}
          className="deck-unlock-jewel-cost"
          iconClassName="deck-unlock-jewel-icon"
        />{' '}
        で解放できます。
      </>
    );
    note = 'ショップ連携は準備中です。';
  }

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
        <p className="deck-unlock-message">{message}</p>
        {note && <p className="deck-unlock-note muted">{note}</p>}
        {isDev && !canPrototypeUnlock && slotIndex > nextUnlockIndex && (
          <p className="deck-unlock-note muted">
            プロトタイプでは {getDeckDisplayName(nextUnlockIndex, deckNames)}{' '}
            から順に解放できます。
          </p>
        )}
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
