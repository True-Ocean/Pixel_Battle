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

  // 飛行対象・座標・flipReveal が変わったら、レンダー中に初期位置へ戻す。
  // rAF で終点へ動かす一段目だけ effect に任せる。
  const flightKey = `${card.id}\u0000${from.left}\u0000${from.top}\u0000${from.width}\u0000${from.height}\u0000${to.left}\u0000${to.top}\u0000${to.width}\u0000${to.height}\u0000${flipReveal}`;
  const [prevFlightKey, setPrevFlightKey] = useState(flightKey);
  if (flightKey !== prevFlightKey) {
    setPrevFlightKey(flightKey);
    setAtEnd(false);
    setRevealed(false);
  }

  useEffect(() => {
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
