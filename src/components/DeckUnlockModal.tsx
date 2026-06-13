import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DeckUnlockModalProps {
  slotNumber: number;
  onClose: () => void;
}

export function DeckUnlockModal({ slotNumber, onClose }: DeckUnlockModalProps) {
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
          デッキ{slotNumber} は未解放
        </h2>
        <p className="deck-unlock-message">
          ショップでの購入、または報酬での解放が必要です。
        </p>
        <p className="deck-unlock-note muted">準備中</p>
        <button type="button" className="deck-unlock-close" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>,
    document.body,
  );
}
