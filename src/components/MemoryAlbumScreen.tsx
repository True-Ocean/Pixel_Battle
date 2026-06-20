import { useState } from 'react';
import {
  canAffordMemoryAlbumRowUnlock,
  getMemoryAlbumCapacity,
  JEWEL_COST_MEMORY_ALBUM_ROW,
  MEMORY_ALBUM_SLOTS_PER_ROW,
} from '../config/economy';
import { getRarityMeta } from '../config/rarity';
import type { Card, MemoryAlbumState } from '../types';
import { CardPreview } from './CardPreview';
import { MemoryAlbumDetailOverlay } from './MemoryAlbumDetailOverlay';
import { JewelAmount } from './JewelIcon';

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

function MemoryAlbumEmptyTile({ locked }: { locked: boolean }) {
  return (
    <div
      className={`memory-album-tile memory-album-tile--empty${
        locked ? ' memory-album-tile--locked' : ''
      }`}
      aria-hidden
    />
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

  const capacity = getMemoryAlbumCapacity(album.unlockedRows);
  const isFull = album.cards.length >= capacity;
  const canUnlock = canAffordMemoryAlbumRowUnlock({ jewels });
  const detailCard =
    detailCardId != null
      ? album.cards.find((card) => card.id === detailCardId) ?? null
      : null;

  const handleUnlockRow = () => {
    setUnlockError(null);
    const error = onUnlockRow();
    if (error) setUnlockError(error);
  };

  return (
    <section className="screen memory-album-screen">
      <header className="memory-album-header">
        <button type="button" className="memory-album-back" onClick={onBack}>
          マイデッキに戻る
        </button>
        <h1>思い出アルバム</h1>
        <p className="memory-album-meta muted">
          {album.cards.length} / {capacity} 枚
        </p>
      </header>

      <div className="memory-album-grid-wrap">
        {Array.from({ length: album.unlockedRows }, (_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="memory-album-row">
            {Array.from({ length: MEMORY_ALBUM_SLOTS_PER_ROW }, (_, colIndex) => {
              const slotIndex = rowIndex * MEMORY_ALBUM_SLOTS_PER_ROW + colIndex;
              const card = album.cards[slotIndex];
              if (card) {
                return (
                  <MemoryAlbumTile
                    key={card.id}
                    card={card}
                    onSelect={() => setDetailCardId(card.id)}
                  />
                );
              }
              return <MemoryAlbumEmptyTile key={`empty-${slotIndex}`} locked={false} />;
            })}
          </div>
        ))}

        {isFull && (
          <div className="memory-album-row memory-album-row--unlock">
            {Array.from({ length: MEMORY_ALBUM_SLOTS_PER_ROW }, (_, index) => (
              <MemoryAlbumEmptyTile key={`unlock-slot-${index}`} locked />
            ))}
            <button
              type="button"
              className={`memory-album-row-unlock-btn${
                canUnlock ? '' : ' memory-album-row-unlock-btn--pending'
              }`}
              disabled={!canUnlock}
              onClick={handleUnlockRow}
            >
              <span>行を解放</span>
              <JewelAmount
                amount={JEWEL_COST_MEMORY_ALBUM_ROW}
                className="memory-album-row-unlock-jewel"
                iconClassName="memory-album-row-unlock-jewel-icon"
              />
            </button>
          </div>
        )}
      </div>

      {unlockError && (
        <p className="memory-album-error" role="alert">
          {unlockError}
        </p>
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
