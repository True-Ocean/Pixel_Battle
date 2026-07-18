import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BattleHistoryEntry, Card } from '../types';
import { CPU_OPPONENT_LABEL, formatBattleHistoryWhen } from '../battleHistory';
import { CardDetailViewOverlay } from './CardDetailViewOverlay';
import { CompactDeckCardRow } from './CompactDeckCardRow';

interface BattleHistoryDetailOverlayProps {
  entry: BattleHistoryEntry;
  canRematch: boolean;
  onClose: () => void;
  onRematch: (entry: BattleHistoryEntry) => void;
  onOpenOpponentProfile: (entry: BattleHistoryEntry) => void;
  onOpponentCardView?: () => void;
}

export function BattleHistoryDetailOverlay({
  entry,
  canRematch,
  onClose,
  onRematch,
  onOpenOpponentProfile,
  onOpponentCardView,
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
  const isCpuOpponent = entry.opponentName === CPU_OPPONENT_LABEL;

  return (
    <>
      {createPortal(
        <div className="records-history-detail-backdrop" onClick={onClose}>
          <div
            className="records-history-detail-panel compact-deck-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="records-history-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="records-history-detail-header compact-deck-detail-header">
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
                vs{' '}
                {isCpuOpponent ? (
                  entry.opponentName
                ) : (
                  <button
                    type="button"
                    className="records-history-profile-link"
                    aria-label={`${entry.opponentName}のプロフィールを開く`}
                    onClick={() => onOpenOpponentProfile(entry)}
                  >
                    <span className="profile-link-name">
                      {entry.opponentName}
                    </span>
                  </button>
                )}
                <span className="records-history-opponent-level"> Lv.{entry.opponentLevel}</span>
              </p>
              <p className="records-history-detail-power muted">
                自軍 戦力 {entry.playerDeckPower} / 相手 戦力 {entry.opponentDeckPower}
              </p>
            </header>

            <div className="records-history-detail-scroll">
              <h3 className="records-history-detail-deck-title">相手デッキ</h3>
              <ul className="compact-deck-list">
                {entry.opponentDeck.map((card) => (
                  <CompactDeckCardRow
                    key={card.id}
                    card={card}
                    hideBattleRecord={isCpuOpponent}
                    onSelect={(selected) => {
                      onOpponentCardView?.();
                      setDetailCard(selected);
                    }}
                  />
                ))}
              </ul>
            </div>

            <div className="records-history-detail-actions compact-deck-detail-actions">
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
        <CardDetailViewOverlay
          card={detailCard}
          hideBattleRecord={isCpuOpponent}
          onClose={() => setDetailCard(null)}
        />
      )}
    </>
  );
}
