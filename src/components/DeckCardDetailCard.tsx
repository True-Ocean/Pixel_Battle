import { useState, type CSSProperties } from 'react';
import { getAttributeMeta } from '../config/attributes';
import type { BattleGuideTermId } from '../config/battleGuideCommon';
import { canReviveLostCard, hasCardUserNote } from '../card';
import { calcReviveCost } from '../config/economy';
import { getRarityMeta } from '../config/rarity';
import type { Card } from '../types';
import { isTalismanEquipped } from '../card';
import { AttributeBadge } from './AttributeBadge';
import { BattleTermGuideModal } from './BattleTermGuideModal';
import { CardBattleRecord } from './CardBattleRecord';
import { CardPreview } from './CardPreview';
import { GuideTextWithTerms } from './GuideTextWithTerms';
import { LimitBreakStars } from './LimitBreakStars';
import { InlinePxCost } from './HelpInlineEconomy';
import { RarityBadge } from './RarityBadge';
import { TalismanCardBadge } from './TalismanCardBadge';
import { CardNoteIconButton } from './CardNoteIconButton';

interface DeckCardDetailCardProps {
  card: Card;
  isLost: boolean;
  showTalismanUi?: boolean;
  unusedTalismanCount?: number;
  onTalismanPress?: () => void;
  showAttributeEdit?: boolean;
  attributeMenuOpen?: boolean;
  onAttributeMenuToggle?: () => void;
  onAttributeRetouch?: () => void;
  onAttributeSelect?: () => void;
  onBattleGuideOpen?: () => void;
  /** CPU デッキなど戦績を出さないとき */
  hideBattleRecord?: boolean;
  /**
   * ノート欄右のアイコンを表示する（自分のカード詳細など）。
   * 未指定時はノート本文がある場合のみ欄を表示し、アイコンは出さない。
   */
  onNoteIconPress?: () => void;
  /** プレミアムでノート編集可か（aria 文言用。実際の可否は onNoteIconPress 側） */
  canEditNote?: boolean;
}

