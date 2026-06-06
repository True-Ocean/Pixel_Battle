import { useEffect, useState, type CSSProperties } from 'react';
import type { Card } from '../types';
import type { CardBackSide } from './CardBack';
import { BattleCard } from './BattleCard';
import type { LayoutRect } from './flightMeasure';
import { SETUP_MS } from './setupConstants';

export interface DeployFlight {
  id: string;
  card: Card;
  from: LayoutRect;
  /** 縦移動量（to.top - from.top）。横は from のまま */
  translateY: number;
  faceDown?: boolean;
  side?: CardBackSide;
}

interface SetupDeployLayerProps {
  flights: DeployFlight[];
  onAllComplete?: () => void;
}

function flightCardStyle(rect: LayoutRect): CSSProperties {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function SetupDeployLayer({
  flights,
  onAllComplete,
}: SetupDeployLayerProps) {
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAtEnd(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!atEnd) return;
    const t = window.setTimeout(
      () => onAllComplete?.(),
      SETUP_MS.deploySlide + 40,
    );
    return () => window.clearTimeout(t);
  }, [atEnd, onAllComplete]);

  return (
    <div className="setup-flight-stage" aria-hidden>
      {flights.map((f) => {
        const base = flightCardStyle(f.from);
        return (
          <div
            key={f.id}
            className="setup-flight-card setup-deploy-slide-card"
            style={{
              ...base,
              transform: atEnd
                ? `translateY(${f.translateY}px)`
                : 'translateY(0)',
            }}
          >
            <BattleCard
              name={f.card.name}
              pixels={f.card.pixels}
              attribute={f.card.attribute}
              currentHp={f.card.hp}
              variant="compact"
              fixedSize
              side={f.side}
              flipEnabled={f.faceDown}
              faceDown={f.faceDown}
              hideHp={f.faceDown}
            />
          </div>
        );
      })}
    </div>
  );
}
