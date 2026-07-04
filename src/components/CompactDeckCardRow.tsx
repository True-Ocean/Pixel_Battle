import type { CSSProperties } from 'react';
import { getRarityMeta, type RarityMeta } from '../config/rarity';
import type { Card } from '../types';
import { DeckCardRowBody } from './DeckCardRowBody';

function deckRowStyle(rarityMeta: RarityMeta): CSSProperties {
  return {
    '--rarity-border': rarityMeta.rowBorder,
    '--rarity-bg': rarityMeta.rowBg,
    '--rarity-border-width': rarityMeta.rowBorderWidth,
    '--rarity-shadow': rarityMeta.rowBoxShadow ?? 'none',
  } as CSSProperties;
}

interface CompactDeckCardRowProps {
  card: Card;
  onSelect: (card: Card) => void;
  /** CPU デッキなど戦績を出さないとき */
  hideBattleRecord?: boolean;
}

/** 公開デッキ・バトル履歴など、モーダル内のコンパクトなデッキ行 */
export function CompactDeckCardRow({
  card,
  onSelect,
  hideBattleRecord = false,
}: CompactDeckCardRowProps) {
  const rarityMeta = getRarityMeta(card.rarity);

  return (
    <li
      className={`deck-card-row deck-card-row--${card.rarity} compact-deck-card`}
      style={deckRowStyle(rarityMeta)}
    >
      <button
        type="button"
        className="deck-card-main"
        onClick={() => onSelect(card)}
      >
        <DeckCardRowBody
          card={card}
          hideTalisman
          hideBattleRecord={hideBattleRecord}
        />
      </button>
    </li>
  );
}