export function DeckCardDetailCard({
  card,
  isLost,
  showTalismanUi = false,
  unusedTalismanCount = 0,
  onTalismanPress,
  showAttributeEdit = false,
  attributeMenuOpen = false,
  onAttributeMenuToggle,
  onAttributeRetouch,
  onAttributeSelect,
  onBattleGuideOpen,
  hideBattleRecord = false,
  onNoteIconPress,
  canEditNote = false,
}: DeckCardDetailCardProps) {
  const [attrDetailOpen, setAttrDetailOpen] = useState(false);
  const [openTermId, setOpenTermId] = useState<BattleGuideTermId | null>(null);
  const rarityMeta = getRarityMeta(card.rarity);
  const attrMeta = getAttributeMeta(card.attribute);
  const battleGuide = attrMeta.battleGuide.trim();
  const showUserNote = hasCardUserNote(card);
  const showNoteSection = showUserNote || onNoteIconPress != null;
  const noteText = card.userNote?.trim() ?? '';

  const resetKey = `${card.id}\u0000${card.attribute}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setAttrDetailOpen(false);
    setOpenTermId(null);
  }

  const cardStyle = {
    '--rarity-border': rarityMeta.rowBorder,
    '--rarity-bg': rarityMeta.rowBg,
    '--rarity-border-width': rarityMeta.rowBorderWidth,
    '--rarity-shadow': rarityMeta.rowBoxShadow ?? 'none',
    '--deck-detail-attr-bg': attrMeta.bg,
    '--deck-detail-attr-border': attrMeta.border,
  } as CSSProperties;

  return (
    <article
      className={[
        'deck-detail-card',
        `deck-detail-card--${card.rarity}`,
        isLost ? 'deck-detail-card--lost' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={cardStyle}
      aria-label={card.name}
    >
      <header className="deck-detail-card-top">
        <div className="deck-detail-card-top-left">
          <RarityBadge rarity={card.rarity} size="deck" className="deck-detail-card-rarity" />
          <LimitBreakStars
            stars={card.stars}
            rarity={card.rarity}
            className="deck-detail-card-stars"
          />
        </div>
        <span className="deck-detail-card-bp" aria-label={`BP ${card.bp}`}>
          {card.bp}
        </span>
      </header>

      <div className="deck-detail-card-art">
        <CardPreview pixels={card.pixels} />
        {isLost && (
          <span className="card-lost-badge card-lost-badge--detail" aria-hidden>
            ロスト中
          </span>
        )}
      </div>

      <div className="deck-detail-card-name-row">
        <span className="deck-detail-card-name-side deck-detail-card-name-side--start">
          {isTalismanEquipped(card) && (
            <TalismanCardBadge
              variant="equipped"
              onPress={
                showTalismanUi && onTalismanPress ? onTalismanPress : undefined
              }
            />
          )}
          {showTalismanUi &&
            !isTalismanEquipped(card) &&
            unusedTalismanCount > 0 &&
            onTalismanPress && (
              <TalismanCardBadge variant="available" onPress={onTalismanPress} />
            )}
        </span>
        <h3 className="deck-detail-card-name">{card.name}</h3>
        <span className="deck-detail-card-name-side" aria-hidden="true" />
      </div>

      <div
        className={[
          'deck-detail-card-attr',
          attrDetailOpen ? 'deck-detail-card-attr--expanded' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="deck-detail-card-attr-main">
          <div className="deck-detail-card-attr-icon-wrap">
            <AttributeBadge attribute={card.attribute} size="deck" />
          </div>
          <p className="deck-detail-card-attr-desc">{attrMeta.description}</p>
          {showAttributeEdit && onAttributeMenuToggle && (
            <div className="deck-detail-card-attr-menu-wrap">
              <button
                type="button"
                className="deck-detail-card-attr-menu-btn"
                aria-label="属性変更"
                aria-expanded={attributeMenuOpen}
                onClick={onAttributeMenuToggle}
              >
                属性変更
              </button>
              {attributeMenuOpen && (
                <div className="deck-detail-card-attr-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="deck-detail-card-attr-menu-item"
                    onClick={onAttributeRetouch}
                  >
                    属性リタッチ
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="deck-detail-card-attr-menu-item"
                    onClick={onAttributeSelect}
                  >
                    属性セレクト
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {battleGuide && (
          <>
            <button
              type="button"
              className="deck-detail-card-attr-expand-btn"
              aria-label={attrDetailOpen ? '詳しい説明を閉じる' : '詳しい説明を開く'}
              aria-expanded={attrDetailOpen}
              onClick={() => {
                setAttrDetailOpen((open) => {
                  if (!open) onBattleGuideOpen?.();
                  return !open;
                });
              }}
            >
              {attrDetailOpen ? '▲' : '▼'}
            </button>
            <div
              className={[
                'deck-detail-card-attr-detail-wrap',
                attrDetailOpen ? 'deck-detail-card-attr-detail-wrap--open' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="deck-detail-card-attr-detail-inner">
                <div className="deck-detail-card-attr-detail" role="note">
                  <GuideTextWithTerms
                    text={battleGuide}
                    onTermPress={setOpenTermId}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {openTermId && (
        <BattleTermGuideModal termId={openTermId} onClose={() => setOpenTermId(null)} />
      )}

      {showNoteSection && (
        <div
          className={[
            'deck-detail-card-user-note',
            showUserNote ? '' : 'deck-detail-card-user-note--empty',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {showUserNote ? (
            <p className="deck-detail-card-user-note-text">{noteText}</p>
          ) : (
            <p className="deck-detail-card-user-note-placeholder">ノートを書く…</p>
          )}
          {onNoteIconPress && (
            <CardNoteIconButton
              className="deck-detail-card-user-note-edit"
              filled={showUserNote}
              ariaLabel={
                canEditNote
                  ? showUserNote
                    ? 'カードノートを編集'
                    : 'カードノートを追加'
                  : 'カードノート（プレミアム限定）'
              }
              onClick={onNoteIconPress}
            />
          )}
        </div>
      )}

      {!hideBattleRecord && (
        <p className="deck-detail-card-record">
          <CardBattleRecord
            wins={card.wins}
            losses={card.losses}
            reviveCount={card.reviveCount}
          />
        </p>
      )}

      {isLost && (
        <p className="deck-detail-card-lost-note">
          バトルに出せません。
          {canReviveLostCard(card) ? (
            <>
              復活（
              <InlinePxCost
                amount={calcReviveCost(card)}
                className="deck-detail-inline-px"
                iconClassName="deck-detail-inline-px-icon"
              />
              ）・思い出アルバムに保存・削除
            </>
          ) : (
            '思い出アルバムへの保存か削除'
          )}
          から選べます。
        </p>
      )}
    </article>
  );
}
