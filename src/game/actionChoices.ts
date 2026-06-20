import type {
  BattleActionChoice,
  BattleSide,
  BattleState,
  BoardPosition,
} from '../types/battle';
import { getBowTargets } from './bowCombat';
import { getDualTargets } from './dualCombat';
import { getHealTargets } from './healCombat';
import { getSelectionTurn } from './iceCombat';
import {
  FRONT_POSITIONS,
  getActionTypesForUnit,
  getMeleeTargets,
  getShieldTargetsForActor,
  isAlive,
} from './battleState';

export function enumerateBattleActionChoices(
  state: BattleState,
  side: BattleSide,
): BattleActionChoice[] {
  const ownField = side === 'player' ? state.player : state.cpu;
  const enemyField = side === 'player' ? state.cpu : state.player;
  const candidates: BattleActionChoice[] = [];
  const selectionTurn = getSelectionTurn(state);

  for (const unit of ownField) {
    if (!isAlive(unit) || unit.position === 'defeated') continue;
    const position = unit.position;
    const actions = getActionTypesForUnit(
      ownField,
      enemyField,
      position,
      selectionTurn,
    );
    if (actions.includes('bowAttack')) {
      for (const target of getBowTargets(ownField, enemyField, position)) {
        candidates.push({
          type: 'bowAttack',
          actorPosition: position,
          targetPosition: target,
        });
      }
    }
    if (actions.includes('dualAttack')) {
      for (const target of getDualTargets(enemyField)) {
        candidates.push({
          type: 'dualAttack',
          actorPosition: position,
          targetPosition: target,
        });
      }
    }
    if (actions.includes('meleeAttack')) {
      for (const target of getMeleeTargets(enemyField)) {
        candidates.push({
          type: 'meleeAttack',
          actorPosition: position,
          targetPosition: target,
        });
      }
    }
    if (actions.includes('grantShield')) {
      for (const target of getShieldTargetsForActor(ownField, position)) {
        candidates.push({
          type: 'grantShield',
          actorPosition: position,
          targetPosition: target,
        });
      }
    }
    if (actions.includes('heal')) {
      for (const target of getHealTargets(ownField, position, selectionTurn)) {
        candidates.push({
          type: 'heal',
          actorPosition: position,
          targetPosition: target,
        });
      }
    }
    if (actions.includes('storm')) {
      candidates.push({
        type: 'storm',
        actorPosition: position,
        targetPosition: position,
      });
    }
  }

  return candidates;
}

export function hasBattleActionChoices(
  state: BattleState,
  side: BattleSide,
): boolean {
  return enumerateBattleActionChoices(state, side).length > 0;
}

/** 行動不能時のダミー選択（解決フェーズでは無効化される） */
export function pickPassAction(
  state: BattleState,
  side: BattleSide,
): BattleActionChoice {
  const ownField = side === 'player' ? state.player : state.cpu;
  const enemyField = side === 'player' ? state.cpu : state.player;
  const fallbackActor = findAlivePosition(ownField, FRONT_POSITIONS);
  const fallbackTarget = findAlivePosition(enemyField, FRONT_POSITIONS);
  return {
    type: 'meleeAttack',
    actorPosition: fallbackActor ?? 'frontLeft',
    targetPosition: fallbackTarget ?? 'frontLeft',
  };
}

function findAlivePosition(
  field: BattleState['player'],
  positions: readonly BoardPosition[],
): BoardPosition | undefined {
  return positions.find((position) =>
    field.some((unit) => unit.position === position && isAlive(unit)),
  );
}
