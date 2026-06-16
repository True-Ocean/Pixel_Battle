import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface MockRewardAdModalProps {
  title?: string;
  message?: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function MockRewardAdModal({
  title = 'リワード広告',
  message = '広告視聴後に再戦できます（モック）',
  onComplete,
  onCancel,
}: MockRewardAdModalProps) {
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
    <div className="mock-ad-backdrop" onClick={onCancel}>
      <div
        className="mock-ad-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-ad-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="mock-ad-title" className="mock-ad-title">
          {title}
        </h2>
        <p className="mock-ad-message muted">{message}</p>
        <div className="mock-ad-placeholder" aria-hidden>
          <span className="mock-ad-placeholder-label">広告枠（モック）</span>
        </div>
        <div className="mock-ad-actions">
          <button type="button" className="mock-ad-watch-btn" onClick={onComplete}>
            視聴完了
          </button>
          <button type="button" className="mock-ad-cancel-btn" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
