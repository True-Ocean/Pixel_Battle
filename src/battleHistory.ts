import type { BattleHistoryEntry, BattleOutcome, Card } from './types';

export const BATTLE_HISTORY_MAX = 20;

function cloneCards(cards: Card[]): Card[] {
  return structuredClone(cards);
}

export function createBattleHistoryEntry(outcome: BattleOutcome): BattleHistoryEntry {
  return {
    id: crypto.randomUUID(),
    playedAt: new Date().toISOString(),
    winner: outcome.winner,
    opponentName: outcome.opponent.name,
    opponentLevel: outcome.opponent.level,
    opponentDeckPower: outcome.opponentDeckPower,
    playerDeckPower: outcome.playerDeckPower,
    opponentDeck: cloneCards(outcome.opponent.deck),
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
