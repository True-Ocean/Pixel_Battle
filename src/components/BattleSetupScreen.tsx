import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CPU_OPPONENT_LEVEL, DECK_MAX, SETUP_TIME_LIMIT_SEC } from '../config/balance';
import { computeDeckPower } from '../card';
import type { Card, BattleOutcome } from '../types';
import type { BoardPosition } from '../types/battle';
import {
  BACK_POSITIONS,
  BOARD_POSITIONS,
  FRONT_POSITIONS,
  getDefeated,
  getHealTargets,
  getMeleeTargets,
  getSelectionTurn,
  getUnitAt,
  isFrozen,
} from '../game';
import { sumPoisonDotDamage } from '../game/poisonCombat';
import type { BattleUnit } from '../types/battle';
import { BattleCard } from './BattleCard';
import { SetupFlightLayer } from './SetupFlightLayer';
import { SETUP_MS } from './setupConstants';
import { relRect } from './setupMeasure';
import type { LayoutRect } from './flightMeasure';
import { useBattle } from './useBattle';

type SlotKey = `${'cpu' | 'player'}:${BoardPosition}`;

interface ArrowLine {
  key: string;
  kind: 'attack' | 'attack-secondary' | 'shield' | 'heal';
  fromSide: 'cpu' | 'player';
  fromPosition: BoardPosition;
  toSide: 'cpu' | 'player';
  toPosition: BoardPosition;
  bidirectional?: boolean;
}

function formatBattleGuideLine(
  turnLabel: string | null,
  hint: string | null,
  result: 'player' | 'cpu' | null,
): string {
  if (result) {
    return turnLabel ? `${turnLabel}：バトル終了！` : 'バトル終了！';
  }
  if (!hint) return 'バトル';
  return turnLabel ? `${turnLabel}：${hint}` : `バトル：${hint}`;
}

function FormationZoneOutcome({
  battleResult,
  side,
}: {
  battleResult: 'player' | 'cpu';
  side: 'cpu' | 'player';
}) {
  const kind = battleResult === side ? 'win' : 'lose';
  return (
    <div
      className={`battle-zone-outcome battle-zone-outcome-${kind}`}
      role="status"
      aria-label={kind === 'win' ? '勝利' : '敗北'}
    >
      {kind === 'win' ? 'WIN' : 'LOSE'}
    </div>
  );
}

interface DamageMarker {
  key: string;
  side: 'cpu' | 'player';
  position: BoardPosition;
  label: string;
  kind?: 'attack' | 'poison' | 'heal';
}

function FormationZoneBanner({
  identity,
  side,
}: {
  identity: BattleZoneIdentity;
  side: 'cpu' | 'player';
}) {
  return (
    <div className={`formation-zone-banner formation-zone-banner-${side}`}>
      <span className="formation-zone-banner-name">{identity.name}</span>
      <span className="formation-zone-banner-level">Lv.{identity.level}</span>
      <span className="formation-zone-banner-power">戦力 {identity.power}</span>
    </div>
  );
}

interface BattleZoneProfile {
  name: string;
  level: number;
}

interface BattleZoneIdentity extends BattleZoneProfile {
  power: number;
}

interface BattleSetupScreenProps {
  playerDeck: Card[];
  cpuDeck: Card[];
  playerIdentity?: BattleZoneProfile;
  opponentIdentity?: BattleZoneProfile;
  onFinish: (outcome: BattleOutcome) => void;
  onGoToDeck: () => void;
  onNewBattle: () => void;
}

type SelectedSetupCard =
  | { source: 'hand'; index: number }
  | { source: 'slot'; position: BoardPosition };

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function randomFormation(cards: Card[]): Record<BoardPosition, Card | null> {
  const shuffled = shuffle(cards);
  return BOARD_POSITIONS.reduce(
    (acc, position, index) => {
      acc[position] = shuffled[index] ?? null;
      return acc;
    },
    {} as Record<BoardPosition, Card | null>,
  );
}

function orderedCards(slots: Record<BoardPosition, Card | null>): Card[] {
  return BOARD_POSITIONS.map((position) => slots[position]).filter(
    (card): card is Card => card != null,
  );
}

function getPoisonDotSlotFx(
  turnStart: ReturnType<typeof useBattle>['turnStartPlayback'],
  side: 'cpu' | 'player',
  position: BoardPosition,
) {
  if (!turnStart || turnStart.poisonSubPhase !== 'bp') {
    return null;
  }
  const dot = turnStart.poisonDots.find(
    (d) => d.side === side && d.position === position,
  );
  if (!dot) return null;
  return {
    animatedBp: { from: dot.bpFrom, to: dot.bpTo, active: true as const },
  };
}

function resolveStormHitDisplay(
  battle: ReturnType<typeof useBattle>,
  side: 'cpu' | 'player',
  position: BoardPosition,
): boolean {
  const playback = battle.playback;
  if (playback?.phase !== 'attack') return false;
  const attack = playback.attacks[playback.attackIndex];
  if (attack?.kind !== 'storm') return false;
  if (attack.toSide === side && attack.toPosition === position) return true;
  return (
    attack.secondaryToPosition != null &&
    attack.toSide === side &&
    attack.secondaryToPosition === position
  );
}

