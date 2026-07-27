import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  canLimitBreakCard,
  canReviveLostCard,
  getLimitBreakOutcomeKind,
  getUpgradedRarity,
  isLimitBreakCapReached,
  type AttributeGachaPulls,
  type AttributeEventGachaState,
  type LimitBreakShardSpendPlan,
} from '../card';
import { getLimitBreakRarityJewelCost, JEWEL_COST_DELETE } from '../config/economy';
import type { Attribute, Card } from '../types';
import { AttributeGachaModal } from './AttributeGachaModal';
import type {
  AttributeGachaConfirmOutcome,
  AttributeGachaResolveOutcome,
  AttributeGachaStartOutcome,
} from './attributeGachaTypes';
import { AdIcon } from './AdIcon';
import { PixelCoinIcon } from './PixelCoinIcon';
import { JewelAmount } from './JewelIcon';
import { DeckCardDetailCard } from './DeckCardDetailCard';
import { LimitBreakModal } from './LimitBreakModal';
import { CardNoteEditModal } from './CardNoteEditModal';
import { CardNotePremiumUpsellModal } from './CardNotePremiumUpsellModal';

function resolvePublicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

const MEMORY_ALBUM_ICON_URL = resolvePublicAssetUrl('album.png');

function MemoryAlbumMoveButtonLabel() {
  return (
    <>
      <img
        className="deck-card-detail-album-icon"
        src={MEMORY_ALBUM_ICON_URL}
        alt=""
        width={22}
        height={22}
        draggable={false}
        aria-hidden
      />
      <span>に移動</span>
    </>
  );
}

interface DeckCardDetailOverlayProps {
  card: Card;
  isLost: boolean;
  userLevel: number;
  freePixels: number;
  reviveCost: number;
  attributeShardCount: number;
  jewels: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteLost: () => void;
  onReviveLost: () => void;
  onAddToAlbum: () => void;
  onLimitBreak: (spend: LimitBreakShardSpendPlan) => void;
  onStartAttributeGacha: (
    cardId: string,
    pulls: AttributeGachaPulls,
  ) => AttributeGachaStartOutcome;
  onStartEventAttributeGacha: (cardId: string) => AttributeGachaStartOutcome;
  onResolveAttributeGacha: (keepIndex: number | null) => AttributeGachaResolveOutcome;
  onConfirmAttributeGacha: (
    cardId: string,
    attribute: Attribute,
  ) => AttributeGachaConfirmOutcome;
  attributeEventGacha: AttributeEventGachaState;
  paletteShopUnlocks?: readonly number[];
  showTalismanUi?: boolean;
  unusedTalismanCount?: number;
  onTalismanPress?: () => void;
  /** ライト / プレ: 編集入室 CM スキップ（AD アイコン非表示） */
  skipsCreativeAd?: boolean;
  onBattleGuideOpen?: () => void;
  /** プレミアム: カードノート編集可 */
  canEditCardUserNote?: boolean;
  onSaveUserNote?: (cardId: string, note: string) => void;
  onOpenShopSubscription?: () => void;
}

