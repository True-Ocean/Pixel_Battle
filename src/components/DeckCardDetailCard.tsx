import type { CSSProperties } from 'react';
import { getAttributeMeta } from '../config/attributes';
import { getRarityMeta } from '../config/rarity';
import type { Card } from '../types';
import { AttributeBadge } from './AttributeBadge';
import { AttributeBattleGuide } from './AttributeBattleGuide';
import { CardBattleRecord } from './CardBattleRecord';
import { CardPreview } from './CardPreview';
import { LimitBreakStars } from './LimitBreakStars';
import { RarityBadge } from './RarityBadge';

interface DeckCardDetailCardProps {
  card: Card;
  isFauxLost: boolean;
}

export function DeckCardDetailCard({ card, isFauxLost }: DeckCardDetailCardProps) {
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
        isFauxLost ? 'deck-detail-card--faux-lost' : '',
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
      </div>

      <h3 className="deck-detail-card-name">{card.name}</h3>

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

      {isFauxLost && (
        <>
          <span className="deck-detail-card-lost-badge" aria-hidden>
            仮ロスト
          </span>
          <p className="deck-detail-card-faux-note">
            プロトタイプ：カードデータは保存されています
          </p>
        </>
      )}
    </article>
  );
}