function resolveFrozenDisplay(
  unit: BattleUnit,
  battle: ReturnType<typeof useBattle>,
  side: 'cpu' | 'player',
  position: BoardPosition,
): { frozen: boolean; justApplied: boolean } {
  const playback = battle.playback;
  if (playback?.phase === 'attack' && playback.attackSubPhase === 'bp') {
    const attack = playback.attacks[playback.attackIndex];
    const isIceTarget =
      attack?.iceGranted &&
      attack.toSide === side &&
      attack.toPosition === position;
    const isIceCounterTarget =
      attack?.iceCounterGranted &&
      attack.fromSide === side &&
      attack.fromPosition === position;
    if (isIceTarget || isIceCounterTarget) {
      const field =
        side === 'player' ? attack.stateAfter.player : attack.stateAfter.cpu;
      const after = getUnitAt(field, position);
      if (after?.frozenUntilTurn != null) {
        return { frozen: true, justApplied: true };
      }
    }
  }
  return {
    frozen: isFrozen(unit, getSelectionTurn(battle.state)),
    justApplied: false,
  };
}

function resolvePoisonDisplay(
  unit: BattleUnit,
  battle: ReturnType<typeof useBattle>,
  side: 'cpu' | 'player',
  position: BoardPosition,
) {
  const playback = battle.playback;
  if (playback?.phase === 'heal') {
    const heal = playback.heals.find(
      (h) => h.side === side && h.toPosition === position,
    );
    if (heal && heal.poisonStacksCleared > 0 && playback.healSubPhase === 'bp') {
      return { count: 0, damagePerTurn: 0, justApplied: false };
    }
  }
  if (playback?.phase === 'attack') {
    const attack = playback.attacks[playback.attackIndex];
    if (attack) {
      const isPoisonTarget =
        attack.poisonGranted &&
        attack.toSide === side &&
        attack.toPosition === position;
      const isPoisonCounterTarget =
        attack.poisonCounterGranted &&
        attack.fromSide === side &&
        attack.fromPosition === position;
      if (isPoisonTarget || isPoisonCounterTarget) {
        const field =
          side === 'player'
            ? attack.stateAfter.player
            : attack.stateAfter.cpu;
        const after = getUnitAt(field, position);
        if (after && after.poisonStacks.length > 0) {
          return {
            count: after.poisonStacks.length,
            damagePerTurn: sumPoisonDotDamage(after.poisonStacks),
            justApplied: true,
          };
        }
      }
    }
  }

  return {
    count: unit.poisonStacks.length,
    damagePerTurn: sumPoisonDotDamage(unit.poisonStacks),
    justApplied: false,
  };
}

function getHealSlotFx(
  playback: ReturnType<typeof useBattle>['playback'],
  side: 'cpu' | 'player',
  position: BoardPosition,
) {
  if (!playback || playback.phase !== 'heal') return null;
  const heal = playback.heals[0];
  if (!heal || heal.side !== side || heal.toPosition !== position) return null;
  const isTarget = heal.side === side && heal.toPosition === position;
  if (!isTarget) return null;
  return {
    animatedBp:
      playback.healSubPhase === 'bp' && heal.amount > 0
        ? { from: heal.bpFrom, to: heal.bpTo, active: true as const }
        : undefined,
    sparkle: true,
  };
}

function getAttackSlotFx(
  playback: ReturnType<typeof useBattle>['playback'],
  side: 'cpu' | 'player',
  position: BoardPosition,
) {
  if (!playback || playback.phase !== 'attack') return null;
  const attack = playback.attacks[playback.attackIndex];
  if (!attack) return null;

  const isAttacker =
    attack.fromSide === side && attack.fromPosition === position;
  const isTarget = attack.toSide === side && attack.toPosition === position;
  const isSecondaryTarget =
    (attack.kind === 'dual' || attack.kind === 'storm') &&
    attack.secondaryToPosition != null &&
    attack.toSide === side &&
    attack.secondaryToPosition === position;
  if (!isAttacker && !isTarget && !isSecondaryTarget) return null;

  const bpFrom = isAttacker
    ? attack.attackerBpFrom
    : isSecondaryTarget
      ? (attack.secondaryBpFrom ?? 0)
      : attack.bpFrom;
  const bpTo = isAttacker
    ? attack.attackerBpTo
    : isSecondaryTarget
      ? (attack.secondaryBpTo ?? 0)
      : attack.bpTo;

  return {
    animatedBp:
      playback.attackSubPhase === 'bp'
        ? { from: bpFrom, to: bpTo, active: true as const }
        : undefined,
  };
}

function TinyCard({
  card,
  side,
  faceDown = false,
  selected = false,
  defeated = false,
  hidden = false,
  cardRef,
  onClick,
}: {
  card: Card;
  side: 'cpu' | 'player';
  faceDown?: boolean;
  selected?: boolean;
  defeated?: boolean;
  hidden?: boolean;
  cardRef?: (el: HTMLButtonElement | null) => void;
  onClick?: () => void;
}) {
  return (
    <button
      ref={cardRef}
      type="button"
      className={`formation-tiny-card ${selected ? 'is-selected' : ''} ${
        defeated ? 'is-defeated' : ''
      } ${hidden ? 'is-deploy-source-hidden' : ''}`}
      onClick={onClick}
      disabled={!onClick}
      aria-label={faceDown ? '裏向きのカード' : card.name}
    >
      <BattleCard
        name={card.name}
        pixels={card.pixels}
        attribute={card.attribute}
        currentBp={card.bp}
        variant="compact"
        fixedSize
        flipEnabled
        side={side}
        faceDown={faceDown}
        hideBp={faceDown}
        dead={defeated}
      />
    </button>
  );
}

