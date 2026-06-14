import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { DECK_MAX } from '../config/balance';
import type { Card } from '../types';
import type { BattleState } from '../types/battle';
import { getSelectionTurn, isFrozen } from '../game/iceCombat';
import { sumPoisonDotDamage } from '../game/poisonCombat';
import { BattleCard } from './BattleCard';
import { CardFlightLayer } from './CardFlightLayer';
import type { ClashPlayback } from './battleClashTypes';
import { measureFlightRects, type FlightRects } from './flightMeasure';
import { HAND_DEPLOY_START } from './setupConstants';
import type { BattleUiPhase } from './useBattle';

export type BattleBoardLayout = 'standalone' | 'setup';

interface BattleBoardProps {
  layout: BattleBoardLayout;
  state: BattleState;
  playerCards: Card[];
  cpuCards: Card[];
  playerAlive: number[];
  clash: ClashPlayback | null;
  pendingMain: number | null;
  focusedPlayer?: number | null;
  phase: BattleUiPhase | 'ended';
  onPlayerClick: (index: number) => void;
  /** layout=setup のとき親の setup-board */
  boardRef?: RefObject<HTMLDivElement | null>;
  /** 戦闘終了時の勝敗（WIN / LOSE オーバーレイ） */
  battleResult?: 'player' | 'cpu' | null;
}

function battleIndexForHandSlot(handSlot: number): number | null {
  const idx = handSlot - HAND_DEPLOY_START;
  if (idx < 0 || idx >= 3) return null;
  return idx;
}

function ZoneOutcomeBanner({
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
      aria-hidden
    >
      {kind === 'win' ? 'WIN' : 'LOSE'}
    </div>
  );
}

