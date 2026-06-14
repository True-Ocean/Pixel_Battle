import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { calcLostDeletePixels } from '../config/economy';
import { getAttributeMeta } from '../config/attributes';
import { getRarityMeta } from '../config/rarity';
import type { Card } from '../types';
import { CardPreview } from './CardPreview';
import { LimitBreakStars } from './LimitBreakStars';
import { RarityBadge } from './RarityBadge';

interface LostDeleteModalProps {
  card: Card;
  onCancel: () => void;
  onConfirmDelete: (card: Card) => void;
}

type Step = 'info' | 'confirm';

export function LostDeleteModal({
  card,
  onCancel,
  onConfirmDelete,
}: LostDeleteModalProps) {
  const [step, setStep] = useState<Step>('info');
  const deletePixels = calcLostDeletePixels(card);
  const rarityMeta = getRarityMeta(card.rarity);
  const attrMeta = getAttributeMeta(card.attribute);

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
    <div className="lost-delete-backdrop" onClick={onCancel}>
      <div
        className="lost-delete-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lost-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        {step === 'info' ? (
          <>
            <h2 id="lost-delete-title" className="lost-delete-title">
              ロストカードを削除
            </h2>
            <div className="lost-delete-card">
              <div className="lost-delete-card-preview">
                <CardPreview pixels={card.pixels} />
              </div>
              <div className="lost-delete-card-meta">
                <p className="lost-delete-card-name">{card.name}</p>
                <div className="lost-delete-card-badges">
                  <RarityBadge rarity={card.rarity} size="deck" />
                  <LimitBreakStars stars={card.stars} rarity={card.rarity} />
                </div>
                <p className="lost-delete-card-detail">
                  {attrMeta.label} / BP {card.bp}
                </p>
                <p className="lost-delete-card-reward">
                  削除すると <strong>+{deletePixels.toLocaleString()}px</strong>{' '}
                  獲得
                </p>
              </div>
            </div>
            <p className="lost-delete-note">
              削除するとカードデータは完全になくなります。スロットは空きになります。
            </p>
            <div className="lost-delete-actions">
              <button
                type="button"
                className="lost-delete-danger"
                onClick={() => setStep('confirm')}
              >
                削除する
              </button>
              <button type="button" className="lost-delete-cancel" onClick={onCancel}>
                キャンセル
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="lost-delete-title" className="lost-delete-title">
              本当に削除していいですか？
            </h2>
            <p className="lost-delete-confirm-lead">
              <strong>{card.name}</strong>（{rarityMeta.label}）を削除します。
              この操作は取り消せません。
            </p>
            <div className="lost-delete-actions">
              <button
                type="button"
                className="lost-delete-danger"
                onClick={() => onConfirmDelete(card)}
              >
                はい、削除する（+{deletePixels.toLocaleString()}px）
              </button>
              <button
                type="button"
                className="lost-delete-cancel"
                onClick={() => setStep('info')}
              >
                いいえ
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
