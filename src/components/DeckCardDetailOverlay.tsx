import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { canDowngradeRevive } from '../card';
import type { Card } from '../types';
import { PixelCoinIcon } from './PixelCoinIcon';
import { BattleCommonRules } from './BattleCommonRules';
import { DeckCardDetailCard } from './DeckCardDetailCard';

interface DeckCardDetailOverlayProps {
  card: Card;
  isLost: boolean;
  freePixels: number;
  reviveCost: number;
  downgradeReviveCost: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteLost: () => void;
  onReviveLost: () => void;
  onDowngradeReviveLost: () => void;
}

export function DeckCardDetailOverlay({
  card,
  isLost,
  freePixels,
  reviveCost,
  downgradeReviveCost,
  onClose,
  onEdit,
  onDelete,
  onDeleteLost,
  onReviveLost,
  onDowngradeReviveLost,
}: DeckCardDetailOverlayProps) {
  const canAffordRevive = freePixels >= reviveCost;
  const showDowngradeRevive = canDowngradeRevive(card);
  const canAffordDowngradeRevive = freePixels >= downgradeReviveCost;
  const reviveAriaLabel = canAffordRevive
    ? `完全復活 ${reviveCost.toLocaleString()}px`
    : `完全復活 ${reviveCost.toLocaleString()}px 必要・不足`;
  const downgradeReviveAriaLabel = canAffordDowngradeRevive
    ? `降格復活 ${downgradeReviveCost.toLocaleString()}px`
    : `降格復活 ${downgradeReviveCost.toLocaleString()}px 必要・不足`;

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
    <div className="deck-card-detail-backdrop" onClick={onClose}>
      <div
        className="deck-card-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-card-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="deck-card-detail-title" className="sr-only">
          {card.name}
        </h2>

        <div className="deck-card-detail-scroll">
          <DeckCardDetailCard card={card} isLost={isLost} />
          <BattleCommonRules />
        </div>

        <div
          className={`deck-card-detail-actions${
            isLost && showDowngradeRevive
              ? ' deck-card-detail-actions--lost-downgrade'
              : ''
          }`}
        >
          {isLost ? (
            <>
              <button
                type="button"
                className={`deck-card-detail-revive${
                  canAffordRevive ? '' : ' deck-card-detail-revive--pending'
                }`}
                disabled={!canAffordRevive}
                aria-label={reviveAriaLabel}
                onClick={onReviveLost}
              >
                <span className="deck-card-detail-revive-label">完全復活</span>
                <PixelCoinIcon className="deck-card-detail-revive-coin" />
                <span className="deck-card-detail-revive-cost">
                  {reviveCost.toLocaleString()}
                </span>
              </button>
              {showDowngradeRevive && (
                <button
                  type="button"
                  className={`deck-card-detail-downgrade-revive${
                    canAffordDowngradeRevive
                      ? ''
                      : ' deck-card-detail-downgrade-revive--pending'
                  }`}
                  disabled={!canAffordDowngradeRevive}
                  aria-label={downgradeReviveAriaLabel}
                  onClick={onDowngradeReviveLost}
                >
                  <span className="deck-card-detail-revive-label">降格復活</span>
                  <PixelCoinIcon className="deck-card-detail-revive-coin" />
                  <span className="deck-card-detail-revive-cost">
                    {downgradeReviveCost.toLocaleString()}
                  </span>
                </button>
              )}
              <button
                type="button"
                className="deck-card-detail-delete"
                onClick={onDeleteLost}
              >
                削除
              </button>
            </>
          ) : (
            <>
              <button type="button" className="deck-card-detail-edit" onClick={onEdit}>
                編集
              </button>
              <button type="button" className="deck-card-detail-delete" onClick={onDelete}>
                削除
              </button>
            </>
          )}
          <button type="button" className="deck-card-detail-close" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
