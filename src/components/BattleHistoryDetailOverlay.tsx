import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { getRarityMeta } from '../config/rarity';
import type { BattleHistoryEntry, Card } from '../types';
import { formatBattleHistoryWhen, CPU_OPPONENT_LABEL } from '../battleHistory';
import { AttributeBadge } from './AttributeBadge';
import { CardDetailViewOverlay } from './CardDetailViewOverlay';
import { CardPreview } from './CardPreview';
import { RarityBadge } from './RarityBadge';

interface BattleHistoryDetailOverlayProps {
  entry: BattleHistoryEntry;
  canRematch: boolean;
  onClose: () => void;
  onRematch: (entry: BattleHistoryEntry) => void;
}

function HistoryCardRow({ card, onSelect }: { card: Card; onSelect: (card: Card) => void }) {
  const rarityMeta = getRarityMeta(card.rarity);

  return (
    <li>
      <button
        type="button"
        className={`records-history-card-row records-history-card-row--${card.rarity}`}
        style={
          {
            '--rarity-border': rarityMeta.rowBorder,
            '--rarity-bg': rarityMeta.rowBg,
          } as CSSProperties
        }
        onClick={() => onSelect(card)}
      >
        <div className="records-history-card-art">
          <CardPreview pixels={card.pixels} />
        </div>
        <div className="records-history-card-body">
          <div className="records-history-card-name-row">
            <RarityBadge rarity={card.rarity} size="deck" className="records-history-card-rarity" />
            <span className="records-history-card-name">{card.name}</span>
          </div>
          <div className="records-history-card-meta">
            <span className="records-history-card-bp">{card.bp}</span>
            <AttributeBadge attribute={card.attribute} size="deck" />
          </div>
        </div>
      </button>
    </li>
  );
}

export function BattleHistoryDetailOverlay({
  entry,
  canRematch,
  onClose,
  onRematch,
}: BattleHistoryDetailOverlayProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<Card | null>(null);

  const handleRematch = () => {
    if (canRematch) {
      onRematch(entry);
      return;
    }
    setNotice('5枚揃ったデッキがありません。マイデッキで編成してください。');
  };
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

  const won = entry.winner === 'player';

  return (
    <>
      {createPortal(
        <div className="records-history-detail-backdrop" onClick={onClose}>
          <div
            className="records-history-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="records-history-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="records-history-detail-header">
              <h2 id="records-history-detail-title" className="records-history-detail-title">
                対戦詳細
              </h2>
              <p className="records-history-detail-meta muted">
                {formatBattleHistoryWhen(entry.playedAt)} ·{' '}
                <span className={won ? 'records-history-result-win' : 'records-history-result-lose'}>
                  {won ? '勝利' : '敗北'}
                </span>
              </p>
              <p className="records-history-detail-opponent">
                vs {CPU_OPPONENT_LABEL}
                <span className="records-history-opponent-level"> Lv.{entry.opponentLevel}</span>
              </p>
              <p className="records-history-detail-power muted">
                自軍 戦力 {entry.playerDeckPower} / 相手 戦力 {entry.opponentDeckPower}
              </p>
            </header>

            <div className="records-history-detail-scroll">
              <h3 className="records-history-detail-deck-title">相手デッキ</h3>
              <ul className="records-history-card-list">
                {entry.opponentDeck.map((card) => (
                  <HistoryCardRow key={card.id} card={card} onSelect={setDetailCard} />
                ))}
              </ul>
            </div>

            <div className="records-history-detail-actions">
              <button
                type="button"
                className="records-history-detail-rematch"
                onClick={handleRematch}
              >
                もう一度対戦する
              </button>
              {notice && (
                <p className="records-history-detail-notice" role="status">
                  {notice}
                </p>
              )}
              <button type="button" className="records-history-detail-close" onClick={onClose}>
                閉じる
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {detailCard && (
        <CardDetailViewOverlay card={detailCard} onClose={() => setDetailCard(null)} />
      )}
    </>
  );
}
