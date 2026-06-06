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
import type { Card } from '../types';
import type { BoardPosition } from '../types/battle';
import {
  BACK_POSITIONS,
  BOARD_POSITIONS,
  FRONT_POSITIONS,
  getDefeated,
  getUnitAt,
} from '../game';
import { BattleCard } from './BattleCard';
import { SetupFlightLayer } from './SetupFlightLayer';
import { SETUP_MS } from './setupConstants';
import { relRect } from './setupMeasure';
import type { LayoutRect } from './flightMeasure';
import { useBattle } from './useBattle';

type SlotKey = `${'cpu' | 'player'}:${BoardPosition}`;

interface ArrowLine {
  key: string;
  kind: 'attack' | 'shield';
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
  onFinish: (outcome: {
    winner: 'player' | 'cpu';
    playerCardIds: string[];
    cpuDefeatedCount: number;
    playerDeckPower: number;
    opponentDeckPower: number;
    fauxLostCardId: string | null;
  }) => void;
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
  if (!isAttacker && !isTarget) return null;

  const hpFrom = isAttacker ? attack.attackerHpFrom : attack.hpFrom;
  const hpTo = isAttacker ? attack.attackerHpTo : attack.hpTo;

  return {
    animatedHp:
      playback.attackSubPhase === 'hp'
        ? { from: hpFrom, to: hpTo, active: true as const }
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
        currentHp={card.hp}
        variant="compact"
        fixedSize
        flipEnabled
        side={side}
        faceDown={faceDown}
        hideHp={faceDown}
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
          currentHp={card.hp}
          variant="compact"
          fixedSize
          side={side}
          faceDown={faceDown}
          flipEnabled
          hideHp={faceDown}
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
  const targetKind =
    valid && side === 'cpu'
      ? 'is-attack-target'
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
      (activeAttack.toSide === side && activeAttack.toPosition === position));
  const highlightedShield = battle.playback?.shields.some(
    (s) => s.side === side && (s.fromPosition === position || s.toPosition === position),
  );
  const attackFx = getAttackSlotFx(battle.playback, side, position);

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
      } ${highlightedAttack ? 'is-shaking' : ''} ${targetKind}`}
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
          currentHp={unit.currentHp}
          variant="compact"
          fixedSize
          side={side}
          hasShield={unit.hasShield}
          defenseShieldUsed={unit.defenseShieldUsed}
          faceDown={faceDown}
          flipEnabled
          hideHp={faceDown}
          selected={selected}
          animatedHp={attackFx?.animatedHp}
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
      </defs>
      {segments.map((line) => (
        <g key={line.key}>
          <line
            className="formation-arrow-outline"
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
          className="formation-damage-float"
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
  playerIdentity,
  opponentIdentity,
}: {
  battle: ReturnType<typeof useBattle>;
  playerIdentity?: BattleZoneIdentity;
  opponentIdentity: BattleZoneIdentity;
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
  const arrowLines: ArrowLine[] = [
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
  ];
  const damageMarkers: DamageMarker[] = [];
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
          <FormationZoneBanner identity={opponentIdentity} side="cpu" />
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
          {playerIdentity && (
            <FormationZoneBanner identity={playerIdentity} side="player" />
          )}
        </div>
      </div>
    </div>
  );
}

function BattleSession({
  playerCards,
  cpuCards,
  playerIdentity,
  opponentIdentity,
  onFinish,
  onEndedChange,
}: {
  playerCards: Card[];
  cpuCards: Card[];
  playerIdentity?: BattleZoneIdentity;
  opponentIdentity: BattleZoneIdentity;
  onFinish: BattleSetupScreenProps['onFinish'];
  onEndedChange?: (ended: boolean) => void;
}) {
  const battle = useBattle(playerCards, cpuCards, onFinish);
  const ended = battle.effectivePhase === 'ended' && battle.result != null;

  useEffect(() => {
    if (ended) battle.handleEnd();
  }, [ended, battle]);

  useEffect(() => {
    onEndedChange?.(ended);
  }, [ended, onEndedChange]);

  return (
    <BattleBoard
      battle={battle}
      playerIdentity={playerIdentity}
      opponentIdentity={opponentIdentity}
    />
  );
}

export function BattleSetupScreen({
  playerDeck,
  cpuDeck,
  playerIdentity,
  opponentIdentity = { name: 'CPU', level: CPU_OPPONENT_LEVEL },
  onFinish,
  onGoToDeck,
  onNewBattle,
}: BattleSetupScreenProps) {
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
      ...opponentIdentity,
      power: computeDeckPower(cpuDeck),
    }),
    [opponentIdentity, cpuDeck],
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
        <div className="formation-battle-body">
          {phase === 'battle' ? (
            <BattleSession
              playerCards={battleCards.player}
              cpuCards={battleCards.cpu}
              playerIdentity={resolvedPlayerIdentity}
              opponentIdentity={resolvedOpponentIdentity}
              onFinish={onFinish}
              onEndedChange={setBattleEnded}
            />
          ) : (
            <div className="formation-battle">
              <div className="formation-board">
                <div className="formation-field formation-field-cpu">
                  <FormationZoneBanner
                    identity={resolvedOpponentIdentity}
                    side="cpu"
                  />
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
                  {resolvedPlayerIdentity && (
                    <FormationZoneBanner
                      identity={resolvedPlayerIdentity}
                      side="player"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

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