function SetupSlot({
  card,
  position,
  side,
  selected,
  valid,
  hideFrame = false,
  faceDown = false,
  slotRef,
  onClick,
}: {
  card: Card | null;
  position: BoardPosition;
  side: 'cpu' | 'player';
  selected?: boolean;
  valid?: boolean;
  hideFrame?: boolean;
  faceDown?: boolean;
  slotRef?: (el: HTMLButtonElement | null) => void;
  onClick?: () => void;
}) {
  return (
    <button
      ref={slotRef}
      type="button"
      className={`formation-slot formation-slot-${position} ${
        card ? 'has-card' : ''
      } ${hideFrame && card ? 'is-frameless' : ''} ${
        selected ? 'is-selected' : ''
      } ${valid ? 'is-valid' : ''}`}
      onClick={onClick}
      aria-label={position}
    >
      {card ? (
        <BattleCard
          name={card.name}
          pixels={card.pixels}
          attribute={card.attribute}
          currentBp={card.bp}
          variant="compact"
          fixedSize
          side={side}
          faceDown={faceDown}
          flipEnabled
          hideBp={faceDown}
        />
      ) : (
        <span className="formation-empty-label">
          {position.startsWith('front') ? '前衛' : '後衛'}
        </span>
      )}
    </button>
  );
}

function BattleUnitSlot({
  battle,
  position,
  side,
  registerSlot,
}: {
  battle: ReturnType<typeof useBattle>;
  position: BoardPosition;
  side: 'cpu' | 'player';
  registerSlot: (side: 'cpu' | 'player', position: BoardPosition) => (el: HTMLButtonElement | null) => void;
}) {
  const field = side === 'player' ? battle.state.player : battle.state.cpu;
  const unit = getUnitAt(field, position);
  const cards = side === 'player' ? battle.playerCards : battle.cpuCards;
  const card = unit ? cards.find((c) => c.id === unit.cardId) : null;
  const faceDown =
    side === 'cpu' &&
    battle.effectivePhase === 'opening' &&
    !battle.revealedCpu.has(position);
  const selected =
    side === 'player' &&
    (battle.pendingActor === position || battle.pendingPromoteFrom === position);
  const valid = battle.isValidTargetPosition(position, side);
  const isHealPick =
    battle.effectivePhase === 'pickHeal' ||
    (battle.effectivePhase === 'pickTarget' &&
      battle.pendingActor != null &&
      getHealTargets(battle.state.player, battle.pendingActor).includes(
        position,
      ));
  const isStormPick =
    battle.effectivePhase === 'pickTarget' &&
    side === 'player' &&
    battle.pendingActor === position &&
    valid;
  const targetKind =
    valid && side === 'cpu'
      ? 'is-attack-target'
      : valid && isStormPick
        ? 'is-storm-target'
        : valid && side === 'player' && isHealPick
          ? 'is-heal-target'
          : valid && side === 'player'
            ? 'is-shield-target'
            : '';
  const actionable =
    side === 'player' &&
    battle.effectivePhase === 'pickMain' &&
    battle.isActionablePosition(position);
  const activeAttack =
    battle.playback?.phase === 'attack'
      ? battle.playback.attacks[battle.playback.attackIndex]
      : null;
  const highlightedAttack =
    !!activeAttack &&
    ((activeAttack.fromSide === side && activeAttack.fromPosition === position) ||
      (activeAttack.toSide === side && activeAttack.toPosition === position) ||
      ((activeAttack.kind === 'dual' || activeAttack.kind === 'storm') &&
        activeAttack.secondaryToPosition != null &&
        activeAttack.toSide === side &&
        activeAttack.secondaryToPosition === position));
  const highlightedShield = battle.playback?.shields.some(
    (s) => s.side === side && (s.fromPosition === position || s.toPosition === position),
  );
  const highlightedHeal = battle.playback?.heals.some(
    (h) => h.side === side && (h.fromPosition === position || h.toPosition === position),
  );
  const attackFx = getAttackSlotFx(battle.playback, side, position);
  const healFx = getHealSlotFx(battle.playback, side, position);
  const poisonFx = getPoisonDotSlotFx(battle.turnStartPlayback, side, position);
  const stormHitDisplay = unit
    ? resolveStormHitDisplay(battle, side, position)
    : false;
  const frozenDisplay = unit
    ? resolveFrozenDisplay(unit, battle, side, position)
    : { frozen: false, justApplied: false };
  const poisonDisplay = unit
    ? resolvePoisonDisplay(unit, battle, side, position)
    : { count: 0, damagePerTurn: 0, justApplied: false };

  return (
    <button
      ref={registerSlot(side, position)}
      type="button"
      className={`formation-slot battle-formation-slot ${
        unit ? 'has-card' : ''
      } ${unit ? 'is-frameless' : ''} ${selected ? 'is-selected' : ''} ${
        valid ? 'is-valid' : ''
      } ${
        actionable ? 'is-actionable' : ''
      } ${highlightedAttack ? 'is-attack-highlight' : ''} ${
        highlightedShield ? 'is-shield-highlight' : ''
      } ${highlightedHeal ? 'is-heal-highlight' : ''} ${
        highlightedAttack ? 'is-shaking' : ''
      } ${targetKind}`}
      onClick={
        side === 'player'
          ? () => battle.handlePlayerCardClick(position)
          : battle.effectivePhase === 'pickTarget'
            ? () => battle.handleCpuCardClick(position)
          : undefined
      }
    >
      {unit && card ? (
        <BattleCard
          name={unit.name}
          pixels={card.pixels}
          attribute={unit.attribute}
          currentBp={unit.currentBp}
          maxBp={unit.maxBp}
          variant="compact"
          fixedSize
          side={side}
          hasShield={unit.hasShield}
          bowArrowsRemaining={
            unit.attribute === 'bow' ? unit.bowArrowsRemaining : undefined
          }
          healUsesRemaining={
            unit.attribute === 'heal' ? unit.healUsesRemaining : undefined
          }
          isFrozen={frozenDisplay.frozen}
          freezeJustApplied={frozenDisplay.justApplied}
          stormUsesRemaining={
            unit.attribute === 'storm' ? unit.stormUsesRemaining : undefined
          }
          stormSwirl={stormHitDisplay}
          poisonStackCount={poisonDisplay.count}
          poisonDamagePerTurn={poisonDisplay.damagePerTurn}
          poisonJustApplied={poisonDisplay.justApplied}
          defenseShieldUsed={unit.defenseShieldUsed}
          faceDown={faceDown}
          flipEnabled
          hideBp={faceDown}
          selected={selected}
          animatedBp={
            attackFx?.animatedBp ?? healFx?.animatedBp ?? poisonFx?.animatedBp
          }
          healSparkle={healFx?.sparkle ?? false}
        />
      ) : (
        <span className="formation-empty-label">
          {position.startsWith('front') ? '前衛' : '後衛'}
        </span>
      )}
    </button>
  );
}

