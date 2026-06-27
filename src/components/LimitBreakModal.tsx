import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  defaultLimitBreakAttrSpend,
  describeLimitBreakResult,
  getLimitBreakAttrSpendRange,
  getLimitBreakOutcomeKind,
  getUpgradedRarity,
  isValidLimitBreakShardSpend,
  type LimitBreakShardSpendPlan,
} from '../card';
import { getLimitBreakRarityJewelCost, getLimitBreakShardsRequired } from '../config/economy';
import { getAttributeMeta } from '../config/attributes';
import { canAffordLimitBreak } from '../user/inventory';
import type { Card } from '../types';
import { AttributeBadge } from './AttributeBadge';
import { JewelAmount } from './JewelIcon';
import { UniversalShardIcon } from './UniversalShardIcon';

interface LimitBreakModalProps {
  open: boolean;
  card: Card;
  attributeShardCount: number;
  universalShardCount: number;
  jewels: number;
  onClose: () => void;
  onConfirm: (spend: LimitBreakShardSpendPlan) => void;
}

export function LimitBreakModal({
  open,
  card,
  attributeShardCount,
  universalShardCount,
  jewels,
  onClose,
  onConfirm,
}: LimitBreakModalProps) {
  const limitBreakKind = getLimitBreakOutcomeKind(card);
  const rarityJewelCost =
    limitBreakKind === 'rarity' ? getLimitBreakRarityJewelCost(card.rarity) : null;
  const nextRarity =
    limitBreakKind === 'rarity' ? getUpgradedRarity(card.rarity) : null;
  const shardsRequired = getLimitBreakShardsRequired(card.rarity);
  const hasLimitBreakShards = canAffordLimitBreak(
    attributeShardCount,
    universalShardCount,
    shardsRequired,
  );
  const canAffordJewels = rarityJewelCost == null || jewels >= rarityJewelCost;
  const attrMeta = getAttributeMeta(card.attribute);
  const attrSpendRange = getLimitBreakAttrSpendRange(
    attributeShardCount,
    universalShardCount,
    shardsRequired,
  );
  const [attrSpend, setAttrSpend] = useState(() =>
    defaultLimitBreakAttrSpend(
      attributeShardCount,
      universalShardCount,
      shardsRequired,
    ),
  );

  useEffect(() => {
    if (!open) return;
    setAttrSpend(
      defaultLimitBreakAttrSpend(
        attributeShardCount,
        universalShardCount,
        shardsRequired,
      ),
    );
  }, [
    open,
    card.id,
    card.rarity,
    attributeShardCount,
    universalShardCount,
    shardsRequired,
  ]);

  if (!open) return null;

  const universalSpend = shardsRequired - attrSpend;
  const spendPlan: LimitBreakShardSpendPlan = { attrSpend, universalSpend };
  const spendIsValid = isValidLimitBreakShardSpend(
    spendPlan,
    attributeShardCount,
    universalShardCount,
    shardsRequired,
  );
  const attributeShardsUnavailable =
    attributeShardCount === 0 && universalShardCount >= shardsRequired;
  const canConfirm = hasLimitBreakShards && spendIsValid && canAffordJewels;

  const adjustAttrSpend = (delta: number) => {
    if (!attrSpendRange) return;
    setAttrSpend((current) =>
      Math.min(attrSpendRange.max, Math.max(attrSpendRange.min, current + delta)),
    );
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(spendPlan);
    onClose();
  };

  return createPortal(
    <div className="limit-break-modal-backdrop" onClick={onClose}>
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
            かけらが不足しています（必要: {shardsRequired}、所持:{' '}
            {attributeShardCount + universalShardCount}）
          </p>
        ) : (
          attrSpendRange && (
            <div className="deck-card-detail-limit-break-picker deck-card-detail-limit-break-picker--split">
              <div
                className={`deck-card-detail-limit-break-picker-col${
                  attributeShardsUnavailable
                    ? ' deck-card-detail-limit-break-picker-col--unavailable'
                    : ''
                }`}
              >
                <span
                  className="deck-card-detail-limit-break-picker-name"
                  aria-label={`${attrMeta.label}のかけら 所持 ${attributeShardCount}`}
                >
                  <AttributeBadge attribute={card.attribute} size="deck" />
                  <span>のかけら（{attributeShardCount}）</span>
                </span>
                <div className="deck-card-detail-limit-break-stepper">
                  <button
                    type="button"
                    className="deck-card-detail-limit-break-step"
                    aria-label={`${attrMeta.label}のかけらを減らす`}
                    disabled={attrSpend <= attrSpendRange.min}
                    onClick={() => adjustAttrSpend(-1)}
                  >
                    −
                  </button>
                  <span
                    className="deck-card-detail-limit-break-step-value"
                    aria-label={`${attrMeta.label}のかけら ${attrSpend}個使用`}
                  >
                    {attrSpend}
                  </span>
                  <button
                    type="button"
                    className="deck-card-detail-limit-break-step"
                    aria-label={`${attrMeta.label}のかけらを増やす`}
                    disabled={attrSpend >= attrSpendRange.max}
                    onClick={() => adjustAttrSpend(1)}
                  >
                    ＋
                  </button>
                </div>
              </div>
              <div
                className={`deck-card-detail-limit-break-picker-col${
                  universalShardCount === 0
                    ? ' deck-card-detail-limit-break-picker-col--unavailable'
                    : ''
                }`}
              >
                <span
                  className="deck-card-detail-limit-break-picker-name"
                  aria-label={`汎用のかけら 所持 ${universalShardCount}`}
                >
                  <UniversalShardIcon className="deck-card-detail-limit-break-universal-icon" />
                  <span>のかけら（{universalShardCount}）</span>
                </span>
                <div className="deck-card-detail-limit-break-stepper">
                  <button
                    type="button"
                    className="deck-card-detail-limit-break-step"
                    aria-label="汎用のかけらを減らす"
                    disabled={universalSpend <= shardsRequired - attrSpendRange.max}
                    onClick={() => adjustAttrSpend(1)}
                  >
                    −
                  </button>
                  <span
                    className="deck-card-detail-limit-break-step-value"
                    aria-label={`汎用のかけら ${universalSpend}個使用`}
                  >
                    {universalSpend}
                  </span>
                  <button
                    type="button"
                    className="deck-card-detail-limit-break-step"
                    aria-label="汎用のかけらを増やす"
                    disabled={universalSpend >= shardsRequired - attrSpendRange.min}
                    onClick={() => adjustAttrSpend(-1)}
                  >
                    ＋
                  </button>
                </div>
              </div>
            </div>
          )
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
                ? `限界突破（${card.rarity}→${nextRarity}）ジュエル${rarityJewelCost}、${attrMeta.label}のかけら ${attrSpend}、汎用 ${universalSpend}`
                : `限界突破 ${attrMeta.label}のかけら ${attrSpend}、汎用 ${universalSpend}`
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
