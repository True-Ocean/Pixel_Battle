import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  calcGraveyardPixelReward,
  calcLostSelectionWeight,
  pickWeightedLostCard,
} from '../config/economy';
import type { Card } from '../types';
import { CardPreview } from './CardPreview';

interface LostRouletteModalProps {
  cards: Card[];
  onComplete: (card: Card) => void;
}

const SPIN_MS = 80;
const SPIN_SLOW_MS = 160;
const SPIN_TICKS = 24;

export function LostRouletteModal({ cards, onComplete }: LostRouletteModalProps) {
  const winner = useMemo(() => pickWeightedLostCard(cards), [cards]);
  const [phase, setPhase] = useState<'spinning' | 'result'>('spinning');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const tickRef = useRef(0);

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

  useEffect(() => {
    if (phase !== 'spinning' || cards.length === 0) return;

    const winnerIndex = cards.findIndex((card) => card.id === winner.id);
    const targetIndex = winnerIndex >= 0 ? winnerIndex : 0;
    tickRef.current = 0;

    const interval = window.setInterval(() => {
      tickRef.current += 1;
      const remaining = SPIN_TICKS - tickRef.current;
      if (remaining <= 0) {
        setHighlightIndex(targetIndex);
        setPhase('result');
        window.clearInterval(interval);
        return;
      }
      if (remaining <= 4) {
        setHighlightIndex(targetIndex);
        return;
      }
      setHighlightIndex((prev) => (prev + 1) % cards.length);
    }, tickRef.current > SPIN_TICKS - 6 ? SPIN_SLOW_MS : SPIN_MS);

    return () => window.clearInterval(interval);
  }, [cards, phase, winner.id]);

  const highlighted = cards[highlightIndex] ?? winner;

  return createPortal(
    <div className="lost-roulette-backdrop">
      <div
        className="lost-roulette-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lost-roulette-title"
      >
        <h2 id="lost-roulette-title" className="lost-roulette-title">
          {phase === 'spinning' ? 'ロスト対象を抽選中…' : 'ロスト！'}
        </h2>

        <ul className="lost-roulette-list">
          {cards.map((card) => {
            const isActive = card.id === highlighted.id;
            const reward = calcGraveyardPixelReward(card);
            const weight = Math.round(calcLostSelectionWeight(card));
            return (
              <li
                key={card.id}
                className={`lost-roulette-item${isActive ? ' is-active' : ''}`}
              >
                <CardPreview pixels={card.pixels} />
                <span className="lost-roulette-name">{card.name}</span>
                <span className="lost-roulette-meta">
                  +{reward}px
                  <span className="lost-roulette-weight">W{weight}</span>
                </span>
              </li>
            );
          })}
        </ul>

        {phase === 'result' && (
          <p className="lost-roulette-result">
            <strong>{winner.name}</strong> をロストしました！
          </p>
        )}

        <button
          type="button"
          className="lost-roulette-confirm"
          disabled={phase !== 'result'}
          onClick={() => onComplete(winner)}
        >
          {phase === 'result' ? 'OK' : '抽選中…'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
