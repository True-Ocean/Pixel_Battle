import { useEffect, useState, type CSSProperties } from 'react';
import { getRarityMeta } from '../config/rarity';
import {
  listPublicGhostDecks,
  type PublicGhostDeck,
} from '../offlinePvp';
import type { Card } from '../types';
import { CardPreview } from './CardPreview';
import { OfflinePvpDeckDetailOverlay } from './OfflinePvpDeckDetailOverlay';

interface OfflinePvpDeckListScreenProps {
  viewerLevel: number;
  excludeOwnerId?: string | null;
  canBattle: boolean;
  onBack: () => void;
  onChallenge: (ghost: PublicGhostDeck) => void;
}

function DeckThumbnails({ cards }: { cards: Card[] }) {
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

export function OfflinePvpDeckListScreen({
  viewerLevel,
  excludeOwnerId = null,
  canBattle,
  onBack,
  onChallenge,
}: OfflinePvpDeckListScreenProps) {
  const [ghosts, setGhosts] = useState<PublicGhostDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicGhostDeck | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void listPublicGhostDecks(viewerLevel, { excludeOwnerId }).then((list) => {
      if (cancelled) return;
      setGhosts(list);
      setLoading(false);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setLoadError(
        error instanceof Error ? error.message : '一覧の取得に失敗しました',
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [viewerLevel, excludeOwnerId]);

  return (
    <section className="screen screen-offline-pvp-list">
      <header className="offline-pvp-list-header">
        <button
          type="button"
          className="offline-pvp-list-back"
          onClick={onBack}
        >
          戻る
        </button>
        <h1 className="offline-pvp-list-title">対人戦（オフライン）</h1>
        <p className="offline-pvp-list-hint muted">
          公開デッキを選んで対戦します。レベルが違う相手はバトル時に戦力補正されます。
        </p>
      </header>

      {loading ? (
        <div className="records-history-empty">
          <p className="muted">公開デッキを読み込み中…</p>
        </div>
      ) : ghosts.length === 0 ? (
        <div className="records-history-empty">
          <p className="muted">公開デッキがありません</p>
          {loadError && (
            <p className="muted records-history-empty-hint">{loadError}</p>
          )}
        </div>
      ) : (
        <ul className="records-history-list offline-pvp-list">
          {ghosts.map((ghost) => {
            const levelDiffers = ghost.authorLevel !== viewerLevel;
            return (
              <li key={ghost.id}>
                <button
                  type="button"
                  className="records-history-item"
                  onClick={() => setSelected(ghost)}
                >
                  <div className="records-history-item-main">
                    <span className="records-history-opponent">
                      <span className="records-history-opponent-name">
                        {ghost.authorName}
                      </span>
                      <span className="records-history-opponent-level">
                        Lv.{ghost.authorLevel}
                      </span>
                    </span>
                    {levelDiffers && (
                      <span className="offline-pvp-rescale-badge">
                        戦力補正あり
                      </span>
                    )}
                  </div>
                  <DeckThumbnails cards={ghost.deck} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <OfflinePvpDeckDetailOverlay
          ghost={selected}
          viewerLevel={viewerLevel}
          canBattle={canBattle}
          onClose={() => setSelected(null)}
          onChallenge={(ghost) => {
            setSelected(null);
            onChallenge(ghost);
          }}
        />
      )}
    </section>
  );
}
