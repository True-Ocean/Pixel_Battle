import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CardNoteIcon } from './CardNoteIcon';

export type EditorPremiumUpsellFeature = 'cardNote' | 'cardImport';

interface CardNotePremiumUpsellModalProps {
  feature?: EditorPremiumUpsellFeature;
  onClose: () => void;
  onOpenShop: () => void;
}

const UPSELL_COPY: Record<
  EditorPremiumUpsellFeature,
  { title: string; message: string; hint?: string }
> = {
  cardNote: {
    title: 'カードノート',
    message:
      'カードノートの編集はプレミアムプラン限定です。プレミアムプランに加入すると、カードにノートを記録できます。',
    hint: '一度記録したノートは、プレミアムプラン期限切れ後も引き続き閲覧できます。',
  },
  cardImport: {
    title: 'カードから読込',
    message:
      '他のカードからイメージを読み込む機能はプレミアムプラン限定です。プレミアムプランに加入すると、既存カードの絵を編集の土台として使えます。',
  },
};

export function CardNotePremiumUpsellModal({
  feature = 'cardNote',
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

  const copy = UPSELL_COPY[feature];
  const titleId =
    feature === 'cardImport'
      ? 'card-import-upsell-title'
      : 'card-note-upsell-title';

  return createPortal(
    <div
      className="card-note-backdrop"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className="card-note-panel card-note-panel--upsell"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-note-upsell-header">
          {feature === 'cardNote' ? (
            <CardNoteIcon className="card-note-upsell-icon" filled />
          ) : null}
          <h2 id={titleId} className="card-note-title">
            {copy.title}
          </h2>
        </div>
        <p className="card-note-message">{copy.message}</p>
        {copy.hint ? (
          <p className="card-note-hint muted">{copy.hint}</p>
        ) : null}
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
