import { formatBattleHistoryWhen, CPU_OPPONENT_LABEL } from '../battleHistory';
import type { BattleHistoryEntry, Card } from '../types';
import { CardPreview } from './CardPreview';
import { getRarityMeta } from '../config/rarity';
import type { CSSProperties } from 'react';

interface BattleHistoryListProps {
  entries: BattleHistoryEntry[];
  onSelect: (entry: BattleHistoryEntry) => void;
}

function OpponentDeckThumbnails({ cards }: { cards: Card[] }) {
  return (
    <div className="records-history-deck-thumbs" aria-hidden>
      {cards.slice(0, 5).map((card) => {
        const rarityMeta = getRarityMeta(card.rarity);
        return (
          <div
            key={card.id}
            className={`records-history-deck-thumb records-history-deck-thumb--${card.rarity}`}
            style={
              {
                '--rarity-border': rarityMeta.rowBorder,
                '--rarity-bg': rarityMeta.rowBg,
              } as CSSProperties
            }
          >
            <CardPreview pixels={card.pixels} />
          </div>
        );
      })}
    </div>
  );
}

export function BattleHistoryList({ entries, onSelect }: BattleHistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className="records-history-empty">
        <p className="muted">対戦履歴がありません</p>
        <p className="muted records-history-empty-hint">バトルをプレイするとここに表示されます</p>
      </div>
    );
  }

  return (
    <ul className="records-history-list">
      {entries.map((entry) => {
        const won = entry.winner === 'player';
        return (
          <li key={entry.id}>
            <button
              type="button"
              className="records-history-item"
              onClick={() => onSelect(entry)}
            >
              <div className="records-history-item-main">
                <span className="records-history-when">
                  {formatBattleHistoryWhen(entry.playedAt)}
                </span>
                <span className="records-history-opponent">
                  <span className="records-history-opponent-name">{CPU_OPPONENT_LABEL}</span>
                  <span className="records-history-opponent-level">
                    Lv.{entry.opponentLevel}
                  </span>
                </span>
              </div>
              <OpponentDeckThumbnails cards={entry.opponentDeck} />
              <span
                className={`records-history-result records-history-result-${won ? 'win' : 'lose'}`}
              >
                {won ? '勝ち' : '負け'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
