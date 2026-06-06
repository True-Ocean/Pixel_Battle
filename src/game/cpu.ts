import type { BattleActionChoice, BattleState, BoardPosition } from '../types/battle';
import {
  FRONT_POSITIONS,
  getActionTypesForUnit,
  getAliveIndices,
  getMeleeTargets,
  getPendingPromotionFronts,
  getPromotableBackPositions,
  getShieldTargetsForActor,
  isAlive,
} from './battleState';
import { promoteUnit } from './resolveTurn';

/** @deprecated 旧3枚制互換。新仕様では pickCpuAction を使う。 */
export function pickCpuMainIndex(
  state: BattleState,
  random = Math.random,
): number {
  const aliveCpu = getAliveIndices(state.cpu);
  if (aliveCpu.length === 1) return aliveCpu[0];
  return aliveCpu[Math.floor(random() * aliveCpu.length)] ?? 0;
}

function pickRandom<T>(items: readonly T[], random: () => number): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(random() * items.length)];
}

export function pickCpuAction(
  state: BattleState,
  random = Math.random,
): BattleActionChoice {
  const candidates: BattleActionChoice[] = [];

  for (const unit of state.cpu) {
    if (!isAlive(unit) || unit.position === 'defeated') continue;
    const position = unit.position;
    const actions = getActionTypesForUnit(state.cpu, state.player, position);
    if (actions.includes('meleeAttack')) {
      for (const target of getMeleeTargets(state.player)) {
        candidates.push({
          type: 'meleeAttack',
          actorPosition: position,
          targetPosition: target,
        });
      }
    }
    if (actions.includes('grantShield')) {
      for (const target of getShieldTargetsForActor(state.cpu, position)) {
        candidates.push({
          type: 'grantShield',
          actorPosition: position,
          targetPosition: target,
        });
      }
    }
  }

  const picked = pickRandom(candidates, random);
  if (picked) return picked;

  const fallbackActor = FRONT_POSITIONS.find((p) =>
    state.cpu.some((u) => u.position === p && isAlive(u)),
  );
  const fallbackTarget = FRONT_POSITIONS.find((p) =>
    state.player.some((u) => u.position === p && isAlive(u)),
  );
  return {
    type: 'meleeAttack',
    actorPosition: fallbackActor ?? 'frontLeft',
    targetPosition: fallbackTarget ?? 'frontLeft',
  };
}

export function autoPromoteCpu(
  state: BattleState,
  random = Math.random,
): BattleState {
  let next = state;
  let fronts = getPendingPromotionFronts(next.cpu);
  while (fronts.length > 0) {
    const front = pickRandom(fronts, random);
    if (!front) break;
    const backs = getPromotableBackPositions(next.cpu, front);
    const back = pickRandom(backs, random);
    if (!back) break;
    next = promoteUnit(next, 'cpu', back, front);
    fronts = getPendingPromotionFronts(next.cpu);
  }
  return next;
}

export function pickCpuPromotion(
  state: BattleState,
  random = Math.random,
): { from: BoardPosition; to: BoardPosition } | null {
  const fronts = getPendingPromotionFronts(state.cpu);
  const to = pickRandom(fronts, random);
  if (!to) return null;
  const from = pickRandom(getPromotableBackPositions(state.cpu, to), random);
  return from ? { from, to } : null;
}
