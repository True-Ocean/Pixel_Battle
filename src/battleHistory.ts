import type { BattleHistoryEntry, BattleOutcome, Card } from './types';
import { createId } from './utils/createId';

export const BATTLE_HISTORY_MAX = 20;
/** 履歴・対戦画面で表示する CPU 相手名（プロトタイプは CPU 戦のみ） */
export const CPU_OPPONENT_LABEL = 'CPU';

function cloneCards(cards: Card[]): Card[] {
  return structuredClone(cards);
}

export interface BattleHistoryPlayerSnapshot {
  playerDeck: Card[];
  playerLevel: number;
}

export function createBattleHistoryEntry(
  outcome: BattleOutcome,
  playerSnapshot: BattleHistoryPlayerSnapshot,
): BattleHistoryEntry {
  return {
    id: createId(),
    playedAt: new Date().toISOString(),
    winner: outcome.winner,
    opponentName: outcome.opponent.name,
    opponentLevel: outcome.opponent.level,
    opponentDeckPower: outcome.opponentDeckPower,
    playerDeckPower: outcome.playerDeckPower,
    opponentDeck: cloneCards(outcome.opponent.deck),
    playerDeck: cloneCards(playerSnapshot.playerDeck),
    playerLevel: playerSnapshot.playerLevel,
  };
}

export function appendBattleHistory(
  history: BattleHistoryEntry[],
  entry: BattleHistoryEntry,
): BattleHistoryEntry[] {
  return [entry, ...history].slice(0, BATTLE_HISTORY_MAX);
}

export function formatBattleHistoryWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
