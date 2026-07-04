import { isTalismanEquipped } from '../card';
import type { Card } from '../types';
import { AttributeBadge } from './AttributeBadge';
import { CardBattleRecord } from './CardBattleRecord';
import { CardPreview } from './CardPreview';
import { LimitBreakStars } from './LimitBreakStars';
import { RarityBadge } from './RarityBadge';
import { TalismanCardBadge } from './TalismanCardBadge';

interface DeckCardRowBodyProps {
  card: Card;
  /** 護符バッジを出さない（公開デッキ閲覧など） */
  hideTalisman?: boolean;
  /** 生存・墓地・復活を出さない（CPU デッキなど） */
  hideBattleRecord?: boolean;
}

/** マイデッキ行と同じ本体レイアウト（レア角・★・絵・名前・BP・戦績） */
export function DeckCardRowBody({
  card,
  hideTalisman = false,
  hideBattleRecord = false,
}: DeckCardRowBodyProps) {
  return (
    <>
      <RarityBadge rarity={card.rarity} size="deck" className="deck-card-rarity-corner" />
      <LimitBreakStars
        stars={card.stars}
        rarity={card.rarity}
        className="deck-card-stars-corner"
      />
      <div className="deck-card-content">
        <div className="deck-card-art">
          <CardPreview pixels={card.pixels} />
        </div>
        <div className="deck-card-body">
          <div className="deck-card-name-row">
            <span className="deck-card-name">{card.name}</span>
            {!hideTalisman && isTalismanEquipped(card) && (
              <TalismanCardBadge variant="equipped" size="deck" />
            )}
          </div>
          <div className="deck-card-meta-row">
            <div className="deck-card-stats-primary">
              <span className="deck-card-bp">{card.bp}</span>
              <AttributeBadge
                attribute={card.attribute}
                className="deck-card-attribute"
                size="deck"
              />
            </div>
            {!hideBattleRecord && (
              <CardBattleRecord
                className="deck-card-record muted"
                wins={card.wins}
                losses={card.losses}
                reviveCount={card.reviveCount}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
