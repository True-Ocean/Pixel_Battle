import { useEffect, useState } from 'react';
import type { Card } from '../types';
import type { BattleUnit } from '../types/battle';
import { BattleCard } from './BattleCard';
import { clashRectAtCenter, type FlightRects, type LayoutRect } from './flightMeasure';
import { CLASH_OVERLAP_PX, type ClashAnimPhase } from './battleClashTypes';

export type FlightMotion = 'atSlot' | 'atCenter';

interface CardFlightLayerProps {
  rects: FlightRects;
  phase: ClashAnimPhase;
  playerCard: Card;
  cpuCard: Card;
  playerUnit: BattleUnit;
  cpuUnit: BattleUnit;
  hpFromPlayer: number;
  hpFromCpu: number;
  hpToPlayer: number;
  hpToCpu: number;
}

function rectForPhase(
  rects: FlightRects,
  side: 'player' | 'cpu',
  motion: FlightMotion,
): LayoutRect {
  const from = side === 'player' ? rects.playerFrom : rects.cpuFrom;
  if (motion === 'atSlot') return from;
  return clashRectAtCenter(
    from,
    rects.cpuCenter,
    rects.playerCenter,
    side,
    CLASH_OVERLAP_PX,
  );
}

export function CardFlightLayer({
  rects,
  phase,
  playerCard,
  cpuCard,
  playerUnit,
  cpuUnit,
  hpFromPlayer,
  hpFromCpu,
  hpToPlayer,
  hpToCpu,
}: CardFlightLayerProps) {
  const [motion, setMotion] = useState<FlightMotion>('atSlot');
  const [impact, setImpact] = useState(false);

  useEffect(() => {
    if (phase === 'enter') {
      setMotion('atSlot');
      setImpact(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMotion('atCenter'));
      });
      return () => cancelAnimationFrame(id);
    }

    if (phase === 'impact') {
      setMotion('atCenter');
      setImpact(true);
      return;
    }

    if (phase === 'hp') {
      setMotion('atCenter');
      setImpact(false);
      return;
    }

    if (phase === 'exit') {
      setMotion('atCenter');
      setImpact(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMotion('atSlot'));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [phase]);

  const showHpAnim = phase === 'hp';
  const cpuRect = rectForPhase(rects, 'cpu', motion);
  const playerRect = rectForPhase(rects, 'player', motion);

  const cpuClash = rectForPhase(rects, 'cpu', 'atCenter');
  const playerClash = rectForPhase(rects, 'player', 'atCenter');
  const clashCenter = {
    left:
      (cpuClash.left +
        cpuClash.width / 2 +
        playerClash.left +
        playerClash.width / 2) /
      2,
    top:
      (cpuClash.top +
        cpuClash.height / 2 +
        playerClash.top +
        playerClash.height / 2) /
      2,
  };

  return (
    <div className={`card-flight-layer ${impact ? 'is-impact' : ''}`}>
      <FlyingCard
        rect={cpuRect}
        card={cpuCard}
        unit={cpuUnit}
        hpFrom={hpFromCpu}
        hpTo={hpToCpu}
        showHpAnim={showHpAnim}
        side="cpu"
        hasShield={cpuUnit.hasShield}
        phase={phase}
      />
      <FlyingCard
        rect={playerRect}
        card={playerCard}
        unit={playerUnit}
        hpFrom={hpFromPlayer}
        hpTo={hpToPlayer}
        showHpAnim={showHpAnim}
        side="player"
        hasShield={playerUnit.hasShield}
        phase={phase}
      />
      {impact && (
        <div
          className="clash-flash clash-flash-flying"
          style={{ left: clashCenter.left, top: clashCenter.top }}
          aria-hidden
        />
      )}
    </div>
  );
}

function FlyingCard({
  rect,
  card,
  unit,
  hpFrom,
  hpTo,
  showHpAnim,
  side,
  hasShield,
  phase,
}: {
  rect: LayoutRect;
  card: Card;
  unit: BattleUnit;
  hpFrom: number;
  hpTo: number;
  showHpAnim: boolean;
  side: 'player' | 'cpu';
  hasShield: boolean;
  phase: ClashAnimPhase;
}) {
  const displayHp = phase === 'exit' ? hpTo : hpFrom;
  return (
    <div
      className={`flight-card flight-card-${side}`}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
      }}
    >
      <BattleCard
        name={unit.name}
        pixels={card.pixels}
        attribute={unit.attribute}
        currentHp={displayHp}
        variant="board"
        side={side}
        hasShield={hasShield}
        defenseShieldUsed={unit.defenseShieldUsed}
        animatedHp={
          showHpAnim ? { from: hpFrom, to: hpTo, active: true } : undefined
        }
      />
    </div>
  );
}
