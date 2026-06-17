import type { CSSProperties } from 'react';
import { getAttributeMeta } from '../config/attributes';
import { canDowngradeRevive } from '../card';
import { calcDowngradeReviveCost, calcFullReviveCost } from '../config/economy';
import { getRarityMeta } from '../config/rarity';
import type { Card } from '../types';
import { isTalismanEquipped } from '../card';
import { AttributeBadge } from './AttributeBadge';
import { AttributeBattleGuide } from './AttributeBattleGuide';
import { CardBattleRecord } from './CardBattleRecord';
import { CardPreview } from './CardPreview';
import { LimitBreakStars } from './LimitBreakStars';
import { RarityBadge } from './RarityBadge';
import { TalismanCardBadge } from './TalismanCardBadge';

interface DeckCardDetailCardProps {
  card: Card;
  isLost: boolean;
  showTalismanUi?: boolean;
  unusedTalismanCount?: number;
  onTalismanPress?: () => void;
}

export function DeckCardDetailCard({
  card,
  isLost,
  showTalismanUi = false,
  unusedTalismanCount = 0,
  onTalismanPress,
}: DeckCardDetailCardProps) {
  const rarityMeta = getRarityMeta(card.rarity);
  const attrMeta = getAttributeMeta(card.attribute);

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
        <span className="deck-detail-card-name-side" aria-hidden="true" />
        <h3 className="deck-detail-card-name">{card.name}</h3>
        <span className="deck-detail-card-name-side deck-detail-card-name-side--end">
          {showTalismanUi && isTalismanEquipped(card) && onTalismanPress && (
            <TalismanCardBadge variant="equipped" onPress={onTalismanPress} />
          )}
          {showTalismanUi &&
            !isTalismanEquipped(card) &&
            unusedTalismanCount > 0 &&
            onTalismanPress && (
              <TalismanCardBadge variant="available" onPress={onTalismanPress} />
            )}
        </span>
      </div>

      <div className="deck-detail-card-attr">
        <div className="deck-detail-card-attr-icon-wrap">
          <AttributeBadge attribute={card.attribute} size="deck" />
        </div>
        <p className="deck-detail-card-attr-desc">{attrMeta.description}</p>
      </div>

      <AttributeBattleGuide attribute={card.attribute} />

      <p className="deck-detail-card-record">
        <CardBattleRecord
          wins={card.wins}
          losses={card.losses}
          reviveCount={card.reviveCount}
        />
      </p>

      {isLost && (
        <p className="deck-detail-card-lost-note">
          バトルに出せません。削除するか、
          {canDowngradeRevive(card)
            ? `復活（${calcFullReviveCost(card).toLocaleString()}px）・降格復活（${calcDowngradeReviveCost(card).toLocaleString()}px）`
            : `復活（${calcFullReviveCost(card).toLocaleString()}px）`}
          で復活できます。
        </p>
      )}
    </article>
  );
}
