import { useEffect, useState, type CSSProperties } from 'react';
import type { Card } from '../types';
import type { CardBackSide } from './CardBack';
import { BattleCard } from './BattleCard';
import type { LayoutRect } from './flightMeasure';
import { SETUP_MS } from './setupConstants';

interface SetupFlightLayerProps {
  card: Card;
  from: LayoutRect;
  to: LayoutRect;
  faceDown?: boolean;
  side?: CardBackSide;
  /** 裏向きで飛び、途中で表に返す（自分の配り） */
  flipReveal?: boolean;
  onComplete?: () => void;
}

function flightCardStyle(rect: LayoutRect): CSSProperties {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function SetupFlightLayer({
  card,
  from,
  to,
  faceDown = false,
  side,
  flipReveal = false,
  onComplete,
}: SetupFlightLayerProps) {
  const [atEnd, setAtEnd] = useState(false);
  /** flipReveal 時のみ表にめくる（相手は常に裏のまま） */
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setAtEnd(false);
    setRevealed(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAtEnd(true));
    });
    return () => cancelAnimationFrame(id);
  }, [card.id, from.left, from.top, from.width, from.height, to.left, to.top, to.width, to.height, flipReveal]);

  useEffect(() => {
    if (!flipReveal || !atEnd) return;
    const t = window.setTimeout(
      () => setRevealed(true),
      SETUP_MS.dealFlipReveal,
    );
    return () => window.clearTimeout(t);
  }, [flipReveal, atEnd]);

  useEffect(() => {
    if (!atEnd) return;
    if (flipReveal && !revealed) return;
    const t = window.setTimeout(() => onComplete?.(), SETUP_MS.dealCardMove);
    return () => window.clearTimeout(t);
  }, [atEnd, revealed, flipReveal, onComplete]);

  const rect = atEnd ? to : from;
  const showFaceDown = faceDown && (flipReveal ? !revealed : true);

  return (
    <div className="setup-flight-stage" aria-hidden>
      <div
        className={`setup-flight-card ${flipReveal ? 'is-flip-reveal' : ''} ${
          revealed ? 'is-revealed' : ''
        }`}
        style={flightCardStyle(rect)}
      >
        <BattleCard
          name={card.name}
          pixels={card.pixels}
          attribute={card.attribute}
          currentBp={card.bp}
          variant="compact"
          fixedSize
          side={side}
          rarity={card.rarity}
          flipEnabled={showFaceDown || flipReveal}
          faceDown={showFaceDown}
          hideBp={showFaceDown}
        />
      </div>
    </div>
  );
}
