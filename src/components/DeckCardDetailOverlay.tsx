import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  canLimitBreakCard,
  canReviveLostCard,
  getLimitBreakOutcomeKind,
  getUpgradedRarity,
  isLimitBreakCapReached,
  type LimitBreakShardSpendPlan,
} from '../card';
import { getLimitBreakRarityJewelCost, JEWEL_COST_DELETE } from '../config/economy';
import type { Attribute, Card } from '../types';
import { AttributeRetouchModal, type AttributeRetouchResult } from './AttributeRetouchModal';
import { AttributeSelectModal } from './AttributeSelectModal';
import type { AttributeSelectOutcome } from './attributeSelectTypes';
import { PixelCoinIcon } from './PixelCoinIcon';
import { JewelAmount } from './JewelIcon';
import { DeckCardDetailCard } from './DeckCardDetailCard';
import { LimitBreakModal } from './LimitBreakModal';

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
  const canAffordJewels = rarityJewelCost == null || jewels >= rarityJewelCost;
  const limitBreakCap = isLimitBreakCapReached(card);
  const [attributeMenuOpen, setAttributeMenuOpen] = useState(false);
  const [retouchModalOpen, setRetouchModalOpen] = useState(false);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [limitBreakModalOpen, setLimitBreakModalOpen] = useState(false);
  const reviveAriaLabel = !canRevive
    ? '復活上限に達しています'
    : !canAffordRevive
      ? `復活 ${reviveCost.toLocaleString()} 必要・不足`
      : undefined;

  useEffect(() => {
    setAttributeMenuOpen(false);
  }, [card.id, card.attribute]);

  useEffect(() => {
    setLimitBreakModalOpen(false);
  }, [card.id, card.rarity, card.stars]);

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

        <div
          className={[
            'deck-card-detail-actions',
            'deck-card-detail-actions--with-album',
            showLimitBreak ? 'deck-card-detail-actions--with-limit-break' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
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
              {showLimitBreak && (
                <button
                  type="button"
                  className={`deck-card-detail-limit-break-trigger${
                    limitBreakKind === 'rarity' && !canAffordJewels
                      ? ' deck-card-detail-limit-break-trigger--pending'
                      : ''
                  }`}
                  aria-label={
                    limitBreakKind === 'rarity' && nextRarity != null && rarityJewelCost != null
                      ? `限界突破（${card.rarity}→${nextRarity}）ジュエル${rarityJewelCost}`
                      : '限界突破'
                  }
                  onClick={() => setLimitBreakModalOpen(true)}
                >
                  {limitBreakKind === 'rarity' && nextRarity != null && rarityJewelCost != null ? (
                    <span className="deck-card-detail-limit-break-trigger-content">
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
              )}
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
      <LimitBreakModal
        open={limitBreakModalOpen}
        card={card}
        attributeShardCount={attributeShardCount}
        universalShardCount={universalShardCount}
        jewels={jewels}
        onClose={() => setLimitBreakModalOpen(false)}
        onConfirm={onLimitBreak}
      />
    </div>,
    document.body,
  );
}