function rectEdgeToward(
  rect: DOMRect,
  boardRect: DOMRect,
  targetX: number,
  targetY: number,
): { x: number; y: number } {
  const cx = rect.left + rect.width / 2 - boardRect.left;
  const cy = rect.top + rect.height / 2 - boardRect.top;
  const dx = targetX - cx;
  const dy = targetY - cy;

  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }

  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  const tX = dx !== 0 ? halfW / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const tY = dy !== 0 ? halfH / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const t = Math.min(tX, tY);

  return {
    x: cx + dx * t,
    y: cy + dy * t,
  };
}

function FormationArrowLayer({
  boardRef,
  slotRefs,
  lines,
}: {
  boardRef: React.RefObject<HTMLDivElement | null>;
  slotRefs: React.MutableRefObject<Partial<Record<SlotKey, HTMLButtonElement>>>;
  lines: ArrowLine[];
}) {
  const [segments, setSegments] = useState<
    (ArrowLine & { x1: number; y1: number; x2: number; y2: number })[]
  >([]);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || lines.length === 0) {
      setSegments([]);
      return;
    }

    const measure = () => {
      const boardRect = board.getBoundingClientRect();
      const next = lines
        .map((line) => {
          const from = slotRefs.current[`${line.fromSide}:${line.fromPosition}`];
          const to = slotRefs.current[`${line.toSide}:${line.toPosition}`];
          if (!from || !to) return null;
          const fromRect = from.getBoundingClientRect();
          const toRect = to.getBoundingClientRect();
          const fromCenterX = fromRect.left + fromRect.width / 2 - boardRect.left;
          const fromCenterY = fromRect.top + fromRect.height / 2 - boardRect.top;
          const toCenterX = toRect.left + toRect.width / 2 - boardRect.left;
          const toCenterY = toRect.top + toRect.height / 2 - boardRect.top;
          const fromEdge = rectEdgeToward(
            fromRect,
            boardRect,
            toCenterX,
            toCenterY,
          );
          const toEdge = rectEdgeToward(
            toRect,
            boardRect,
            fromCenterX,
            fromCenterY,
          );
          return {
            ...line,
            x1: fromEdge.x,
            y1: fromEdge.y,
            x2: toEdge.x,
            y2: toEdge.y,
          };
        })
        .filter((line): line is NonNullable<typeof line> => line != null);
      setSegments(next);
    };

    measure();
    const frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [boardRef, slotRefs, lines]);

  if (segments.length === 0) return null;

  return (
    <svg className="formation-arrow-layer" aria-hidden>
      <defs>
        <marker
          id="formation-arrow-attack"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="formation-arrow-head-attack" />
        </marker>
        <marker
          id="formation-arrow-shield"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="formation-arrow-head-shield" />
        </marker>
        <marker
          id="formation-arrow-heal"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="formation-arrow-head-heal" />
        </marker>
        <marker
          id="formation-arrow-attack-secondary"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            className="formation-arrow-head-attack-secondary"
          />
        </marker>
      </defs>
      {segments.map((line) => (
        <g key={line.key}>
          <line
            className={
              line.kind === 'attack-secondary'
                ? 'formation-arrow-outline formation-arrow-outline-secondary'
                : 'formation-arrow-outline'
            }
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
          />
          <line
            className={`formation-arrow-line formation-arrow-${line.kind}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            markerStart={
              line.bidirectional
                ? `url(#formation-arrow-${line.kind})`
                : undefined
            }
            markerEnd={`url(#formation-arrow-${line.kind})`}
          />
        </g>
      ))}
    </svg>
  );
}

function FormationDamageLayer({
  boardRef,
  slotRefs,
  markers,
}: {
  boardRef: React.RefObject<HTMLDivElement | null>;
  slotRefs: React.MutableRefObject<Partial<Record<SlotKey, HTMLButtonElement>>>;
  markers: DamageMarker[];
}) {
  const [labels, setLabels] = useState<
    (DamageMarker & { x: number; y: number })[]
  >([]);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || markers.length === 0) {
      setLabels([]);
      return;
    }

    const measure = () => {
      const boardRect = board.getBoundingClientRect();
      const next = markers
        .map((marker) => {
          const slot = slotRefs.current[`${marker.side}:${marker.position}`];
          if (!slot) return null;
          const slotRect = slot.getBoundingClientRect();
          return {
            ...marker,
            x: slotRect.left + slotRect.width / 2 - boardRect.left,
            y: slotRect.top + slotRect.height / 2 - boardRect.top,
          };
        })
        .filter((marker): marker is NonNullable<typeof marker> => marker != null);
      setLabels(next);
    };

    measure();
    const frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [boardRef, slotRefs, markers]);

  if (labels.length === 0) return null;

  return (
    <div className="formation-damage-layer" aria-hidden>
      {labels.map((label) => (
        <span
          key={label.key}
          className={`formation-damage-float${
            label.kind === 'poison'
              ? ' formation-damage-float-poison'
              : label.kind === 'heal'
                ? ' formation-damage-float-heal'
                : ''
          }`}
          style={{ left: label.x, top: label.y }}
        >
          {label.label}
        </span>
      ))}
    </div>
  );
}

