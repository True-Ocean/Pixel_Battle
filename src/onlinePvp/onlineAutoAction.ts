import type { BattleActionChoice, BattleSide, BattleState, BoardPosition } from '../types/battle';
import {
  enumerateBattleActionChoices,
  pickPassAction,
} from '../game/actionChoices';
import {
  getPendingPromotionFronts,
  getPromotableBackPositions,
} from '../game/battleState';

function pickRandom<T>(items: readonly T[], random: () => number): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(random() * items.length)];
}

/** タイムアウト時の自動行動（有効行動からランダム） */
export function pickRandomOnlineAction(
  state: BattleState,
  side: BattleSide,
  random: () => number = Math.random,
): BattleActionChoice {
  const candidates = enumerateBattleActionChoices(state, side);
  return pickRandom(candidates, random) ?? pickPassAction(state, side);
}

/** タイムアウト時の自動昇格（候補からランダム） */
export function pickRandomOnlinePromotion(
  state: BattleState,
  side: BattleSide,
  random: () => number = Math.random,
): { from: BoardPosition; to: BoardPosition } | null {
  const field = side === 'player' ? state.player : state.cpu;
  const fronts = getPendingPromotionFronts(field);
  const to = pickRandom(fronts, random);
  if (!to) return null;
  const from = pickRandom(getPromotableBackPositions(field, to), random);
  return from ? { from, to } : null;
}
