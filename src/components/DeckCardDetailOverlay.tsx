import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  canLimitBreakCard,
  canReviveLostCard,
  defaultLimitBreakAttrSpend,
  getLimitBreakOutcomeKind,
  getLimitBreakAttrSpendRange,
  getUpgradedRarity,
  isLimitBreakCapReached,
  isValidLimitBreakShardSpend,
  type LimitBreakShardSpendPlan,
} from '../card';
import { getLimitBreakRarityJewelCost, getLimitBreakShardsRequired, JEWEL_COST_DELETE } from '../config/economy';
import { getAttributeMeta } from '../config/attributes';
import { canAffordLimitBreak } from '../user/inventory';
import type { Attribute, Card } from '../types';
import { AttributeBadge } from './AttributeBadge';
import { AttributeRetouchModal, type AttributeRetouchResult } from './AttributeRetouchModal';
import { AttributeSelectModal } from './AttributeSelectModal';
import type { AttributeSelectOutcome } from './attributeSelectTypes';
import { PixelCoinIcon } from './PixelCoinIcon';
import { JewelAmount } from './JewelIcon';
import { DeckCardDetailCard } from './DeckCardDetailCard';
import { UniversalShardIcon } from './UniversalShardIcon';

interface DeckCardDetailOverlayProps {
  card: Card;
  isLost: boolean;
  userLevel: number;
  freePixels: number;
  reviveCost: number;
  attributeShardCount: number;
  universalShardCount: number;
  jewels: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteLost: () => void;
  onReviveLost: () => void;
  onAddToAlbum: () => void;
  onLimitBreak: (spend: LimitBreakShardSpendPlan) => void;
  onRetouchCardAttribute: (
    cardId: string,
  ) => AttributeRetouchResult | { error: string };
  onCommitRetouchCardAttribute: () => void;
  onSelectCardAttribute: (cardId: string, attribute: Attribute) => AttributeSelectOutcome;
  paletteShopUnlocks?: readonly number[];
  showTalismanUi?: boolean;
  unusedTalismanCount?: number;
  onTalismanPress?: () => void;
}

export function DeckCardDetailOverlay({
  card,
  isLost,
  userLevel,
  freePixels,
  reviveCost,
  attributeShardCount,
  universalShardCount,
  jewels,
  onClose,
  onEdit,
  onDelete,
  onDeleteLost,
  onReviveLost,
  onAddToAlbum,
  onLimitBreak,
  onRetouchCardAttribute,
  onCommitRetouchCardAttribute,
  onSelectCardAttribute,
  paletteShopUnlocks = [],
  showTalismanUi = false,
  unusedTalismanCount = 0,
  onTalismanPress,
}: DeckCardDetailOverlayProps) {
  const canAffordDelete = jewels >= JEWEL_COST_DELETE;
  const canRevive = canReviveLostCard(card);
  const canAffordRevive = freePixels >= reviveCost;
  const showLimitBreak = !isLost && canLimitBreakCard(card);
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
  const limitBreakCap = isLimitBreakCapReached(card);
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
  const [attributeMenuOpen, setAttributeMenuOpen] = useState(false);
  const [retouchModalOpen, setRetouchModalOpen] = useState(false);
  const [selectModalOpen, setSelectModalOpen] = useState(false);

  useEffect(() => {
    setAttributeMenuOpen(false);
  }, [card.id, card.attribute]);

  useEffect(() => {
    setAttrSpend(
      defaultLimitBreakAttrSpend(
        attributeShardCount,
        universalShardCount,
        shardsRequired,
      ),
    );
  }, [card.id, card.rarity, attributeShardCount, universalShardCount, shardsRequired]);

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
  const reviveAriaLabel = !canRevive
    ? '復活上限に達しています'
    : !canAffordRevive
      ? `復活 ${reviveCost.toLocaleString()} 必要・不足`
      : undefined;

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
          <DeckCardDetailCard
            card={card}
            isLost={isLost}
            showTalismanUi={showTalismanUi}
            unusedTalismanCount={unusedTalismanCount}
            onTalismanPress={onTalismanPress}
            showAttributeEdit={!isLost}
            attributeMenuOpen={attributeMenuOpen}
            onAttributeMenuToggle={() => setAttributeMenuOpen((open) => !open)}
            onAttributeRetouch={() => {
              setAttributeMenuOpen(false);
              setRetouchModalOpen(true);
            }}
            onAttributeSelect={() => {
              setAttributeMenuOpen(false);
              setSelectModalOpen(true);
            }}
          />
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

        <div className="deck-card-detail-actions deck-card-detail-actions--with-album">
          {isLost ? (
            <>
              {canRevive && (
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
                  <PixelCoinIcon
                    className="deck-card-detail-revive-coin"
                    aria-hidden="true"
                  />
                  <span className="sr-only">ピクセルコイン</span>
                  <span className="deck-card-detail-revive-cost">
                    {reviveCost.toLocaleString()}
                  </span>
                </button>
              )}
              {!canRevive && (
                <p className="deck-card-detail-revive-cap-note muted" role="status">
                  復活上限に達しました
                </p>
              )}
              <button
                type="button"
                className="deck-card-detail-album"
                onClick={onAddToAlbum}
              >
                思い出アルバムに保存
              </button>
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
                編集　🎬
              </button>
              <button type="button" className="deck-card-detail-album" onClick={onAddToAlbum}>
                思い出アルバムに保存
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

      <AttributeRetouchModal
        open={retouchModalOpen}
        userLevel={userLevel}
        freePixels={freePixels}
        onClose={() => setRetouchModalOpen(false)}
        onRetouch={() => onRetouchCardAttribute(card.id)}
        onCommitRetouch={onCommitRetouchCardAttribute}
      />
      <AttributeSelectModal
        open={selectModalOpen}
        card={card}
        userLevel={userLevel}
        jewels={jewels}
        paletteShopUnlocks={paletteShopUnlocks}
        onClose={() => setSelectModalOpen(false)}
        onSelect={(attribute) => onSelectCardAttribute(card.id, attribute)}
      />
    </div>,
    document.body,
  );
}
