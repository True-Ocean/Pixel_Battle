import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  canDowngradeRevive,
  canLimitBreakCard,
  defaultLimitBreakAttrSpend,
  getLimitBreakOutcomeKind,
  getLimitBreakAttrSpendRange,
  getUpgradedRarity,
  isLimitBreakCapReached,
  isValidLimitBreakShardSpend,
  type LimitBreakShardSpendPlan,
} from '../card';
import { getLimitBreakRarityJewelCost, JEWEL_COST_DELETE, LIMIT_BREAK_SHARDS_REQUIRED } from '../config/economy';
import { getAttributeMeta } from '../config/attributes';
import { canAffordLimitBreak } from '../user/inventory';
import type { Card } from '../types';
import { AttributeBadge } from './AttributeBadge';
import { PixelCoinIcon } from './PixelCoinIcon';
import { JewelAmount } from './JewelIcon';
import { BattleCommonRules } from './BattleCommonRules';
import { DeckCardDetailCard } from './DeckCardDetailCard';
import { UniversalShardIcon } from './UniversalShardIcon';

interface DeckCardDetailOverlayProps {
  card: Card;
  isLost: boolean;
  freePixels: number;
  reviveCost: number;
  downgradeReviveCost: number;
  attributeShardCount: number;
  universalShardCount: number;
  jewels: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteLost: () => void;
  onReviveLost: () => void;
  onDowngradeReviveLost: () => void;
  onLimitBreak: (spend: LimitBreakShardSpendPlan) => void;
}

export function DeckCardDetailOverlay({
  card,
  isLost,
  freePixels,
  reviveCost,
  downgradeReviveCost,
  attributeShardCount,
  universalShardCount,
  jewels,
  onClose,
  onEdit,
  onDelete,
  onDeleteLost,
  onReviveLost,
  onDowngradeReviveLost,
  onLimitBreak,
}: DeckCardDetailOverlayProps) {
  const canAffordDelete = jewels >= JEWEL_COST_DELETE;
  const canAffordRevive = freePixels >= reviveCost;
  const showDowngradeRevive = canDowngradeRevive(card);
  const canAffordDowngradeRevive = freePixels >= downgradeReviveCost;
  const showLimitBreak = !isLost && canLimitBreakCard(card);
  const limitBreakKind = getLimitBreakOutcomeKind(card);
  const rarityJewelCost =
    limitBreakKind === 'rarity' ? getLimitBreakRarityJewelCost(card.rarity) : null;
  const nextRarity =
    limitBreakKind === 'rarity' ? getUpgradedRarity(card.rarity) : null;
  const hasLimitBreakShards = canAffordLimitBreak(
    attributeShardCount,
    universalShardCount,
  );
  const canAffordJewels = rarityJewelCost == null || jewels >= rarityJewelCost;
  const limitBreakCap = isLimitBreakCapReached(card);
  const attrMeta = getAttributeMeta(card.attribute);
  const attrSpendRange = getLimitBreakAttrSpendRange(
    attributeShardCount,
    universalShardCount,
  );
  const [attrSpend, setAttrSpend] = useState(() =>
    defaultLimitBreakAttrSpend(attributeShardCount, universalShardCount),
  );

  useEffect(() => {
    setAttrSpend(defaultLimitBreakAttrSpend(attributeShardCount, universalShardCount));
  }, [card.id, attributeShardCount, universalShardCount]);

  const universalSpend = LIMIT_BREAK_SHARDS_REQUIRED - attrSpend;
  const spendPlan: LimitBreakShardSpendPlan = { attrSpend, universalSpend };
  const spendIsValid = isValidLimitBreakShardSpend(
    spendPlan,
    attributeShardCount,
    universalShardCount,
  );
  const attributeShardsUnavailable =
    attributeShardCount === 0 &&
    universalShardCount >= LIMIT_BREAK_SHARDS_REQUIRED;
  const reviveAriaLabel = canAffordRevive
    ? `復活 ${reviveCost.toLocaleString()}px`
    : `復活 ${reviveCost.toLocaleString()}px 必要・不足`;
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

  const adjustAttrSpend = (delta: number) => {
    if (!attrSpendRange) return;
    setAttrSpend((current) =>
      Math.min(attrSpendRange.max, Math.max(attrSpendRange.min, current + delta)),
    );
  };

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

        {!isLost && limitBreakCap && (
          <p className="deck-card-detail-limit-break-cap muted">
            限界突破の上限（UR★3）に達しています
          </p>
        )}

        {!isLost && showLimitBreak && hasLimitBreakShards && attrSpendRange && (
          <div className="deck-card-detail-limit-break">
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
                    disabled={universalSpend <= LIMIT_BREAK_SHARDS_REQUIRED - attrSpendRange.max}
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
                    disabled={universalSpend >= LIMIT_BREAK_SHARDS_REQUIRED - attrSpendRange.min}
                    onClick={() => adjustAttrSpend(-1)}
                  >
                    ＋
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              className={`deck-card-detail-limit-break-btn${
                !canAffordJewels ? ' deck-card-detail-limit-break-btn--pending' : ''
              }`}
              disabled={!spendIsValid || !canAffordJewels}
              aria-label={
                limitBreakKind === 'rarity' && nextRarity != null && rarityJewelCost != null
                  ? `限界突破（${card.rarity}→${nextRarity}）ジュエル${rarityJewelCost}、${attrMeta.label}のかけら ${attrSpend}、汎用 ${universalSpend}`
                  : `限界突破 ${attrMeta.label}のかけら ${attrSpend}、汎用 ${universalSpend}`
              }
              onClick={() => onLimitBreak(spendPlan)}
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
        )}

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
                <span className="deck-card-detail-revive-label">復活</span>
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
                className={`deck-card-detail-delete${
                  canAffordDelete ? '' : ' deck-card-detail-delete--pending'
                }`}
                disabled={!canAffordDelete}
                onClick={onDeleteLost}
              >
                <span className="deck-card-detail-delete-label">削除</span>
                <JewelAmount
                  amount={JEWEL_COST_DELETE}
                  className="deck-card-detail-delete-jewel"
                  iconClassName="deck-card-detail-delete-jewel-icon"
                />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="deck-card-detail-edit" onClick={onEdit}>
                編集
              </button>
              <button
                type="button"
                className={`deck-card-detail-delete${
                  canAffordDelete ? '' : ' deck-card-detail-delete--pending'
                }`}
                disabled={!canAffordDelete}
                onClick={onDelete}
              >
                <span className="deck-card-detail-delete-label">削除</span>
                <JewelAmount
                  amount={JEWEL_COST_DELETE}
                  className="deck-card-detail-delete-jewel"
                  iconClassName="deck-card-detail-delete-jewel-icon"
                />
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
