import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PublicGhostDeck } from '../offlinePvp';
import type { Card } from '../types';
import { CardDetailViewOverlay } from './CardDetailViewOverlay';
import { CompactDeckCardRow } from './CompactDeckCardRow';

interface OfflinePvpDeckDetailOverlayProps {
  ghost: PublicGhostDeck;
  viewerLevel: number;
  canBattle: boolean;
  onClose: () => void;
  onChallenge: (ghost: PublicGhostDeck) => void;
}

export function OfflinePvpDeckDetailOverlay({
  ghost,
  viewerLevel,
  canBattle,
  onClose,
  onChallenge,
}: OfflinePvpDeckDetailOverlayProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const levelDiffers = ghost.authorLevel !== viewerLevel;

  const handleChallenge = () => {
    if (canBattle) {
      onChallenge(ghost);
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

  return (
    <>
      {createPortal(
        <div className="records-history-detail-backdrop" onClick={onClose}>
          <div
            className="records-history-detail-panel compact-deck-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offline-pvp-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="records-history-detail-header compact-deck-detail-header">
              <h2
                id="offline-pvp-detail-title"
                className="records-history-detail-title"
              >
                公開デッキ
              </h2>
              <p className="records-history-detail-opponent">
                {ghost.authorName}
                <span className="records-history-opponent-level">
                  {' '}
                  Lv.{ghost.authorLevel}
                </span>
              </p>
              {levelDiffers && (
                <p className="offline-pvp-bp-note muted">
                  バトル時、相手カードの BP はあなたのレベルに合わせて調整されます
                </p>
              )}
            </header>

            <div className="records-history-detail-scroll">
              <h3 className="records-history-detail-deck-title">相手デッキ</h3>
              <ul className="compact-deck-list">
                {ghost.deck.map((card) => (
                  <CompactDeckCardRow
                    key={card.id}
                    card={card}
                    onSelect={setDetailCard}
                  />
                ))}
              </ul>
            </div>

            <div className="records-history-detail-actions compact-deck-detail-actions">
              <button
                type="button"
                className="records-history-detail-rematch"
                onClick={handleChallenge}
              >
                このデッキと対戦
              </button>
              {notice && (
                <p className="records-history-detail-notice" role="status">
                  {notice}
                </p>
              )}
              <button
                type="button"
                className="records-history-detail-close"
                onClick={onClose}
              >
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
          onClose={() => setDetailCard(null)}
        />
      )}
    </>
  );
}
