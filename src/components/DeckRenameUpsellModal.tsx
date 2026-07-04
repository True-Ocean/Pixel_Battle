import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DeckRenameUpsellModalProps {
  onClose: () => void;
  onOpenShop: () => void;
}

export function DeckRenameUpsellModal({
  onClose,
  onOpenShop,
}: DeckRenameUpsellModalProps) {
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
    <div className="deck-rename-backdrop" onClick={onClose}>
      <div
        className="deck-rename-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-rename-upsell-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="deck-rename-upsell-title" className="deck-rename-title">
          デッキ名の変更
        </h2>
        <p className="deck-rename-message">
          デッキ名の変更は<strong>サブスク会員限定</strong>の特典です。
          ライトまたはプレミアムに加入すると、デッキタブに好きな名前を付けられます。
        </p>
        <div className="deck-rename-actions">
          <button type="button" className="deck-rename-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="deck-rename-save"
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
