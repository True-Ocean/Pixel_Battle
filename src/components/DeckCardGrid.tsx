import type { Card } from '../types';
import { BattleCard } from './BattleCard';

/** 5枚デッキの一覧表示（戦闘前の確認用・ステータス全部見せる） */
export function DeckCardGrid({
  title,
  cards,
  interactive = false,
  selectedIds = [],
  onToggleCard,
}: {
  title: string;
  cards: Card[];
  interactive?: boolean;
  selectedIds?: string[];
  onToggleCard?: (id: string) => void;
}) {
  return (
    <div className="deck-card-grid-section">
      <h2 className="subhead">{title}</h2>
      <div className={`deck-card-grid ${interactive ? 'deck-card-grid-pick' : ''}`}>
        {cards.map((card, i) => {
          const sel = selectedIds.includes(card.id);
          const order = selectedIds.indexOf(card.id);
          return (
            <BattleCard
              key={card.id}
              name={card.name}
              pixels={card.pixels}
              attribute={card.attribute}
              currentBp={card.bp}
              variant="compact"
              interactive={interactive}
              selected={interactive ? sel : false}
              onClick={
                interactive && onToggleCard
                  ? () => onToggleCard(card.id)
                  : undefined
              }
              slotLabel={
                interactive
                  ? sel
                    ? `${order + 1}`
                    : undefined
                  : `${i + 1}`
              }
            />
          );
        })}
      </div>
    </div>
  );
}
