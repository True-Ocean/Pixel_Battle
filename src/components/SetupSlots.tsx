import type { MutableRefObject } from 'react';
import type { Card } from '../types';
import { BattleCard } from './BattleCard';

interface SetupSlotsProps {
  title?: string;
  slots: (Card | null)[];
  side?: 'cpu' | 'player';
  faceDown?: boolean;
  lastPlacedIndex?: number | null;
  interactive?: boolean;
  hideFilled?: boolean;
  className?: string;
  showEmptyPlaceholders?: boolean;
  onSlotClick?: (index: number) => void;
  slotRefs?: MutableRefObject<(HTMLDivElement | null)[]>;
}

export function SetupSlots({
  title = '',
  slots,
  side,
  faceDown = false,
  lastPlacedIndex = null,
  interactive = false,
  hideFilled = false,
  className = '',
  showEmptyPlaceholders = true,
  onSlotClick,
  slotRefs,
}: SetupSlotsProps) {
  return (
    <div
      className={`setup-zone setup-slots-zone ${
        side ? `setup-zone-${side}` : ''
      } ${className}`.trim()}
    >
      {title ? <h2 className="subhead">{title}</h2> : null}
      <div className="setup-slots-row">
        {slots.map((card, i) => (
          <div
            key={card?.id ?? `empty-${i}`}
            ref={(el) => {
              if (slotRefs) slotRefs.current[i] = el;
            }}
            className={`setup-slot ${card ? 'is-filled' : ''} ${
              hideFilled && card ? 'is-source-hidden' : ''
            }`}
            onClick={
              interactive && onSlotClick ? () => onSlotClick(i) : undefined
            }
            onKeyDown={
              interactive && onSlotClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSlotClick(i);
                  }
                : undefined
            }
            role={interactive ? 'button' : undefined}
            tabIndex={interactive && card ? 0 : undefined}
          >
            {card ? (
              <BattleCard
                name={card.name}
                pixels={card.pixels}
                attribute={card.attribute}
                currentHp={card.hp}
                variant="compact"
                fixedSize
                side={side}
                flipEnabled={faceDown}
                faceDown={faceDown}
                hideHp={faceDown}
                slotLabel={`${i + 1}`}
                justPlaced={lastPlacedIndex === i}
              />
            ) : showEmptyPlaceholders ? (
              <div
                className="setup-slot-empty"
                aria-label={`${i + 1}番スロット（空）`}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
