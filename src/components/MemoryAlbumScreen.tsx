import { useState } from 'react';
import {
  canAffordMemoryAlbumRowUnlock,
  getMemoryAlbumCapacity,
  getMemoryAlbumMaxRows,
  JEWEL_COST_MEMORY_ALBUM_ROW,
  MEMORY_ALBUM_SLOTS_PER_ROW,
} from '../config/economy';
import { getMemoryAlbumHelp } from '../config/helpContent';
import { getRarityMeta } from '../config/rarity';
import type { Card, MemoryAlbumState } from '../types';
import { BattleModeHeader } from './BattleModeHeader';
import { CardPreview } from './CardPreview';
import { HelpPanelModal } from './HelpPanelModal';
import { MemoryAlbumDetailOverlay } from './MemoryAlbumDetailOverlay';
import {
  MemoryAlbumExpandConfirmDialog,
  MemoryAlbumExpandOfferDialog,
} from './MemoryAlbumDialogs';

interface MemoryAlbumScreenProps {
  album: MemoryAlbumState;
  jewels: number;
  onBack: () => void;
  onUnlockRow: () => string | null;
  onDeleteFromAlbum: (cardId: string) => void;
}

function MemoryAlbumTile({
  card,
  onSelect,
}: {
  card: Card;
  onSelect: () => void;
}) {
  const rarityMeta = getRarityMeta(card.rarity);
  return (
    <button
      type="button"
      className={`memory-album-tile memory-album-tile--filled memory-album-tile--${card.rarity}`}
      style={{
        borderColor: rarityMeta.rowBorder,
        background: rarityMeta.rowBg,
      }}
      aria-label={`${card.name}の詳細を見る`}
      onClick={onSelect}
    >
      <CardPreview pixels={card.pixels} />
    </button>
  );
}

function MemoryAlbumEmptyTile() {
  return (
    <div className="memory-album-tile memory-album-tile--empty" aria-hidden />
  );
}

function MemoryAlbumCardRow({
  rowIndex,
  cards,
  onSelectCard,
}: {
  rowIndex: number;
  cards: Card[];
  onSelectCard: (cardId: string) => void;
}) {
  return (
    <div className="memory-album-row">
      {Array.from({ length: MEMORY_ALBUM_SLOTS_PER_ROW }, (_, colIndex) => {
        const slotIndex = rowIndex * MEMORY_ALBUM_SLOTS_PER_ROW + colIndex;
        const card = cards[slotIndex];
        if (card) {
          return (
            <MemoryAlbumTile
              key={card.id}
              card={card}
              onSelect={() => onSelectCard(card.id)}
            />
          );
        }
        return <MemoryAlbumEmptyTile key={`empty-${slotIndex}`} />;
      })}
    </div>
  );
}

function MemoryAlbumExpansionSlot({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={[
        'memory-album-row',
        'memory-album-expansion-row',
        enabled ? '' : 'memory-album-expansion-row--inactive',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="memory-album-row-height-sizer" aria-hidden />
      <button
        type="button"
        className="memory-album-expansion-slot-btn"
        disabled={!enabled}
        onClick={onClick}
        aria-label={`アルバム拡張（${JEWEL_COST_MEMORY_ALBUM_ROW}ジュエル）`}
      >
        <span className="memory-album-expansion-icon" aria-hidden>
          ＋
        </span>
        <span className="memory-album-expansion-label">アルバム拡張</span>
      </button>
    </div>
  );
}

export function MemoryAlbumScreen({
  album,
  jewels,
  onBack,
  onUnlockRow,
  onDeleteFromAlbum,
}: MemoryAlbumScreenProps) {
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [expandOfferOpen, setExpandOfferOpen] = useState(false);
  const [expandConfirmOpen, setExpandConfirmOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const capacity = getMemoryAlbumCapacity(album.unlockedRows);
  const maxRows = getMemoryAlbumMaxRows();
  const canAffordUnlock = canAffordMemoryAlbumRowUnlock({ jewels });
  const albumHelp = getMemoryAlbumHelp();
  const detailCard =
    detailCardId != null
      ? album.cards.find((card) => card.id === detailCardId) ?? null
      : null;

  const closeExpandFlow = () => {
    setExpandOfferOpen(false);
    setExpandConfirmOpen(false);
  };

  const handleConfirmExpand = () => {
    setUnlockError(null);
    const error = onUnlockRow();
    closeExpandFlow();
    if (error) setUnlockError(error);
  };

  return (
    <section className="screen memory-album-screen">
      <header className="memory-album-header">
        <BattleModeHeader
          mode="memoryAlbum"
          onHelp={() => setHelpOpen(true)}
          helpAriaLabel={`${albumHelp.title}のヘルプ`}
        />
        <p className="memory-album-meta muted">
          {album.cards.length} / {capacity} 枚
        </p>
      </header>

      <div className="memory-album-grid-wrap">
        {Array.from({ length: maxRows }, (_, rowIndex) => {
          if (rowIndex < album.unlockedRows) {
            return (
              <MemoryAlbumCardRow
                key={`row-${rowIndex}`}
                rowIndex={rowIndex}
                cards={album.cards}
                onSelectCard={setDetailCardId}
              />
            );
          }

          const isNextExpansion = rowIndex === album.unlockedRows;
          return (
            <MemoryAlbumExpansionSlot
              key={`expand-${rowIndex}`}
              enabled={isNextExpansion}
              onClick={() => {
                if (!isNextExpansion) return;
                setUnlockError(null);
                setExpandConfirmOpen(false);
                setExpandOfferOpen(true);
              }}
            />
          );
        })}
      </div>

      {unlockError && (
        <p className="memory-album-error" role="alert">
          {unlockError}
        </p>
      )}

      <div className="battle-mode-bottom-nav">
        <button type="button" onClick={onBack}>
          マイデッキに戻る
        </button>
      </div>

      <MemoryAlbumExpandOfferDialog
        open={expandOfferOpen && !expandConfirmOpen}
        jewelCost={JEWEL_COST_MEMORY_ALBUM_ROW}
        canAfford={canAffordUnlock}
        onRequestExpand={() => {
          if (!canAffordUnlock) return;
          setExpandConfirmOpen(true);
        }}
        onCancel={closeExpandFlow}
      />

      <MemoryAlbumExpandConfirmDialog
        open={expandConfirmOpen}
        jewelCost={JEWEL_COST_MEMORY_ALBUM_ROW}
        onConfirm={handleConfirmExpand}
        onCancel={closeExpandFlow}
      />

      {helpOpen && (
        <HelpPanelModal
          topic={albumHelp}
          panelClassName="help-panel--categorized"
          onClose={() => setHelpOpen(false)}
        />
      )}

      {detailCard && (
        <MemoryAlbumDetailOverlay
          card={detailCard}
          jewels={jewels}
          onClose={() => setDetailCardId(null)}
          onDelete={() => {
            onDeleteFromAlbum(detailCard.id);
            setDetailCardId(null);
          }}
        />
      )}
    </section>
  );
}
