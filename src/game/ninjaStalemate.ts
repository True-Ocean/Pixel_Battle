import { ATTRIBUTE_META } from '../config/attributes';
import type { BattleState, BattleUnit } from '../types/battle';
import { hasBattleActionChoices } from './actionChoices';
import { appendLog, FRONT_POSITIONS, isAlive, isFrontPosition } from './battleState';
import { getDisplayTurn, pushBattleEvent, unitSnapshot } from './battleLogEvent';
import { onExternalEffectToUnit } from './ninjaCombat';

function cloneField(field: BattleUnit[]): BattleUnit[] {
  return field.map((u) => ({
    ...u,
    poisonStacks: u.poisonStacks.map((s) => ({ ...s })),
    illuminatedNinjaCardIds: [...u.illuminatedNinjaCardIds],
  }));
}

function cloneBattleState(state: BattleState): BattleState {
  return {
    ...state,
    player: cloneField(state.player),
    cpu: cloneField(state.cpu),
    log: [...state.log],
    events: [...state.events],
  };
}

function isFrontStealthedNinja(unit: BattleUnit): boolean {
  return (
    isAlive(unit) &&
    unit.attribute === 'ninja' &&
    unit.stealthActive &&
    unit.position !== 'defeated' &&
    isFrontPosition(unit.position)
  );
}

export function getFrontStealthedNinjas(field: BattleUnit[]): BattleUnit[] {
  return field.filter(isFrontStealthedNinja);
}

function pickPrimaryNinja(field: BattleUnit[]): BattleUnit | undefined {
  for (const position of FRONT_POSITIONS) {
    const unit = field.find(
      (candidate) =>
        candidate.position === position && isFrontStealthedNinja(candidate),
    );
    if (unit) return unit;
  }
  return undefined;
}

export function formatStealthMutualBreakLogLine(
  playerNinja: BattleUnit,
  cpuNinja: BattleUnit,
): string {
  const playerLabel = `${playerNinja.name}（${ATTRIBUTE_META.ninja.label}・BP${playerNinja.currentBp}）`;
  const cpuLabel = `${cpuNinja.name}（${ATTRIBUTE_META.ninja.label}・BP${cpuNinja.currentBp}）`;
  return `${playerLabel}と${cpuLabel}は互いにステルスを解除した`;
}

/** 双方行動不能かつ前衛ステルス忍びがいる膠着（ATTRIBUTE_SPEC §4.10） */
export function isNinjaStealthStalemate(state: BattleState): boolean {
  if (
    hasBattleActionChoices(state, 'player') ||
    hasBattleActionChoices(state, 'cpu')
  ) {
    return false;
  }
  const playerNinjas = getFrontStealthedNinjas(state.player);
  const cpuNinjas = getFrontStealthedNinjas(state.cpu);
  return playerNinjas.length > 0 && cpuNinjas.length > 0;
}

export interface ResolveNinjaStealthStalemateResult {
  state: BattleState;
  logLine: string;
}

/** 互いにステルス解除してターンを終了（戦闘・癒・盾は行わない） */
export function resolveNinjaStealthStalemate(
  state: BattleState,
): ResolveNinjaStealthStalemateResult {
  const playerPrimary = pickPrimaryNinja(state.player);
  const cpuPrimary = pickPrimaryNinja(state.cpu);
  if (!playerPrimary || !cpuPrimary) {
    throw new Error('resolveNinjaStealthStalemate: stalemate condition not met');
  }

  const next = cloneBattleState(state);
  const displayTurn = getDisplayTurn(state);

  for (const field of [next.player, next.cpu]) {
    for (const unit of getFrontStealthedNinjas(field)) {
      onExternalEffectToUnit(unit);
    }
  }

  const logLine = formatStealthMutualBreakLogLine(playerPrimary, cpuPrimary);
  let resolved = appendLog(next, logLine);
  resolved = pushBattleEvent(resolved, {
    type: 'stealth_mutual_break',
    turn: displayTurn,
    actor: unitSnapshot(playerPrimary, playerPrimary.currentBp),
    target: unitSnapshot(cpuPrimary, cpuPrimary.currentBp),
  });
  resolved = { ...resolved, turn: state.turn + 1 };

  return { state: resolved, logLine };
}