export function DeckCardDetailOverlay({
  card,
  isLost,
  userLevel,
  freePixels,
  reviveCost,
  attributeShardCount,
  jewels,
  onClose,
  onEdit,
  onDelete,
  onDeleteLost,
  onReviveLost,
  onAddToAlbum,
  onLimitBreak,
  onStartAttributeGacha,
  onStartEventAttributeGacha,
  onResolveAttributeGacha,
  onConfirmAttributeGacha,
  attributeEventGacha,
  paletteShopUnlocks = [],
  showTalismanUi = false,
  unusedTalismanCount = 0,
  onTalismanPress,
  skipsCreativeAd = false,
  onBattleGuideOpen,
  canEditCardUserNote = false,
  onSaveUserNote,
  onOpenShopSubscription,
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
  const [gachaModalOpen, setGachaModalOpen] = useState(false);
  const [limitBreakModalOpen, setLimitBreakModalOpen] = useState(false);
  const [noteEditOpen, setNoteEditOpen] = useState(false);
  const [noteUpsellOpen, setNoteUpsellOpen] = useState(false);
  const reviveAriaLabel = !canRevive
    ? '復活上限に達しています'
    : !canAffordRevive
      ? `復活 ${reviveCost.toLocaleString()} 必要・不足`
      : undefined;

  const noteResetKey = card.id;
  const [prevNoteResetKey, setPrevNoteResetKey] = useState(noteResetKey);
  if (noteResetKey !== prevNoteResetKey) {
    setPrevNoteResetKey(noteResetKey);
    setNoteEditOpen(false);
    setNoteUpsellOpen(false);
  }

  const limitBreakResetKey = `${card.id}\u0000${card.rarity}\u0000${card.stars}`;
  const [prevLimitBreakResetKey, setPrevLimitBreakResetKey] =
    useState(limitBreakResetKey);
  if (limitBreakResetKey !== prevLimitBreakResetKey) {
    setPrevLimitBreakResetKey(limitBreakResetKey);
    setLimitBreakModalOpen(false);
  }

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
    <div
      className="deck-card-detail-backdrop"
      onClick={() => {
        if (
          gachaModalOpen ||
          limitBreakModalOpen ||
          noteEditOpen ||
          noteUpsellOpen
        ) {
          return;
        }
        onClose();
      }}
    >
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
            onAttributeGacha={() => setGachaModalOpen(true)}
            onBattleGuideOpen={onBattleGuideOpen}
            canEditNote={canEditCardUserNote}
            onNoteIconPress={
              onSaveUserNote
                ? () => {
                    if (canEditCardUserNote) {
                      setNoteEditOpen(true);
                    } else {
                      setNoteUpsellOpen(true);
                    }
                  }
                : undefined
            }
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
                aria-label="思い出アルバムに移動"
              >
                <MemoryAlbumMoveButtonLabel />
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
                {skipsCreativeAd ? (
                  '編集'
                ) : (
                  <>
                    編集
                    <AdIcon className="deck-card-detail-ad-icon" />
                  </>
                )}
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
              <button
                type="button"
                className="deck-card-detail-album"
                onClick={onAddToAlbum}
                aria-label="思い出アルバムに移動"
              >
                <MemoryAlbumMoveButtonLabel />
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

      <AttributeGachaModal
        open={gachaModalOpen}
        card={card}
        userLevel={userLevel}
        freePixels={freePixels}
        jewels={jewels}
        attributeEventGacha={attributeEventGacha}
        paletteShopUnlocks={paletteShopUnlocks}
        onClose={() => setGachaModalOpen(false)}
        onStartPixelGacha={(pulls) => onStartAttributeGacha(card.id, pulls)}
        onStartEventGacha={() => onStartEventAttributeGacha(card.id)}
        onResolvePixelGacha={onResolveAttributeGacha}
        onConfirmAttribute={(attribute) => onConfirmAttributeGacha(card.id, attribute)}
      />
      <LimitBreakModal
        open={limitBreakModalOpen}
        card={card}
        attributeShardCount={attributeShardCount}
        jewels={jewels}
        onClose={() => setLimitBreakModalOpen(false)}
        onConfirm={onLimitBreak}
      />
      {noteEditOpen && onSaveUserNote && (
        <CardNoteEditModal
          initialValue={card.userNote ?? ''}
          persistMode="immediate"
          onSave={(value) => onSaveUserNote(card.id, value)}
          onClose={() => setNoteEditOpen(false)}
        />
      )}
      {noteUpsellOpen && (
        <CardNotePremiumUpsellModal
          onClose={() => setNoteUpsellOpen(false)}
          onOpenShop={() => onOpenShopSubscription?.()}
        />
      )}
    </div>,
    document.body,
  );
}