export function BattleBoard({
  layout,
  state,
  playerCards,
  cpuCards,
  playerAlive,
  clash,
  pendingMain,
  focusedPlayer,
  phase,
  onPlayerClick,
  boardRef: externalBoardRef,
  battleResult = null,
}: BattleBoardProps) {
  const showOutcome = phase === 'ended' && battleResult != null;
  const canInteract = phase === 'pickMain' || phase === 'pickShield';
  const inClash = phase === 'clash' && clash != null;
  const embedded = layout === 'setup';

  const internalLayoutRef = useRef<HTMLDivElement>(null);
  const layoutRef = embedded && externalBoardRef ? externalBoardRef : internalLayoutRef;
  const cpuSlotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const playerSlotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cpuCenterRef = useRef<HTMLDivElement>(null);
  const playerCenterRef = useRef<HTMLDivElement>(null);
  const [flightRects, setFlightRects] = useState<FlightRects | null>(null);

  useLayoutEffect(() => {
    if (!clash || !layoutRef.current) {
      setFlightRects(null);
      return;
    }

    const playerSlot = playerSlotRefs.current[clash.playerMain];
    const cpuSlot = cpuSlotRefs.current[clash.cpuMain];
    const playerCenter = playerCenterRef.current;
    const cpuCenter = cpuCenterRef.current;

    if (!playerSlot || !cpuSlot || !playerCenter || !cpuCenter) return;

    setFlightRects(
      measureFlightRects(
        layoutRef.current,
        playerSlot,
        cpuSlot,
        playerCenter,
        cpuCenter,
      ),
    );
  }, [clash?.playerMain, clash?.cpuMain, inClash, layoutRef]);

  const arenaPlayerUnit = clash
    ? clash.pendingNext.player[clash.playerMain]
    : null;
  const arenaCpuUnit = clash ? clash.pendingNext.cpu[clash.cpuMain] : null;

  const flightLayer =
    inClash && clash && flightRects && arenaPlayerUnit && arenaCpuUnit ? (
      <CardFlightLayer
        rects={flightRects}
        phase={clash.phase}
        playerCard={playerCards[clash.playerMain]}
        cpuCard={cpuCards[clash.cpuMain]}
        playerUnit={arenaPlayerUnit}
        cpuUnit={arenaCpuUnit}
        bpFromPlayer={clash.bpFromPlayer}
        bpFromCpu={clash.bpFromCpu}
        bpToPlayer={clash.bpToPlayer}
        bpToCpu={clash.bpToCpu}
      />
    ) : null;

  const fieldCenter = (
    <div
      className={
        embedded
          ? 'battle-field-center setup-battle-field'
          : 'battle-field-center'
      }
      aria-label="バトルフィールド"
    >
      <div className="clash-center-stack">
        <div className="clash-position-anchor" aria-hidden>
          <div ref={cpuCenterRef} className="clash-center-marker" />
        </div>
        <div className="clash-position-anchor" aria-hidden>
          <div ref={playerCenterRef} className="clash-center-marker" />
        </div>
      </div>
      {!inClash && (
        <div className="battle-field-idle">
          <span className="battle-field-idle-text">VS</span>
        </div>
      )}
    </div>
  );

  const renderCpuCard = (unitIndex: number) => {
    const unit = state.cpu[unitIndex];
    const card =
      cpuCards.find((candidate) => candidate.id === unit.cardId) ??
      cpuCards[unitIndex];
    return (
      <BattleCard
        name={unit.name}
        pixels={card?.pixels ?? playerCards[0].pixels}
        attribute={unit.attribute}
        currentBp={unit.currentBp}
        maxBp={unit.maxBp}
        variant={embedded ? 'compact' : 'board'}
        fixedSize={embedded}
        dead={unit.currentBp <= 0}
        hasShield={unit.hasShield}
        bowArrowsRemaining={
          unit.attribute === 'bow' ? unit.bowArrowsRemaining : undefined
        }
        healUsesRemaining={
          unit.attribute === 'heal' ? unit.healUsesRemaining : undefined
        }
        isFrozen={isFrozen(unit, getSelectionTurn(state))}
        stormUsesRemaining={
          unit.attribute === 'storm' ? unit.stormUsesRemaining : undefined
        }
        isStealthed={unit.stealthActive}
        poisonStackCount={unit.poisonStacks.length}
        poisonDamagePerTurn={sumPoisonDotDamage(unit.poisonStacks)}
        defenseShieldUsed={unit.defenseShieldUsed}
        slotLabel={`${unitIndex + 1}`}
        dimmed={inClash}
        inClash={inClash && clash!.cpuMain === unitIndex}
        flipEnabled={false}
        faceDown={false}
        hideBp={false}
        side="cpu"
        rarity={unit.rarity}
      />
    );
  };

  const renderPlayerCard = (unitIndex: number) => {
    const unit = state.player[unitIndex];
    const focused =
      focusedPlayer === unitIndex ||
      (phase === 'pickShield' && pendingMain === unitIndex);
    const interactive = canInteract && playerAlive.includes(unitIndex);

    return (
      <BattleCard
        name={unit.name}
        pixels={playerCards[unitIndex].pixels}
        attribute={unit.attribute}
        currentBp={unit.currentBp}
        maxBp={unit.maxBp}
        variant={embedded ? 'compact' : 'board'}
        fixedSize={embedded}
        dead={unit.currentBp <= 0}
        focused={focused}
        hasShield={unit.hasShield}
        bowArrowsRemaining={
          unit.attribute === 'bow' ? unit.bowArrowsRemaining : undefined
        }
        healUsesRemaining={
          unit.attribute === 'heal' ? unit.healUsesRemaining : undefined
        }
        isFrozen={isFrozen(unit, getSelectionTurn(state))}
        stormUsesRemaining={
          unit.attribute === 'storm' ? unit.stormUsesRemaining : undefined
        }
        isStealthed={unit.stealthActive}
        poisonStackCount={unit.poisonStacks.length}
        poisonDamagePerTurn={sumPoisonDotDamage(unit.poisonStacks)}
        defenseShieldUsed={unit.defenseShieldUsed}
        interactive={interactive}
        onClick={() => onPlayerClick(unitIndex)}
        slotLabel={`${unitIndex + 1}`}
        dimmed={inClash}
        inClash={inClash && clash!.playerMain === unitIndex}
        side="player"
        rarity={unit.rarity}
      />
    );
  };

  if (embedded) {
    return (
      <>
        {flightLayer}
        <div className="setup-zone setup-zone-cpu setup-hand-zone setup-line-a setup-hand-cpu is-battle-active">
          {showOutcome && battleResult && (
            <ZoneOutcomeBanner battleResult={battleResult} side="cpu" />
          )}
          <div className="setup-hand setup-hand-cpu is-lineup-only">
            {Array.from({ length: DECK_MAX }, (_, handSlot) => {
              const unitIndex = battleIndexForHandSlot(handSlot);
              const hasUnit = unitIndex != null && state.cpu[unitIndex];
              return (
                <div
                  key={`bc-${handSlot}`}
                  ref={(el) => {
                    if (unitIndex != null) cpuSlotRefs.current[unitIndex] = el;
                  }}
                  className={`setup-hand-slot ${hasUnit ? 'has-card' : 'is-empty'}`}
                >
                  {hasUnit ? renderCpuCard(unitIndex) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="setup-line-b-field is-open"
        >
          {fieldCenter}
        </div>

        <div className="setup-zone setup-zone-player setup-hand-zone setup-line-a setup-hand-player is-battle-active">
          {showOutcome && battleResult && (
            <ZoneOutcomeBanner battleResult={battleResult} side="player" />
          )}
          <div className="setup-hand setup-hand-player is-lineup-only">
            {Array.from({ length: DECK_MAX }, (_, handSlot) => {
              const unitIndex = battleIndexForHandSlot(handSlot);
              const hasUnit = unitIndex != null && state.player[unitIndex];
              return (
                <div
                  key={`bp-${handSlot}`}
                  ref={(el) => {
                    if (unitIndex != null)
                      playerSlotRefs.current[unitIndex] = el;
                  }}
                  className={`setup-hand-slot ${hasUnit ? 'has-card' : 'is-empty'}`}
                >
                  {hasUnit ? (
                    renderPlayerCard(unitIndex)
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      ref={internalLayoutRef}
      className={`battle-field-layout ${inClash ? 'is-clashing' : ''}`}
    >
      {flightLayer}

      <div className="battle-lane battle-lane-top battle-zone-cpu">
        {showOutcome && battleResult && (
          <ZoneOutcomeBanner battleResult={battleResult} side="cpu" />
        )}
        <div className="battle-board cpu-row">
          {state.cpu.map((unit, i) => (
            <div key={unit.cardId} className="battle-slot-wrap">
              <div
                ref={(el) => {
                  cpuSlotRefs.current[i] = el;
                }}
                className="battle-slot-measure"
              >
                {renderCpuCard(i)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {fieldCenter}

      <div className="battle-lane battle-lane-bottom battle-zone-player">
        {showOutcome && battleResult && (
          <ZoneOutcomeBanner battleResult={battleResult} side="player" />
        )}
        <div className="battle-board player-row">
          {state.player.map((unit, i) => (
            <div key={unit.cardId} className="battle-slot-wrap">
              <div
                ref={(el) => {
                  playerSlotRefs.current[i] = el;
                }}
                className="battle-slot-measure"
              >
                {renderPlayerCard(i)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
