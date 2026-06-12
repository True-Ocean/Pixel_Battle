import type { BattleActionChoice, BattleState } from '../types/battle';
import {
  enumerateBattleActionChoices,
  pickPassAction,
} from './actionChoices';
import {
  getAliveIndices,
  getPendingPromotionFronts,
  getPromotableBackPositions,
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
  const candidates = enumerateBattleActionChoices(state, 'cpu');
  return pickRandom(candidates, random) ?? pickPassAction(state, 'cpu');
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
