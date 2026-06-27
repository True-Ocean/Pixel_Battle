import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CardNoteIcon } from './CardNoteIcon';

interface CardNotePremiumUpsellModalProps {
  onClose: () => void;
  onOpenShop: () => void;
}

export function CardNotePremiumUpsellModal({
  onClose,
  onOpenShop,
}: CardNotePremiumUpsellModalProps) {
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
    <div className="card-note-backdrop" onClick={onClose}>
      <div
        className="card-note-panel card-note-panel--upsell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-note-upsell-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-note-upsell-header">
          <CardNoteIcon className="card-note-upsell-icon" filled />
          <h2 id="card-note-upsell-title" className="card-note-title">
            カードノート
          </h2>
        </div>
        <p className="card-note-message">
          カードノートの<strong>編集</strong>はプレミアムプラン会員限定です。
          プレミアムに加入すると、カードにメモを残せます。
        </p>
        <p className="card-note-hint muted">
          以前保存したノートは、プレミアム期限切れ後も引き続き閲覧できます。
        </p>
        <div className="card-note-actions">
          <button type="button" className="card-note-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="card-note-save"
            onClick={() => {
              onOpenShop();
              onClose();
            }}
          >
            ショップで見る
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
