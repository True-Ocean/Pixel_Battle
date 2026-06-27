import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { EconomyBalanceChange } from './EconomyBalanceChange';

interface EditorSaveBpConfirmModalProps {
  cardName: string;
  previousBp: number;
  nextBp: number;
  previousFreePixels?: number;
  nextFreePixels?: number;
  previousJewels?: number;
  nextJewels?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatBpChangeMessage(delta: number): string {
  if (delta > 0) return 'BPが増加します。';
  if (delta < 0) return 'BPが減少します。';
  return 'BPに変化はありません。';
}

export function EditorSaveBpConfirmModal({
  cardName,
  previousBp,
  nextBp,
  previousFreePixels,
  nextFreePixels,
  previousJewels,
  nextJewels,
  onConfirm,
  onCancel,
}: EditorSaveBpConfirmModalProps) {
  const bpDelta = nextBp - previousBp;

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
    <div className="limit-break-success-backdrop" onClick={onCancel}>
      <div
        className="limit-break-success-panel editor-save-bp-confirm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-save-bp-confirm-message"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="limit-break-success-card-name">{cardName}</p>
        <p id="editor-save-bp-confirm-message" className="limit-break-success-message">
          {formatBpChangeMessage(bpDelta)}
        </p>
        <p className="limit-break-success-bp" aria-label={`BP ${previousBp}から${nextBp}へ`}>
          <span className="limit-break-success-bp-prev">{previousBp}</span>
          <span className="limit-break-success-bp-arrow" aria-hidden>
            →
          </span>
          <span className="limit-break-success-bp-next">{nextBp}</span>
          {bpDelta !== 0 && (
            <span
              className={
                bpDelta > 0
                  ? 'limit-break-success-bp-gain'
                  : 'editor-save-bp-delta-loss'
              }
            >
              ({bpDelta > 0 ? `+${bpDelta}` : bpDelta})
            </span>
          )}
        </p>
        {previousFreePixels != null && nextFreePixels != null && (
          <EconomyBalanceChange
            label="保有コイン"
            kind="px"
            previous={previousFreePixels}
            next={nextFreePixels}
          />
        )}
        {previousJewels != null && nextJewels != null && (
          <EconomyBalanceChange
            label="保有ジュエル"
            kind="jewel"
            previous={previousJewels}
            next={nextJewels}
          />
        )}
        <p className="editor-save-bp-confirm-question">よろしいですか？</p>
        <div className="editor-save-bp-confirm-actions">
          <button
            type="button"
            className="editor-save-bp-confirm-back"
            onClick={onCancel}
          >
            戻る
          </button>
          <button
            type="button"
            className="limit-break-success-close editor-save-bp-confirm-ok"
            onClick={onConfirm}
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
