import type { Card } from '../types';
import type {
  BattleResult,
  BattleSide,
  BattleState,
  BattleUnit,
  BoardPosition,
} from '../types/battle';
import { createExtendedBattleUnitState } from './battleUnitState';
import { getActionTypesForUnit } from './actions/getActionTypesForUnit';
import { isMeleeTargetable, shouldStartInStealth } from './ninjaCombat';

export { getActionTypesForUnit };
export { getBowTargets, calcBowDamage, isBowTargetable } from './bowCombat';
export { getDualTargets } from './dualCombat';

export const BOARD_POSITIONS = [
  'frontLeft',
  'frontRight',
  'backLeft',
  'backCenter',
  'backRight',
] as const satisfies readonly BoardPosition[];

export const FRONT_POSITIONS = [
  'frontLeft',
  'frontRight',
] as const satisfies readonly BoardPosition[];

export const BACK_POSITIONS = [
  'backLeft',
  'backCenter',
  'backRight',
] as const satisfies readonly BoardPosition[];

export function cardToBattleUnit(
  card: Card,
  position: BoardPosition = 'frontLeft',
): BattleUnit {
  const extended = createExtendedBattleUnitState(card);
  return {
    cardId: card.id,
    name: card.name,
    attribute: card.attribute,
    maxBp: card.bp,
    currentBp: card.bp,
    position,
    ...extended,
    stealthActive: shouldStartInStealth(card.attribute),
  };
}

export function createBattleState(playerCards: Card[], cpuCards: Card[]): BattleState {
  return {
    player: playerCards.map((card, i) =>
      cardToBattleUnit(card, BOARD_POSITIONS[i] ?? 'backRight'),
    ),
    cpu: cpuCards.map((card, i) =>
      cardToBattleUnit(card, BOARD_POSITIONS[i] ?? 'backRight'),
    ),
    turn: 0,
    log: ['戦闘開始'],
    events: [],
  };
}

export function isAlive(unit: BattleUnit): boolean {
  return unit.currentBp > 0 && unit.position !== 'defeated';
}

/** 防御カードとして、まだ盾付与能力を使えるか */
export function canGrantDefenseShields(unit: BattleUnit): boolean {
  return (
    unit.attribute === 'defense' && isAlive(unit) && !unit.defenseShieldUsed
  );
}

export function isFrontPosition(position: BoardPosition): boolean {
  return (FRONT_POSITIONS as readonly BoardPosition[]).includes(position);
}

export function isBackPosition(position: BoardPosition): boolean {
  return (BACK_POSITIONS as readonly BoardPosition[]).includes(position);
}

export function getAliveIndices(field: BattleUnit[]): number[] {
  return field.map((u, i) => (isAlive(u) ? i : -1)).filter((i) => i >= 0);
}

export function getUnitAt(
  field: BattleUnit[],
  position: BoardPosition,
): BattleUnit | undefined {
  return field.find((u) => u.position === position && isAlive(u));
}

export function getUnitIndexAt(
  field: BattleUnit[],
  position: BoardPosition,
): number {
  return field.findIndex((u) => u.position === position && isAlive(u));
}

export function getDefeated(field: BattleUnit[]): BattleUnit[] {
  return field.filter((u) => u.position === 'defeated');
}

export function getField(state: BattleState, side: BattleSide): BattleUnit[] {
  return side === 'player' ? state.player : state.cpu;
}

export function getBattleResult(state: BattleState): BattleResult {
  const playerAlive = state.player.some(isAlive);
  const cpuAlive = state.cpu.some(isAlive);
  if (!cpuAlive && playerAlive) return 'player';
  if (!playerAlive && cpuAlive) return 'cpu';
  if (!playerAlive && !cpuAlive) return 'cpu';
  return null;
}

export function appendLog(state: BattleState, line: string): BattleState {
  return { ...state, log: [...state.log, line] };
}

export function getShieldTargets(field: BattleUnit[]): BoardPosition[] {
  return field
    .filter((u) => isAlive(u) && !u.hasShield)
    .map((u) => u.position)
    .filter((p): p is BoardPosition => p !== 'defeated');
}

/** 盾付与の対象（盾なし味方。自分も含むが、自分が盾所持中は対象外） */
export function getShieldTargetsForActor(
  field: BattleUnit[],
  _actorPosition: BoardPosition,
): BoardPosition[] {
  return getShieldTargets(field);
}

export function canUseShieldAction(
  field: BattleUnit[],
  position: BoardPosition,
): boolean {
  const unit = getUnitAt(field, position);
  return (
    !!unit &&
    canGrantDefenseShields(unit) &&
    getShieldTargetsForActor(field, position).length > 0
  );
}

export function getMeleeTargets(enemyField: BattleUnit[]): BoardPosition[] {
  return FRONT_POSITIONS.filter((position) => {
    const target = getUnitAt(enemyField, position);
    return target != null && isMeleeTargetable(target);
  });
}

export function getPromotableBackPositions(
  field: BattleUnit[],
  frontPosition: BoardPosition,
): BoardPosition[] {
  const candidates =
    frontPosition === 'frontLeft'
      ? (['backLeft', 'backCenter'] as const)
      : frontPosition === 'frontRight'
        ? (['backCenter', 'backRight'] as const)
        : ([] as const);
  return candidates.filter((position) => !!getUnitAt(field, position));
}

export function getEmptyFrontPositions(field: BattleUnit[]): BoardPosition[] {
  return FRONT_POSITIONS.filter((position) => !getUnitAt(field, position));
}

export function getPendingPromotionFronts(field: BattleUnit[]): BoardPosition[] {
  return getEmptyFrontPositions(field).filter(
    (position) => getPromotableBackPositions(field, position).length > 0,
  );
}
