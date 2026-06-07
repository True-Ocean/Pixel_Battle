import type { CSSProperties, MutableRefObject } from 'react';
import type { Card } from '../types';
import { BattleCard } from './BattleCard';
import { SetupDeckPile } from './SetupDeckPile';

interface SetupHandProps {
  slots: (Card | null)[];
  side: 'cpu' | 'player';
  deckSlotIndex: number;
  pileVisible?: boolean;
  pileCount?: number;
  pileShuffling?: boolean;
  faceDown?: boolean;
  flipEnabled?: boolean;
  interactive?: boolean;
  discardingIds?: Set<string>;
  onCardClick?: (handIndex: number) => void;
  slotRefs?: MutableRefObject<(HTMLDivElement | null)[]>;
  pileRef?: MutableRefObject<HTMLDivElement | null>;
  className?: string;
  /** 中央3枚並び（デプロイ・戦闘と同じ間隔） */
  lineupOnly?: boolean;
  /** 空き枠の点線プレースホルダー */
  showEmptyPlaceholders?: boolean;
}

export function SetupHand({
  slots,
  side,
  deckSlotIndex,
  pileVisible = false,
  pileCount = 5,
  pileShuffling = false,
  faceDown = false,
  flipEnabled = false,
  interactive = false,
  discardingIds,
  onCardClick,
  slotRefs,
  pileRef,
  className = '',
  lineupOnly = false,
  showEmptyPlaceholders = true,
}: SetupHandProps) {
  const useFlip = flipEnabled || faceDown;
  const showPileAt = pileVisible;

  return (
    <div
      className={`setup-zone setup-hand-zone setup-zone-${side} setup-hand-${side} ${className}`.trim()}
    >
      <div
        className={`setup-hand setup-hand-${side} ${
          lineupOnly ? 'is-lineup-only' : ''
        }`.trim()}
      >
        {slots.map((card, i) => {
          const isDeckAnchor = i === deckSlotIndex;
          const showPile = showPileAt && isDeckAnchor;

          return (
            <div
              key={`hand-${i}`}
              ref={(el) => {
                if (slotRefs) slotRefs.current[i] = el;
                if (pileRef && isDeckAnchor) pileRef.current = el;
              }}
              className={`setup-hand-slot ${card ? 'has-card' : 'is-empty'} ${
                isDeckAnchor ? 'is-deck-anchor' : ''
              } ${card && discardingIds?.has(card.id) ? 'is-discarding' : ''}`}
              style={{ '--hand-i': i } as CSSProperties}
            >
              {showPile && (
                <div className="setup-deck-anchor">
                  <SetupDeckPile
                    count={pileCount}
                    side={side}
                    shuffling={pileShuffling}
                  />
                </div>
              )}
              {card && (
                <BattleCard
                  name={card.name}
                  pixels={card.pixels}
                  attribute={card.attribute}
                  currentBp={card.bp}
                  variant="compact"
                  handSize
                  side={side}
                  flipEnabled={useFlip}
                  faceDown={faceDown}
                  hideBp={faceDown}
                  interactive={interactive && !faceDown}
                  onClick={
                    interactive && !faceDown && onCardClick
                      ? () => onCardClick(i)
                      : undefined
                  }
                />
              )}
              {!card && !showPile && showEmptyPlaceholders && (
                <div
                  className="setup-hand-empty"
                  aria-label={`手札 ${i + 1}（空）`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
