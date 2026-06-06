import type { CSSProperties } from 'react';
import { CardBack, type CardBackSide } from './CardBack';

interface SetupDeckPileProps {
  count: number;
  side: CardBackSide;
  shuffling?: boolean;
}

/** 裏向きの5枚デッキ（手札スロットと同サイズ・同裏面） */
export function SetupDeckPile({
  count,
  side,
  shuffling = false,
}: SetupDeckPileProps) {
  const layers = Math.min(Math.max(count, 1), 5);

  return (
    <div
      className={`setup-deck-pile-stack ${shuffling ? 'is-shuffling' : ''}`}
      aria-hidden
    >
      {Array.from({ length: layers }, (_, i) => (
        <div
          key={i}
          className="setup-deck-pile-layer"
          style={{ '--layer-i': i } as CSSProperties}
        >
          <CardBack side={side} />
        </div>
      ))}
      <span className="setup-deck-pile-label">{count}</span>
    </div>
  );
}
