import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  calcGraveyardPixelReward,
  calcSurvivorPixels,
} from '../config/economy';
import type { Card } from '../types';
import { CardPreview } from './CardPreview';

interface GraveyardPickModalProps {
  survivorCards: Card[];
  graveyardCards: Card[];
  expGain: number;
  onPick: (card: Card) => void;
}

export function GraveyardPickModal({
  survivorCards,
  graveyardCards,
  expGain,
  onPick,
}: GraveyardPickModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selected = graveyardCards.find((card) => card.id === selectedId) ?? null;
  const survivorPixels = calcSurvivorPixels(survivorCards.length);
  const graveyardPixels = selected ? calcGraveyardPixelReward(selected) : 0;
  const totalPixels = survivorPixels + graveyardPixels;

  return createPortal(
    <div className="graveyard-pick-backdrop">
      <div
        className="graveyard-pick-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="graveyard-pick-title"
      >
        <h2 id="graveyard-pick-title" className="graveyard-pick-title">
          バトル報酬
        </h2>

        {survivorCards.length > 0 && (
          <section className="graveyard-pick-section" aria-labelledby="graveyard-pick-survivor">
            <h3 id="graveyard-pick-survivor" className="graveyard-pick-section-title">
              生存報酬（確定）
            </h3>
            <div className="graveyard-pick-survivor-row">
              <ul className="graveyard-pick-survivor-icons" aria-label="生存カード">
                {survivorCards.map((card) => (
                  <li key={card.id} className="graveyard-pick-survivor-icon">
                    <CardPreview pixels={card.pixels} />
                  </li>
                ))}
              </ul>
              <span className="graveyard-pick-survivor-total">
                +{survivorPixels.toLocaleString()}px
              </span>
            </div>
          </section>
        )}

        <section className="graveyard-pick-section" aria-labelledby="graveyard-pick-loot">
          <h3 id="graveyard-pick-loot" className="graveyard-pick-section-title">
            戦利品（1枚選ぶ）
          </h3>
          <ul className="graveyard-pick-list">
            {graveyardCards.map((card) => {
              const reward = calcGraveyardPixelReward(card);
              const isSelected = card.id === selectedId;
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    className={`graveyard-pick-card${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedId(card.id)}
                    aria-pressed={isSelected}
                  >
                    <CardPreview pixels={card.pixels} />
                    <span className="graveyard-pick-card-name">{card.name}</span>
                    <span className="graveyard-pick-card-reward">+{reward}px</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <button
          type="button"
          className="graveyard-pick-confirm"
          disabled={selected == null}
          onClick={() => {
            if (selected) onPick(selected);
          }}
        >
          {selected
            ? `報酬 +${totalPixels.toLocaleString()}px / +${expGain.toLocaleString()}EXP ゲット！`
            : '戦利品を選んでください'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
