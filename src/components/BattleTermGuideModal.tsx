import { createPortal } from 'react-dom';
import { BATTLE_GUIDE_TERMS, type BattleGuideTermId } from '../config/battleGuideCommon';
import { useModalScrollLock } from './useModalScrollLock';

interface BattleTermGuideModalProps {
  termId: BattleGuideTermId;
  onClose: () => void;
}

export function BattleTermGuideModal({ termId, onClose }: BattleTermGuideModalProps) {
  const term = BATTLE_GUIDE_TERMS[termId];
  useModalScrollLock(true);

  const titleId = `battle-term-guide-title-${termId}`;

  return createPortal(
    <div className="battle-term-guide-backdrop" onClick={onClose}>
      <div
        className={[
          'battle-term-guide-panel',
          term.compact ? 'battle-term-guide-panel--compact' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId} className="battle-term-guide-title">
          {term.title}
        </h3>
        <ul className="battle-term-guide-list">
          {term.items.map((item, index) => (
            <li key={index} className="battle-term-guide-item">
              {item}
            </li>
          ))}
        </ul>
        <div className="battle-term-guide-actions">
          <button type="button" className="battle-term-guide-close" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
