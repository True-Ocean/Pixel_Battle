import { createPortal } from 'react-dom';
import {
  describeLimitBreakResult,
  getLimitBreakOutcomeKind,
  getUpgradedRarity,
  planLimitBreakShardSpend,
  type LimitBreakShardSpendPlan,
} from '../card';
import { getLimitBreakRarityJewelCost, getLimitBreakShardsRequired } from '../config/economy';
import { getAttributeMeta } from '../config/attributes';
import { canAffordLimitBreak } from '../user/inventory';
import type { Card } from '../types';
import { AttributeBadge } from './AttributeBadge';
import { JewelAmount } from './JewelIcon';

interface LimitBreakModalProps {
  open: boolean;
  card: Card;
  attributeShardCount: number;
  jewels: number;
  onClose: () => void;
  onConfirm: (spend: LimitBreakShardSpendPlan) => void;
}

export function LimitBreakModal({
  open,
  card,
  attributeShardCount,
  jewels,
  onClose,
  onConfirm,
}: LimitBreakModalProps) {
  if (!open) return null;

  const limitBreakKind = getLimitBreakOutcomeKind(card);
  const rarityJewelCost =
    limitBreakKind === 'rarity' ? getLimitBreakRarityJewelCost(card.rarity) : null;
  const nextRarity =
    limitBreakKind === 'rarity' ? getUpgradedRarity(card.rarity) : null;
  const shardsRequired = getLimitBreakShardsRequired(card.rarity);
  const hasLimitBreakShards = canAffordLimitBreak(
    attributeShardCount,
    shardsRequired,
  );
  const canAffordJewels = rarityJewelCost == null || jewels >= rarityJewelCost;
  const attrMeta = getAttributeMeta(card.attribute);
  const spendPlan = planLimitBreakShardSpend(attributeShardCount, shardsRequired);
  const canConfirm = spendPlan != null && hasLimitBreakShards && canAffordJewels;

  const handleConfirm = () => {
    if (!spendPlan || !canConfirm) return;
    onConfirm(spendPlan);
    onClose();
  };

  return createPortal(
    <div
      className="limit-break-modal-backdrop"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className="limit-break-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-break-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="limit-break-modal-title" className="limit-break-modal-title">
          限界突破
        </h2>
        <p className="limit-break-modal-outcome">{describeLimitBreakResult(card)}</p>

        {!hasLimitBreakShards ? (
          <p className="limit-break-modal-insufficient" role="status">
            {attrMeta.label}のかけらが不足しています（必要: {shardsRequired}、所持:{' '}
            {attributeShardCount}）
          </p>
        ) : (
          <div className="deck-card-detail-limit-break-cost">
            <span
              className="deck-card-detail-limit-break-picker-name"
              aria-label={`${attrMeta.label}のかけら 所持 ${attributeShardCount}`}
            >
              <AttributeBadge attribute={card.attribute} size="deck" />
              <span>
                のかけら {shardsRequired}（所持 {attributeShardCount}）
              </span>
            </span>
          </div>
        )}

        {limitBreakKind === 'rarity' && rarityJewelCost != null && !canAffordJewels && (
          <p className="limit-break-modal-insufficient" role="status">
            ジュエルが不足しています（必要: {rarityJewelCost}、所持: {jewels}）
          </p>
        )}

        <div className="limit-break-modal-actions">
          <button type="button" className="limit-break-modal-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className={`limit-break-modal-confirm${
              !canConfirm ? ' limit-break-modal-confirm--pending' : ''
            }`}
            disabled={!canConfirm}
            aria-label={
              limitBreakKind === 'rarity' && nextRarity != null && rarityJewelCost != null
                ? `限界突破（${card.rarity}→${nextRarity}）ジュエル${rarityJewelCost}、${attrMeta.label}のかけら ${shardsRequired}`
                : `限界突破 ${attrMeta.label}のかけら ${shardsRequired}`
            }
            onClick={handleConfirm}
          >
            {limitBreakKind === 'rarity' && nextRarity != null && rarityJewelCost != null ? (
              <span className="deck-card-detail-limit-break-btn-content">
                <span>
                  限界突破（{card.rarity}→{nextRarity}）
                </span>
                <JewelAmount
                  amount={rarityJewelCost}
                  className="deck-card-detail-limit-break-jewel"
                  iconClassName="deck-card-detail-limit-break-jewel-icon"
                />
              </span>
            ) : (
              '限界突破'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