function BattleBoard({
  battle,
}: {
  battle: ReturnType<typeof useBattle>;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Partial<Record<SlotKey, HTMLButtonElement>>>({});
  const playerDefeated = getDefeated(battle.state.player);
  const cpuDefeated = getDefeated(battle.state.cpu);
  const result = battle.result;
  const showOutcome =
    battle.effectivePhase === 'ended' && result != null;

  const activeAttack =
    battle.playback?.phase === 'attack' &&
    battle.playback.attackSubPhase === 'damage'
      ? battle.playback.attacks[battle.playback.attackIndex]
      : null;
  const shieldLines = battle.playback?.shields ?? [];
  const healLines = battle.playback?.heals ?? [];
  const arrowLines: ArrowLine[] = [
    ...(battle.playback?.phase === 'heal'
      ? healLines.map((line, index) => ({
          key: `heal-${index}-${line.side}-${line.fromPosition}-${line.toPosition}`,
          kind: 'heal' as const,
          fromSide: line.side,
          fromPosition: line.fromPosition,
          toSide: line.side,
          toPosition: line.toPosition,
        }))
      : []),
    ...(battle.playback?.phase === 'shield'
      ? shieldLines.map((line, index) => ({
          key: `shield-${index}-${line.side}-${line.fromPosition}-${line.toPosition}`,
          kind: 'shield' as const,
          fromSide: line.side,
          fromPosition: line.fromPosition,
          toSide: line.side,
          toPosition: line.toPosition,
        }))
      : []),
    ...(activeAttack
      ? activeAttack.bidirectional
        ? [
            {
              key: 'attack-reciprocal',
              kind: 'attack' as const,
              fromSide: activeAttack.fromSide,
              fromPosition: activeAttack.fromPosition,
              toSide: activeAttack.toSide,
              toPosition: activeAttack.toPosition,
              bidirectional: true,
            },
          ]
        : [
          {
            key: `attack-${activeAttack.fromSide}-${activeAttack.fromPosition}-${activeAttack.toSide}-${activeAttack.toPosition}`,
            kind: 'attack' as const,
            fromSide: activeAttack.fromSide,
            fromPosition: activeAttack.fromPosition,
            toSide: activeAttack.toSide,
            toPosition: activeAttack.toPosition,
          },
        ]
      : []),
    ...((activeAttack?.kind === 'dual' || activeAttack?.kind === 'storm') &&
    activeAttack.secondaryToPosition != null
      ? [
          {
            key: `attack-secondary-${activeAttack.fromSide}-${activeAttack.fromPosition}-${activeAttack.toSide}-${activeAttack.secondaryToPosition}`,
            kind: 'attack-secondary' as const,
            fromSide: activeAttack.fromSide,
            fromPosition: activeAttack.fromPosition,
            toSide: activeAttack.toSide,
            toPosition: activeAttack.secondaryToPosition,
          },
        ]
      : []),
  ];
  const damageMarkers: DamageMarker[] = [];
  if (
    battle.effectivePhase === 'turnStartPoison' &&
    battle.turnStartPlayback?.poisonSubPhase === 'damage'
  ) {
    for (const dot of battle.turnStartPlayback.poisonDots) {
      damageMarkers.push({
        key: `poison-${dot.side}-${dot.position}`,
        side: dot.side,
        position: dot.position,
        label: `−${dot.damage}`,
        kind: 'poison',
      });
    }
  }
  if (
    battle.playback?.phase === 'heal' &&
    battle.playback.healSubPhase === 'damage'
  ) {
    for (const heal of healLines) {
      damageMarkers.push({
        key: `heal-${heal.side}-${heal.toPosition}`,
        side: heal.side,
        position: heal.toPosition,
        label: `+${heal.amount}`,
        kind: 'heal',
      });
    }
  }
  if (
    activeAttack &&
    battle.playback?.phase === 'attack' &&
    battle.playback.attackSubPhase === 'damage'
  ) {
    if (activeAttack.attackerDamage > 0) {
      damageMarkers.push({
        key: `attacker-${activeAttack.fromSide}-${activeAttack.fromPosition}`,
        side: activeAttack.fromSide,
        position: activeAttack.fromPosition,
        label: `−${activeAttack.attackerDamage}`,
      });
    }
    if (activeAttack.damage > 0) {
      damageMarkers.push({
        key: `target-${activeAttack.toSide}-${activeAttack.toPosition}`,
        side: activeAttack.toSide,
        position: activeAttack.toPosition,
        label: `−${activeAttack.damage}`,
      });
    }
    if (
      (activeAttack.kind === 'dual' || activeAttack.kind === 'storm') &&
      activeAttack.secondaryToPosition != null &&
      (activeAttack.secondaryDamage ?? 0) > 0
    ) {
      damageMarkers.push({
        key: `secondary-${activeAttack.toSide}-${activeAttack.secondaryToPosition}`,
        side: activeAttack.toSide,
        position: activeAttack.secondaryToPosition,
        label: `−${activeAttack.secondaryDamage}`,
      });
    }
  }
  const registerSlot = useCallback(
    (side: 'cpu' | 'player', position: BoardPosition) =>
      (el: HTMLButtonElement | null) => {
        const key: SlotKey = `${side}:${position}`;
        if (el) slotRefs.current[key] = el;
        else delete slotRefs.current[key];
      },
    [],
  );

  useEffect(() => {
    const stormActor = battle.pendingActor;
    if (
      battle.effectivePhase !== 'pickTarget' ||
      stormActor == null ||
      !battle.isStormPickPending()
    ) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const stormSlot = slotRefs.current[`player:${stormActor}`];
      if (stormSlot?.contains(target)) return;

      if (battle.availableActionsFor(stormActor).includes('meleeAttack')) {
        for (const position of getMeleeTargets(battle.state.cpu)) {
          if (slotRefs.current[`cpu:${position}`]?.contains(target)) return;
        }
      }

      battle.cancelStormPick();
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [
    battle.effectivePhase,
    battle.pendingActor,
    battle.pendingAction,
    battle.state.cpu,
    battle.cancelStormPick,
    battle.isStormPickPending,
    battle.availableActionsFor,
  ]);

  return (
    <div className="formation-battle">
      <div ref={boardRef} className="formation-board">
        <FormationArrowLayer
          boardRef={boardRef}
          slotRefs={slotRefs}
          lines={arrowLines}
        />
        <FormationDamageLayer
          boardRef={boardRef}
          slotRefs={slotRefs}
          markers={damageMarkers}
        />

        <div className="formation-field formation-field-cpu">
          <div className="formation-grave formation-grave-cpu">
            {cpuDefeated.map((unit) => {
              const card = battle.cpuCards.find((c) => c.id === unit.cardId);
              return card ? (
                <TinyCard key={unit.cardId} card={card} side="cpu" defeated />
              ) : null;
            })}
          </div>
          <div className="formation-row formation-row-back">
            {BACK_POSITIONS.map((position) => (
              <BattleUnitSlot
                key={`cpu-${position}`}
                battle={battle}
                side="cpu"
                position={position}
                registerSlot={registerSlot}
              />
            ))}
          </div>
          <div className="formation-row formation-row-front">
            {FRONT_POSITIONS.map((position) => (
              <BattleUnitSlot
                key={`cpu-${position}`}
                battle={battle}
                side="cpu"
                position={position}
                registerSlot={registerSlot}
              />
            ))}
          </div>
          {showOutcome && (
            <FormationZoneOutcome battleResult={result} side="cpu" />
          )}
        </div>

        <div className="formation-guide">
          <div className="formation-hint formation-guide-line">
            {formatBattleGuideLine(
              battle.turnLabel,
              battle.hint,
              showOutcome ? result : null,
            )}
          </div>
        </div>

        <div className="formation-field formation-field-player">
          <div className="formation-row formation-row-front">
            {FRONT_POSITIONS.map((position) => (
              <BattleUnitSlot
                key={`player-${position}`}
                battle={battle}
                side="player"
                position={position}
                registerSlot={registerSlot}
              />
            ))}
          </div>
          <div className="formation-row formation-row-back">
            {BACK_POSITIONS.map((position) => (
              <BattleUnitSlot
                key={`player-${position}`}
                battle={battle}
                side="player"
                position={position}
                registerSlot={registerSlot}
              />
            ))}
          </div>
          <div className="formation-grave formation-grave-player">
            {playerDefeated.map((unit) => {
              const card = battle.playerCards.find((c) => c.id === unit.cardId);
              return card ? (
                <TinyCard key={unit.cardId} card={card} side="player" defeated />
              ) : null;
            })}
          </div>
          {showOutcome && (
            <FormationZoneOutcome battleResult={result} side="player" />
          )}
        </div>
      </div>
    </div>
  );
}

function BattleSession({
  playerCards,
  cpuCards,
  onFinish,
  onEndedChange,
}: {
  playerCards: Card[];
  cpuCards: Card[];
  onFinish: BattleSetupScreenProps['onFinish'];
  onEndedChange?: (ended: boolean) => void;
}) {
  const battle = useBattle(playerCards, cpuCards, onFinish);
  const ended = battle.effectivePhase === 'ended' && battle.result != null;

  useEffect(() => {
    if (ended) battle.handleEnd();
  }, [ended, battle.handleEnd]);

  useEffect(() => {
    onEndedChange?.(ended);
  }, [ended, onEndedChange]);

  return <BattleBoard battle={battle} />;
}

export function BattleSetupScreen({
  playerDeck,
  cpuDeck,
  playerIdentity,
  opponentIdentity,
  onFinish,
  onGoToDeck,
  onNewBattle,
}: BattleSetupScreenProps) {
  const opponentProfile: BattleZoneProfile = opponentIdentity ?? {
    name: 'CPU',
    level: playerIdentity?.level ?? CPU_OPPONENT_LEVEL,
  };
  const canBattle = playerDeck.length >= DECK_MAX;
  const [phase, setPhase] = useState<'setup' | 'battle'>('setup');
  const [timeLeft, setTimeLeft] = useState(SETUP_TIME_LIMIT_SEC);
  const [playerHand, setPlayerHand] = useState<Card[]>(() => [...playerDeck]);
  const [playerSlots, setPlayerSlots] = useState<Record<BoardPosition, Card | null>>(
    () =>
      BOARD_POSITIONS.reduce(
        (acc, position) => {
          acc[position] = null;
          return acc;
        },
        {} as Record<BoardPosition, Card | null>,
      ),
  );
  const [cpuFormation] = useState<Record<BoardPosition, Card | null>>(() =>
    randomFormation(cpuDeck),
  );
  const [cpuHand, setCpuHand] = useState<Card[]>(() => [...cpuDeck]);
  const [cpuSlots, setCpuSlots] = useState<Record<BoardPosition, Card | null>>(
    () =>
      BOARD_POSITIONS.reduce(
        (acc, position) => {
          acc[position] = null;
          return acc;
        },
        {} as Record<BoardPosition, Card | null>,
      ),
  );
  const [cpuDeployIndex, setCpuDeployIndex] = useState(0);
  const [cpuFlight, setCpuFlight] = useState<{
    card: Card;
    position: BoardPosition;
    from: LayoutRect;
    to: LayoutRect;
  } | null>(null);
  const [cpuFlyingCardId, setCpuFlyingCardId] = useState<string | null>(null);
  const [cpuDeployCooldown, setCpuDeployCooldown] = useState(false);
  const [cpuMeasureTick, setCpuMeasureTick] = useState(0);
  const [selected, setSelected] = useState<SelectedSetupCard | null>(null);
  const [battleEnded, setBattleEnded] = useState(false);

  const formationScreenRef = useRef<HTMLElement>(null);
  const cpuHandRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cpuFlightRef = useRef(cpuFlight);
  cpuFlightRef.current = cpuFlight;
  const cpuSlotRefs = useRef<Record<BoardPosition, HTMLButtonElement | null>>({
    frontLeft: null,
    frontRight: null,
    backLeft: null,
    backCenter: null,
    backRight: null,
  });

  const ready = BOARD_POSITIONS.every((position) => playerSlots[position]);
  const bothDeployed =
    ready &&
    BOARD_POSITIONS.every((position) => cpuSlots[position]) &&
    !cpuFlight;
  const battleCards = useMemo(
    () => ({
      player: orderedCards(playerSlots),
      cpu: orderedCards(cpuFormation),
    }),
    [playerSlots, cpuFormation],
  );

  const resolvedPlayerIdentity = useMemo(
    (): BattleZoneIdentity | undefined =>
      playerIdentity
        ? { ...playerIdentity, power: computeDeckPower(playerDeck) }
        : undefined,
    [playerIdentity, playerDeck],
  );

  const resolvedOpponentIdentity = useMemo(
    (): BattleZoneIdentity => ({
      ...opponentProfile,
      power: computeDeckPower(cpuDeck),
    }),
    [opponentProfile, cpuDeck],
  );

  const handleCpuFlightComplete = useCallback(() => {
    const current = cpuFlightRef.current;
    if (!current) return;

    const { card, position } = current;
    setCpuSlots((prev) => ({ ...prev, [position]: card }));
    setCpuHand((prev) => prev.filter((c) => c.id !== card.id));
    setCpuFlight(null);
    setCpuFlyingCardId(null);
    setCpuDeployIndex((index) => index + 1);
    setCpuDeployCooldown(true);
  }, []);

  useEffect(() => {
    if (!cpuDeployCooldown) return;
    const t = window.setTimeout(
      () => setCpuDeployCooldown(false),
      SETUP_MS.dealStepGap,
    );
    return () => window.clearTimeout(t);
  }, [cpuDeployCooldown]);

  useLayoutEffect(() => {
    if (phase !== 'setup') return;
    if (cpuDeployCooldown || cpuFlight) return;
    if (cpuDeployIndex >= BOARD_POSITIONS.length) return;

    const position = BOARD_POSITIONS[cpuDeployIndex]!;
    if (cpuSlots[position]) {
      setCpuDeployIndex((index) => index + 1);
      return;
    }

    const card = cpuFormation[position];
    if (!card) {
      setCpuDeployIndex((index) => index + 1);
      return;
    }

    const handEl = cpuHandRefs.current[card.id];
    const slotEl = cpuSlotRefs.current[position];
    const container = formationScreenRef.current;
    if (!handEl || !slotEl || !container) {
      const id = requestAnimationFrame(() =>
        setCpuMeasureTick((tick) => tick + 1),
      );
      return () => cancelAnimationFrame(id);
    }

    setCpuFlyingCardId(card.id);
    setCpuFlight({
      card,
      position,
      from: relRect(container, handEl),
      to: relRect(container, slotEl),
    });
  }, [
    phase,
    cpuDeployIndex,
    cpuFlight,
    cpuDeployCooldown,
    cpuFormation,
    cpuSlots,
    cpuMeasureTick,
  ]);

  const randomFill = useCallback(() => {
    setPlayerSlots((prev) => {
      const next = { ...prev };
      const empty = BOARD_POSITIONS.filter((position) => !next[position]);
      const cards = shuffle(playerHand);
      empty.forEach((position, index) => {
        next[position] = cards[index] ?? null;
      });
      return next;
    });
    setPlayerHand([]);
    setSelected(null);
  }, [playerHand]);

  useEffect(() => {
    if (phase !== 'setup') return;
    if (timeLeft <= 0) {
      if (!ready) randomFill();
      setPhase('battle');
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, timeLeft, ready, randomFill]);

  const handleSlotClick = (position: BoardPosition) => {
    if (!selected) {
      if (playerSlots[position]) {
        setSelected({ source: 'slot', position });
      }
      return;
    }

    if (selected.source === 'slot' && selected.position === position) {
      setSelected(null);
      return;
    }

    const nextSlots = { ...playerSlots };
    let nextHand = [...playerHand];

    if (selected.source === 'hand') {
      const handCard = playerHand[selected.index];
      if (!handCard) return;
      const slotCard = nextSlots[position];
      nextSlots[position] = handCard;
      nextHand = playerHand.filter((_, index) => index !== selected.index);
      if (slotCard) nextHand.push(slotCard);
    } else {
      const fromCard = nextSlots[selected.position];
      nextSlots[selected.position] = nextSlots[position];
      nextSlots[position] = fromCard;
    }

    setPlayerSlots(nextSlots);
    setPlayerHand(nextHand);
    setSelected(null);
  };

  const handleHandClick = (index: number) => {
    setSelected((prev) =>
      prev?.source === 'hand' && prev.index === index
        ? null
        : { source: 'hand', index },
    );
  };

  const handleMainButton = () => {
    if (!ready) {
      randomFill();
      return;
    }
    setBattleEnded(false);
    setPhase('battle');
  };

  if (!canBattle) {
    return (
      <section className="screen">
        <p className="muted">
          戦闘にはデッキが {DECK_MAX} 枚必要です（現在 {playerDeck.length} 枚）
        </p>
      </section>
    );
  }

  return (
    <section
      ref={formationScreenRef}
      className={`screen setup-reveal formation-screen${phase === 'battle' ? ' is-battle-active' : ''}${battleEnded ? ' has-end-actions' : ''}`}
    >
      <div className="formation-battle-shell">
        <FormationZoneBanner
          identity={resolvedOpponentIdentity}
          side="cpu"
        />
        <div className="formation-battle-body">
          {phase === 'battle' ? (
            <BattleSession
              playerCards={battleCards.player}
              cpuCards={battleCards.cpu}
              onFinish={onFinish}
              onEndedChange={setBattleEnded}
            />
          ) : (
            <div className="formation-battle">
              <div className="formation-board">
                <div className="formation-field formation-field-cpu">
                  <div
                    className="formation-grave formation-hand formation-hand-cpu"
                    aria-label="敵の手札"
                  >
                    {cpuHand.map((card) => (
                      <TinyCard
                        key={card.id}
                        card={card}
                        side="cpu"
                        faceDown
                        hidden={cpuFlyingCardId === card.id}
                        cardRef={(el) => {
                          if (el) cpuHandRefs.current[card.id] = el;
                          else delete cpuHandRefs.current[card.id];
                        }}
                      />
                    ))}
                  </div>
                  <div className="formation-row formation-row-back">
                    {BACK_POSITIONS.map((position) => (
                      <SetupSlot
                        key={`cpu-${position}`}
                        card={cpuSlots[position]}
                        position={position}
                        side="cpu"
                        hideFrame={bothDeployed}
                        faceDown
                        slotRef={(el) => {
                          cpuSlotRefs.current[position] = el;
                        }}
                      />
                    ))}
                  </div>
                  <div className="formation-row formation-row-front">
                    {FRONT_POSITIONS.map((position) => (
                      <SetupSlot
                        key={`cpu-${position}`}
                        card={cpuSlots[position]}
                        position={position}
                        side="cpu"
                        hideFrame={bothDeployed}
                        faceDown
                        slotRef={(el) => {
                          cpuSlotRefs.current[position] = el;
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="formation-guide">
                  <div className="formation-hint formation-guide-line">
                    バトル準備：カードを配置してください（残り {timeLeft} 秒）
                  </div>
                </div>

                <div className="formation-field formation-field-player">
                  <div className="formation-row formation-row-front">
                    {FRONT_POSITIONS.map((position) => (
                      <SetupSlot
                        key={`player-${position}`}
                        card={playerSlots[position]}
                        position={position}
                        side="player"
                        hideFrame={bothDeployed}
                        selected={
                          selected?.source === 'slot' &&
                          selected.position === position
                        }
                        valid={!!selected}
                        onClick={() => handleSlotClick(position)}
                      />
                    ))}
                  </div>
                  <div className="formation-row formation-row-back">
                    {BACK_POSITIONS.map((position) => (
                      <SetupSlot
                        key={`player-${position}`}
                        card={playerSlots[position]}
                        position={position}
                        side="player"
                        hideFrame={bothDeployed}
                        selected={
                          selected?.source === 'slot' &&
                          selected.position === position
                        }
                        valid={!!selected}
                        onClick={() => handleSlotClick(position)}
                      />
                    ))}
                  </div>
                  <div className="formation-grave formation-hand formation-hand-player">
                    {playerHand.map((card, index) => (
                      <TinyCard
                        key={card.id}
                        card={card}
                        side="player"
                        selected={
                          selected?.source === 'hand' && selected.index === index
                        }
                        onClick={() => handleHandClick(index)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {resolvedPlayerIdentity && (
          <FormationZoneBanner
            identity={resolvedPlayerIdentity}
            side="player"
          />
        )}

        {phase === 'setup' && (
          <div className="actions setup-actions formation-actions">
            <button type="button" className="primary" onClick={handleMainButton}>
              {ready ? '準備完了' : 'ランダム配置'}
            </button>
          </div>
        )}
        {phase === 'battle' && battleEnded && (
          <div className="actions deck-actions setup-battle-end-actions">
            <button type="button" onClick={onGoToDeck}>
              デッキ
            </button>
            <button type="button" className="primary" onClick={onNewBattle}>
              新規バトル
            </button>
          </div>
        )}
        {phase === 'battle' && !battleEnded && (
          <div className="actions setup-actions formation-actions formation-footer-reserve" aria-hidden="true">
            <button type="button" className="primary" tabIndex={-1} disabled>
              準備完了
            </button>
          </div>
        )}
      </div>

      {phase === 'setup' && cpuFlight && (
        <SetupFlightLayer
          key={`${cpuFlight.card.id}-${cpuFlight.position}`}
          card={cpuFlight.card}
          from={cpuFlight.from}
          to={cpuFlight.to}
          faceDown
          side="cpu"
          onComplete={handleCpuFlightComplete}
        />
      )}
    </section>
  );
}
