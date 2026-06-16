import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface LimitBreakSuccessModalProps {
  cardName: string;
  previousBp: number;
  newBp: number;
  outcomeLine: string;
  onClose: () => void;
}

export function LimitBreakSuccessModal({
  cardName,
  previousBp,
  newBp,
  outcomeLine,
  onClose,
}: LimitBreakSuccessModalProps) {
  const bpGain = newBp - previousBp;

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
        className="limit-break-success-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-break-success-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="limit-break-success-title" className="limit-break-success-title">
          限界突破しました！
        </h2>
        <p className="limit-break-success-card-name">{cardName}</p>
        <p className="limit-break-success-message">BPがアップしました！</p>
        <p className="limit-break-success-bp" aria-label={`BP ${previousBp}から${newBp}へ`}>
          <span className="limit-break-success-bp-prev">{previousBp}</span>
          <span className="limit-break-success-bp-arrow" aria-hidden>
            →
          </span>
          <span className="limit-break-success-bp-next">{newBp}</span>
          {bpGain > 0 && (
            <span className="limit-break-success-bp-gain">(+{bpGain})</span>
          )}
        </p>
        <p className="limit-break-success-outcome">{outcomeLine}</p>
        <button type="button" className="limit-break-success-close" onClick={onClose}>
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
