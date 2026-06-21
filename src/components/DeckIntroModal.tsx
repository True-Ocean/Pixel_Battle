import { createPortal } from 'react-dom';
import { DECK_MAX } from '../config/balance';
import { useModalScrollLock } from './useModalScrollLock';

interface DeckIntroModalProps {
  onClose: () => void;
}

export function DeckIntroModal({ onClose }: DeckIntroModalProps) {
  useModalScrollLock(true);

  return createPortal(
    <div className="help-panel-backdrop" onClick={onClose}>
      <div
        className="help-panel deck-intro-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-intro-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="deck-intro-title" className="help-panel-title">
          マイデッキへようこそ
        </h2>
        <ul className="help-panel-list deck-intro-list">
          <li>
            バトルには <strong>カード {DECK_MAX} 枚</strong> が必要です。
          </li>
          <li>
            空きスロットの <strong>「新規作成」</strong>{' '}
            から、好きな絵と名前でカードを作れます。
          </li>
          <li>
            {DECK_MAX} 枚揃ったら、下の <strong>バトル</strong>{' '}
            タブから CPU 戦を始められます。
          </li>
          <li>
            ミッションタブには、はじめての手順もあります。
          </li>
        </ul>
        <div className="help-panel-actions">
          <button type="button" className="help-panel-close help-panel-close-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
