import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { computeDeckPower } from '../card';
import type { PublicGhostDeck } from '../offlinePvp';
import type { Card } from '../types';
import { CardDetailViewOverlay } from './CardDetailViewOverlay';
import { CompactDeckCardRow } from './CompactDeckCardRow';

interface OfflinePvpDeckDetailOverlayProps {
  ghost: PublicGhostDeck;
  viewerDeckPower: number | null;
  canBattle: boolean;
  onClose: () => void;
  onOpenProfile: (ghost: PublicGhostDeck) => void;
  onChallenge: (ghost: PublicGhostDeck) => void;
}

export function OfflinePvpDeckDetailOverlay({
  ghost,
  viewerDeckPower,
  canBattle,
  onClose,
  onOpenProfile,
  onChallenge,
}: OfflinePvpDeckDetailOverlayProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const deckPower = useMemo(
    () => computeDeckPower(ghost.deck),
    [ghost.deck],
  );
  const powerDiffers =
    viewerDeckPower != null && deckPower !== viewerDeckPower;

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
            <header className="records-history-detail-header compact-deck-detail-header offline-pvp-detail-header">
              <h2
                id="offline-pvp-detail-title"
                className="offline-pvp-detail-username"
              >
                <button
                  type="button"
                  className="offline-pvp-detail-profile-link"
                  onClick={() => onOpenProfile(ghost)}
                >
                  {ghost.authorName}
                </button>
              </h2>
              <p className="offline-pvp-detail-meta-row">
                <span className="offline-pvp-detail-meta-level">
                  Lv.{ghost.authorLevel}
                </span>
                <span className="offline-pvp-detail-meta-record">
                  {ghost.offlinePvpWins}勝 {ghost.offlinePvpLosses}敗
                </span>
              </p>
              <p className="offline-pvp-detail-power-row">
                <span className="offline-pvp-detail-power">戦力 {deckPower}</span>
                {powerDiffers && (
                  <span className="offline-pvp-rescale-badge">戦力補正あり</span>
                )}
              </p>
              {powerDiffers && (
                <p className="offline-pvp-bp-note">
                  相手カードの BP はあなたのデッキ戦力に合わせて調整されます
                </p>
              )}
            </header>

            <div className="records-history-detail-scroll">
              <ul className="compact-deck-list" aria-label="相手デッキ">
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
