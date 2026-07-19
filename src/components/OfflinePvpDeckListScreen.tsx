import { useEffect, useState, type CSSProperties } from 'react';
import { computeDeckPower } from '../card';
import { getOfflinePvpModeHelp } from '../config/helpContent';
import { getRarityMeta } from '../config/rarity';
import {
  getPublicGhostDeckListEmptyMessage,
  listPublicGhostDecks,
  type PublicGhostDeck,
} from '../offlinePvp';
import type { Card } from '../types';
import { CardPreview } from './CardPreview';
import { HelpPanelModal } from './HelpPanelModal';
import { BattleModeHeader } from './BattleModeHeader';
import { OfflinePvpDeckDetailOverlay } from './OfflinePvpDeckDetailOverlay';

interface OfflinePvpDeckListScreenProps {
  viewerLevel: number;
  /** 出撃デッキ確定前の参考戦力。相手戦力と差があるとき「戦力補正あり」を表示 */
  viewerDeckPower: number | null;
  excludeOwnerId?: string | null;
  canBattle: boolean;
  onBack: () => void;
  onOpenProfile: (ghost: PublicGhostDeck) => void;
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
  viewerDeckPower,
  excludeOwnerId = null,
  canBattle,
  onBack,
  onOpenProfile,
  onChallenge,
}: OfflinePvpDeckListScreenProps) {
  const [ghosts, setGhosts] = useState<PublicGhostDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [emptyTitle, setEmptyTitle] = useState('公開デッキがありません');
  const [emptyHint, setEmptyHint] = useState<string | undefined>();
  const [selected, setSelected] = useState<PublicGhostDeck | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const modeHelp = getOfflinePvpModeHelp();

  const fetchKey = `${viewerLevel}\u0000${excludeOwnerId ?? ''}`;
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey);
  if (fetchKey !== prevFetchKey) {
    setPrevFetchKey(fetchKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    void listPublicGhostDecks(viewerLevel, { excludeOwnerId }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setGhosts(result.decks);
        const empty = getPublicGhostDeckListEmptyMessage(result);
        setEmptyTitle(empty.title);
        setEmptyHint(empty.hint);
      } else {
        setGhosts([]);
        const empty = getPublicGhostDeckListEmptyMessage(result);
        setEmptyTitle(empty.title);
        setEmptyHint(empty.hint);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [viewerLevel, excludeOwnerId]);

  return (
    <section className="screen screen-offline-pvp-list">
      <header className="offline-pvp-list-header">
        <BattleModeHeader
          mode="offlinePvp"
          onHelp={() => setHelpOpen(true)}
          helpAriaLabel={`${modeHelp.title}のヘルプ`}
        />
        <div className="battle-deck-select-subheader">
          <h2>対戦デッキ選択</h2>
          <div className="battle-deck-select-subheader-guide" role="note">
            <p>対戦したいデッキをタップ</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="records-history-empty">
          <p className="muted">公開デッキを読み込み中…</p>
        </div>
      ) : ghosts.length === 0 ? (
        <div className="records-history-empty">
          <p className="muted">{emptyTitle}</p>
          {emptyHint && (
            <p className="muted records-history-empty-hint">{emptyHint}</p>
          )}
        </div>
      ) : (
        <ul className="records-history-list offline-pvp-list">
          {ghosts.map((ghost) => {
            const deckPower = computeDeckPower(ghost.deck);
            const powerDiffers =
              viewerDeckPower != null && deckPower !== viewerDeckPower;
            return (
              <li key={ghost.id}>
                <button
                  type="button"
                  className="records-history-item offline-pvp-list-item"
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
                    <span className="offline-pvp-list-power-row">
                      <span className="offline-pvp-list-power">
                        戦力 {deckPower}
                      </span>
                      {powerDiffers && (
                        <span className="offline-pvp-rescale-badge">
                          戦力補正あり
                        </span>
                      )}
                    </span>
                  </div>
                  <DeckThumbnails cards={ghost.deck} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="battle-mode-bottom-nav">
        <button type="button" onClick={onBack}>
          バトルモード選択画面に戻る
        </button>
      </div>

      {selected && (
        <OfflinePvpDeckDetailOverlay
          ghost={selected}
          viewerDeckPower={viewerDeckPower}
          canBattle={canBattle}
          onClose={() => setSelected(null)}
          onOpenProfile={(ghost) => {
            setSelected(null);
            onOpenProfile(ghost);
          }}
          onChallenge={(ghost) => {
            setSelected(null);
            onChallenge(ghost);
          }}
        />
      )}
      {helpOpen && (
        <HelpPanelModal topic={modeHelp} onClose={() => setHelpOpen(false)} />
      )}
    </section>
  );
}
