import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { DECK_MAX } from '../config/balance';
import { getRarityMeta } from '../config/rarity';
import type { BattleHistoryEntry, Card } from '../types';
import { formatBattleHistoryWhen } from '../battleHistory';
import { AttributeBadge } from './AttributeBadge';
import { CardPreview } from './CardPreview';
import { RarityBadge } from './RarityBadge';

interface BattleHistoryDetailOverlayProps {
  entry: BattleHistoryEntry;
  deckCount: number;
  onClose: () => void;
  onPracticeRematch: (entry: BattleHistoryEntry) => void;
}

function HistoryCardRow({ card }: { card: Card }) {
  const rarityMeta = getRarityMeta(card.rarity);

  return (
    <li
      className={`records-history-card-row records-history-card-row--${card.rarity}`}
      style={
        {
          '--rarity-border': rarityMeta.rowBorder,
          '--rarity-bg': rarityMeta.rowBg,
        } as CSSProperties
      }
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
    </li>
  );
}

export function BattleHistoryDetailOverlay({
  entry,
  deckCount,
  onClose,
  onPracticeRematch,
}: BattleHistoryDetailOverlayProps) {
  const canRematch = deckCount >= DECK_MAX;
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (canRematch) {
      setNotice(null);
    }
  }, [canRematch]);

  const handlePracticeRematch = () => {
    if (canRematch) {
      onPracticeRematch(entry);
      return;
    }
    setNotice(
      `デッキが${DECK_MAX}枚揃っていません。あと ${DECK_MAX - deckCount} 枚必要です（現在 ${deckCount}/${DECK_MAX} 枚）。`,
    );
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

  return createPortal(
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
            vs {entry.opponentName}
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
              <HistoryCardRow key={card.id} card={card} />
            ))}
          </ul>
        </div>

        <div className="records-history-detail-actions">
          <button
            type="button"
            className="records-history-detail-rematch"
            onClick={handlePracticeRematch}
          >
            もう一度対戦する
          </button>
          <p className="records-history-detail-rematch-hint muted">
            練習再戦（履歴・報酬なし）· 現在のマイデッキで対戦
          </p>
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
  );
}
