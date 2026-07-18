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
  bpFromPlayer: number;
  bpFromCpu: number;
  bpToPlayer: number;
  bpToCpu: number;
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
  bpFromPlayer,
  bpFromCpu,
  bpToPlayer,
  bpToCpu,
}: CardFlightLayerProps) {
  const [motion, setMotion] = useState<FlightMotion>(
    phase === 'enter' ? 'atSlot' : 'atCenter',
  );
  const [impact, setImpact] = useState(phase === 'impact');

  // phase が変わったら、その phase の初期表示をレンダー中に同期する。
  // enter/exit の 2 段階アニメーションだけを effect の rAF に任せる。
  const [prevPhase, setPrevPhase] = useState(phase);
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    setMotion(phase === 'enter' ? 'atSlot' : 'atCenter');
    setImpact(phase === 'impact');
  }

  useEffect(() => {
    if (phase === 'enter') {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMotion('atCenter'));
      });
      return () => cancelAnimationFrame(id);
    }

    if (phase === 'exit') {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMotion('atSlot'));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [phase]);

  const showBpAnim = phase === 'bp';
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
        bpFrom={bpFromCpu}
        bpTo={bpToCpu}
        showBpAnim={showBpAnim}
        side="cpu"
        hasShield={cpuUnit.hasShield}
        phase={phase}
      />
      <FlyingCard
        rect={playerRect}
        card={playerCard}
        unit={playerUnit}
        bpFrom={bpFromPlayer}
        bpTo={bpToPlayer}
        showBpAnim={showBpAnim}
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
  bpFrom,
  bpTo,
  showBpAnim,
  side,
  hasShield,
  phase,
}: {
  rect: LayoutRect;
  card: Card;
  unit: BattleUnit;
  bpFrom: number;
  bpTo: number;
  showBpAnim: boolean;
  side: 'player' | 'cpu';
  hasShield: boolean;
  phase: ClashAnimPhase;
}) {
  const displayBp = phase === 'exit' ? bpTo : bpFrom;
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
        currentBp={displayBp}
        maxBp={unit.maxBp}
        variant="board"
        side={side}
        rarity={card.rarity}
        hasShield={hasShield}
        defenseShieldUsed={unit.defenseShieldUsed}
        animatedBp={
          showBpAnim ? { from: bpFrom, to: bpTo, active: true } : undefined
        }
      />
    </div>
  );
}
