import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalScrollLock } from './useModalScrollLock';

interface LostCardDeckNoticeModalProps {
  onConfirm: (options: { suppressToday: boolean }) => void;
}

export function LostCardDeckNoticeModal({ onConfirm }: LostCardDeckNoticeModalProps) {
  const [suppressToday, setSuppressToday] = useState(false);

  useModalScrollLock(true);

  return createPortal(
    <div className="lost-card-deck-notice-backdrop">
      <div
        className="lost-card-deck-notice-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lost-card-deck-notice-message"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="lost-card-deck-notice-message" className="lost-card-deck-notice-message">
          このカードは通常のバトルには出せませんが、バトル履歴からの再戦は可能です。
        </p>
        <label className="lost-card-deck-notice-dismiss">
          <input
            type="checkbox"
            checked={suppressToday}
            onChange={(event) => setSuppressToday(event.target.checked)}
          />
          <span>了解しました（今日はこれ以降表示しない）</span>
        </label>
        <div className="lost-card-deck-notice-actions">
          <button
            type="button"
            className="lost-card-deck-notice-confirm"
            onClick={() => onConfirm({ suppressToday })}
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
