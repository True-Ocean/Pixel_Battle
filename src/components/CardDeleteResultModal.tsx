import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CardDeleteOutcome } from '../config/economy';
import { EconomyBalanceChange } from './EconomyBalanceChange';
import { ShardBalanceChange } from './ShardBalanceChange';

interface CardDeleteResultModalProps {
  outcome: CardDeleteOutcome;
  onClose: () => void;
}

export function CardDeleteResultModal({
  outcome,
  onClose,
}: CardDeleteResultModalProps) {
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
    <div className="limit-break-success-backdrop" onClick={onClose}>
      <div
        className="limit-break-success-panel card-delete-result-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-delete-result-message"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="limit-break-success-card-name">{outcome.cardName}</p>
        <p id="card-delete-result-message" className="limit-break-success-message">
          削除されました
        </p>
        <div className="card-delete-result-changes">
          <EconomyBalanceChange
            label="保有コイン"
            kind="px"
            previous={outcome.previousFreePixels}
            next={outcome.nextFreePixels}
          />
          <EconomyBalanceChange
            label="保有ジュエル"
            kind="jewel"
            previous={outcome.previousJewels}
            next={outcome.nextJewels}
          />
          <ShardBalanceChange
            attribute={outcome.attribute}
            previous={outcome.previousAttributeShards}
            next={outcome.nextAttributeShards}
          />
        </div>
        <button type="button" className="limit-break-success-close" onClick={onClose}>
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
